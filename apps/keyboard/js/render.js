/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global AlternativesCharMenuView, LayoutPageView */

'use strict';

/** @fileoverview Render is in charge of draw and composite HTML elements
 * under requestion of the IMEController. IMERender is able to read from the
 * layout to improve its performance but is not allowed to communicate with
 * the controller nor manager.
 */
// XXX: The only thing worth to be remebered is the KEY element must be the
// deepest interactive HTML element on the hierarchy or, if none, simply the
// deepest element. This element must be mapped in LayoutRenderingManager's
// _domObjectMap in order to retrieve the key object defined and normalized in
// layouts and to access its attributes.
var IMERender = (function() {

  var ime, activeIme;
  var alternativesCharMenu = null;
  var _menuKey = null;
  var renderingManager = null;
  var viewMap = null;

  // a WeakMap to map target key object onto the DOM element it's associated
  // with; essentially the revrse mapping of |renderingManager._domObjectMap|.
  // ideally this should only be accessed by this renderer and alt_char_menu's
  // view.
  var layoutWidth = 10;

  var cachedWindowHeight = -1;
  var cachedWindowWidth = -1;
  var pageViews = null;
  var currentPageView = null;

  window.addEventListener('resize', function kr_onresize() {
    cachedWindowHeight = window.innerHeight;
    cachedWindowWidth = window.innerWidth;
  });

  // Initialize the render. It needs some business logic to determine:
  //   1- The uppercase for a key object
  //   2- When a key is a special key
  var init = function kr_init(layoutRenderingManager) {
    ime = document.getElementById('keyboard');

    renderingManager = layoutRenderingManager;

    cachedWindowHeight = window.innerHeight;
    cachedWindowWidth = window.innerWidth;

    viewMap = new WeakMap();
    pageViews = new Map();
  };

  // Accepts a state object with two properties.
  //   Set isUpperCaseLocked to true if locked
  //   Set isUpperCase to true when uppercase is enabled
  //   Use false on both of these properties when uppercase is disabled
  var setUpperCaseLock = function kr_setUpperCaseLock(state) {
    if (!currentPageView) {
      console.error('No current page view!');
      return;
    }

    currentPageView.setUpperCaseLock(state);
  };

  // Draw the keyboard and its components. Meat is here.
  var draw = function kr_draw(layout, flags, callback) {
    flags = flags || {};

    var supportsSwitching = 'mozInputMethod' in navigator ?
      navigator.mozInputMethod.mgmt.supportsSwitching() : false;
    var pageId = [
      layout.layoutName,
      layout.pageIndex,
      ('' + flags.inputType).substr(0, 1),
      ('' + flags.showCandidatePanel).substr(0, 1),
      supportsSwitching
    ].join('-');

    var pageView = pageViews.get(pageId);
    var container = null;
    // lets see if we have this keyboard somewhere already...
    if (pageView) {
      container = pageView.element;
    } else {
      var options = {
        classNames: ['keyboard-type-container'],
        // TODO: Still need to pass totalWidth to LayoutPageView for
        // HandwritingPadView, need to get rid of this if possible.
        totalWidth: ime.clientWidth,
        showCandidatePanel: flags.showCandidatePanel
      };

      pageView = new LayoutPageView(layout, options, IMERender);
      pageViews.set(pageId, pageView);

      pageView.render();
      ime.appendChild(pageView.element);

      container = pageView.element;

      if (flags.showCandidatePanel) {
        showCandidates([]);

        container.classList.add('candidate-panel');
      } else {
        container.classList.remove('candidate-panel');
      }
    }

    // Make sure the container is switched to the current uppercase state.
    pageView.setUpperCaseLock({
      isUpperCase: flags.uppercase,
      isUpperCaseLocked: false
    });

    // The page view has been switched
    if (currentPageView !== pageView) {
      if (currentPageView) {
        currentPageView.hide();
      }
      pageView.show();

      currentPageView = pageView;
      activeIme = container;

      // Only resize UI if layout changed
      resizeUI(layout, callback);
    }
    else if ((ime.classList.contains('landscape') && screenInPortraitMode()) ||
             (ime.classList.contains('portrait') && !screenInPortraitMode())) {
      // screen orientation changed since last time, need to resize UI
      resizeUI(layout, callback);
    }
    else { // activeIME is already correct
      if (callback) {
        // The callback might be blocking, so we want to process
        // on next tick.
        window.requestAnimationFrame(callback);
      }
    }
  };

  var drawHandwritingPad = function kr_drawHandwritingPad(press,
                                                          start,
                                                          strokeWidth) {
    var handwritingPadView = viewMap.get(press.target);
    return handwritingPadView.drawHandwritingPad(press, start, strokeWidth);
  };

  var clearHandwritingPad = function kr_clearHandwritingPad(target) {
    var handwritingPadView = viewMap.get(target);
    return handwritingPadView.clearHandwritingPad();
  };

  // Highlight the key according to the case.
  var highlightKey = function kr_updateKeyHighlight(target) {
    if (!currentPageView) {
      console.error('No current page view!');
      return;
    }

    currentPageView.highlightKey(target);
  };

  // Unhighlight a key
  var unHighlightKey = function kr_unHighlightKey(target) {
    if (!currentPageView) {
      console.error('No current page view!');
      return;
    }

    currentPageView.unHighlightKey(target);
  };

  var toggleCandidatePanel = function(expand) {
    if (!currentPageView) {
      console.error('No current page view!');
      return;
    }

    currentPageView.resetCandidatePanel();
    toggleCandidatePanelWithoutResetScroll(expand);
  };

  var toggleCandidatePanelWithoutResetScroll = function(expand) {
    if (expand) {
      ime.classList.remove('candidate-panel');
      ime.classList.add('full-candidate-panel');
    } else {
      ime.classList.remove('full-candidate-panel');
      ime.classList.add('candidate-panel');
    }
  };

  // Show char alternatives.
  var showAlternativesCharMenu = function(key, altChars) {
    var options = {
      keyWidth: (cachedWindowWidth / layoutWidth) | 0,
      screenInPortraitMode: screenInPortraitMode
    };

    alternativesCharMenu = new AlternativesCharMenuView(activeIme,
                                                        altChars,
                                                        options,
                                                        IMERender);
    var keyElement = viewMap.get(key).element;
    alternativesCharMenu.show(keyElement);
    _menuKey = key;

    return alternativesCharMenu;
  };

  // Hide the alternative menu
  var hideAlternativesCharMenu = function km_hideAlternativesCharMenu() {
    alternativesCharMenu.hide();
  };

  var _keyArray = []; // To calculate proximity info for predictive text

  // Recalculate dimensions for the current render
  var resizeUI = function(layout, callback) {
    // This function consists of two main tasks
    // 1. resize the current page view, now it would be needed to resize the
    //    handwriting pad.
    // 2. getVisualData (stores visual offsets in internal array)
    var changeScale;
    // Font size recalc
    if (screenInPortraitMode()) {
      changeScale = cachedWindowWidth / 32;
      document.documentElement.style.fontSize = changeScale + 'px';
      ime.classList.remove('landscape');
      ime.classList.add('portrait');
    } else {
      changeScale = cachedWindowWidth / 64;
      document.documentElement.style.fontSize = changeScale + 'px';
      ime.classList.remove('portrait');
      ime.classList.add('landscape');
    }

    // Width calc
    if (!layout || !activeIme) {
      return;
    }

    // Hack alert! we always use 100% of width so we avoid calling
    // keyboard.clientWidth because that causes a costy reflow...
    currentPageView.resize(cachedWindowWidth);

    window.requestAnimationFrame(function() {
      _keyArray = currentPageView.getVisualData();
      if (callback) {
        callback();
      }
    });
  };

  //
  // Private Methods
  //
  var getWidth = function getWidth() {
    if (!activeIme)
      return 0;

    return cachedWindowWidth;
  };

  var getHeight = function getHeight() {
    if (!activeIme)
      return 0;

    var scale = screenInPortraitMode() ?
      cachedWindowWidth / 32 :
      cachedWindowWidth / 64;

    var height = (activeIme.querySelectorAll('.keyboard-row').length *
      (5.1 * scale));

    if (activeIme.classList.contains('candidate-panel')) {
      if (activeIme.querySelector('.keyboard-candidate-panel')
          .classList.contains('latin')) {
        height += (3.1 * scale);
      }
      else {
        height += (3.2 * scale);
      }
    }

    return height | 0;
  };

  var showCandidates = function showCandidates(candidates) {
    if (!currentPageView) {
      return;
    }

    toggleCandidatePanelWithoutResetScroll(false);
    currentPageView.showCandidates(candidates);
  };

  var showMoreCandidates = function(rowLimit, candidates) {
    if (!currentPageView) {
      return;
    }

    currentPageView.showMoreCandidates(rowLimit, candidates);
  };

  var getNumberOfCandidatesPerRow = function getNumberOfCandidatesPerRow() {
    if (!currentPageView) {
      return;
    }

    return currentPageView.getNumberOfCandidatesPerRow();
  };

  var getKeyArray = function getKeyArray() {
    return _keyArray;
  };

  var getKeyWidth = function getKeyWidth() {
    if (!activeIme)
      return 0;

    return Math.ceil(ime.clientWidth / layoutWidth);
  };

  var getKeyHeight = function getKeyHeight() {
    if (!activeIme)
      return 0;

    var rows = activeIme.querySelectorAll('.keyboard-row');
    var rowCount = rows.length || 3;

    var candidatePanel = activeIme.querySelector('.keyboard-candidate-panel');
    var candidatePanelHeight = candidatePanel ? candidatePanel.clientHeight : 0;

    return Math.ceil((ime.clientHeight - candidatePanelHeight) / rowCount);
  };

  // Register target -> View mapping
  var registerView = function registerView(target, view) {
    renderingManager.domObjectMap.set(view.element, target);
    viewMap.set(target, view);
  };

  var screenInPortraitMode = function() {
    return cachedWindowWidth <= cachedWindowHeight;
  };

  // Exposing pattern
  return {
    'init': init,
    'draw': draw,
    'drawHandwritingPad': drawHandwritingPad,
    'clearHandwritingPad': clearHandwritingPad,
    get ime() {
      return ime;
    },
    'highlightKey': highlightKey,
    'unHighlightKey': unHighlightKey,
    'showAlternativesCharMenu': showAlternativesCharMenu,
    'hideAlternativesCharMenu': hideAlternativesCharMenu,
    'setUpperCaseLock': setUpperCaseLock,
    'resizeUI': resizeUI,
    'showCandidates': showCandidates,
    'getWidth': getWidth,
    'getHeight': getHeight,
    'getKeyArray': getKeyArray,
    'getKeyWidth': getKeyWidth,
    'getKeyHeight': getKeyHeight,
    'showMoreCandidates': showMoreCandidates,
    'toggleCandidatePanel': toggleCandidatePanel,
    'getNumberOfCandidatesPerRow': getNumberOfCandidatesPerRow,
    'registerView': registerView,
    'getView': function getView(target) {
      return viewMap.get(target);
    },
    get activeIme() {
      return activeIme;
    },
    set activeIme(v) {
      activeIme = v;
    },
    get candidatePanel() {
      return activeIme && activeIme.querySelector('.keyboard-candidate-panel');
    },
    setCachedWindowSize: function(width, height) {
      cachedWindowWidth = width;
      cachedWindowHeight = height;
    }
  };
})();
