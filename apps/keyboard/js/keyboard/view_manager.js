'use strict';

/* global AlternativesCharMenuView, LayoutPageView, SwipeablePageView */

/** @fileoverview ViewManager is in charge of rendering HTML elements
 * under the request of LayoutRenderingManager.
 */
(function(exports) {

function ViewManager(app) {
  this.app = app;

  this.viewMap = new WeakMap();

  this.currentPageView = null;
  this.pageViews = new Map();

  this.alternativesCharMenu = null;

  // How many keys in a row
  this.columnCount = 10;
}

ViewManager.prototype = {
  get candidatePanel() {
    if (!this.currentPageView ||
        !this.currentPageView.candidatePanel) {
      return;
    }

    return this.currentPageView.candidatePanel.element;
  }
};

ViewManager.prototype.start = function() {
  this.container = document.getElementById('keyboard');
  this.cachedWindowHeight = window.innerHeight;
  this.cachedWindowWidth = window.innerWidth;

  window.addEventListener('resize', this);
};

ViewManager.prototype.stop = function() {
  this.container = null;
  this.viewMap = null;

  this.currentPageView = null;
  this.pageViews = null;

  window.removeEventListener('resize', this);
};

ViewManager.prototype.handleEvent = function(evt) {
  if (evt.type !== 'resize') {
    return;
  }

  // Resize event, cache the window height/width to minize the reflow.
  this.cachedWindowHeight = window.innerHeight;
  this.cachedWindowWidth = window.innerWidth;
};

// Accepts a state object with two properties.
//   Set isUpperCaseLocked to true if locked
//   Set isUpperCase to true when uppercase is enabled
//   Use false on both of these properties when uppercase is disabled
ViewManager.prototype.setUpperCaseLock = function(state) {
  if (!this.currentPageView) {
    console.error('No current page view!');
    return;
  }

  this.currentPageView.setUpperCaseLock(state);
};

// Render the keyboard and its components. Meat is here.
ViewManager.prototype.render = function (layout, flags, callback) {
  flags = flags || {};

  this.columnCount = layout.width || 10;
  var supportsSwitching = 'mozInputMethod' in navigator ?
    navigator.mozInputMethod.mgmt.supportsSwitching() : false;
  var pageId = [
    layout.layoutName,
    layout.pageIndex,
    ('' + flags.inputType).substr(0, 1),
    ('' + flags.showCandidatePanel).substr(0, 1),
    supportsSwitching
  ].join('-');

  var pageView = this.pageViews.get(pageId);

  // let's see if we have this keyboard somewhere already...
  if (!pageView) {
    var options = {
      classNames: ['keyboard-type-container'],
      // TODO: Still need to pass totalWidth to LayoutPageView for
      // LatinCandidatePanel, need to get rid of this if possible.
      totalWidth: this.container.clientWidth,
      showCandidatePanel: flags.showCandidatePanel
    };

    pageView = this._createPageView(layout, options);
    this.pageViews.set(pageId, pageView);

    pageView.render();
    this.container.appendChild(pageView.element);

    if (flags.showCandidatePanel) {
      this.showCandidates([]);
    }
  }

  // Make sure the container is switched to the current uppercase state.
  pageView.setUpperCaseLock({
    isUpperCase: flags.uppercase,
    isUpperCaseLocked: false
  });

  // The page view has been switched
  if (this.currentPageView !== pageView) {
    if (this.currentPageView) {
      this.currentPageView.hide();
    }
    pageView.show();

    this.currentPageView = pageView;

    // Only resize UI if layout changed
    this.resize(callback);
  } else if ((this.container.classList.contains('landscape') &&
              this.screenInPortraitMode()) ||
             (this.container.classList.contains('portrait') &&
              !this.screenInPortraitMode())) {
        // screen orientation changed since last time, need to resize UI
        this.resize(callback);
      }
  else { // activeIME is already correct
    if (callback) {
      // The callback might be blocking, so we want to process
      // on next tick.
      window.requestAnimationFrame(callback);
    }
  }
};

ViewManager.prototype.drawHandwritingPad = function(press,
                                                    start,
                                                    strokeWidth) {
  var handwritingPadView = this.viewMap.get(press.target);
  return handwritingPadView.drawHandwritingPad(press, start, strokeWidth);
};

ViewManager.prototype.clearHandwritingPad = function(target) {
  var handwritingPadView = this.viewMap.get(target);
  return handwritingPadView.clearHandwritingPad();
};

// Highlight the key according to the case.
ViewManager.prototype.highlightKey = function(target) {
  if (!this.currentPageView) {
    console.error('No current page view!');
    return;
  }

  this.currentPageView.highlightKey(target);
};

// Unhighlight a key
ViewManager.prototype.unHighlightKey = function(target) {
  if (!this.currentPageView) {
    console.error('ViewManager: No current page view!');
    return;
  }

  this.currentPageView.unHighlightKey(target);
};

ViewManager.prototype.toggleCandidatePanel = function(expand) {
  if (!this.currentPageView) {
     console.error('ViewManager: No current page view!');
     return;
  }

  this.currentPageView.resetCandidatePanel();
  this._toggleCandidatePanelWithoutResetScroll(expand);
};

ViewManager.prototype._toggleCandidatePanelWithoutResetScroll =
function(expand) {
  if (expand) {
    this.container.classList.remove('candidate-panel');
    this.container.classList.add('full-candidate-panel');
  } else {
    this.container.classList.remove('full-candidate-panel');
    this.container.classList.add('candidate-panel');
  }
};

// Show char alternatives.
ViewManager.prototype.showAlternativesCharMenu = function(key, altChars) {
  var options = {
    keyWidth: (this.cachedWindowWidth / this.columnCount) | 0,
    screenInPortraitMode: this.screenInPortraitMode
  };

  var alternativesCharMenu = new AlternativesCharMenuView(
      this.currentPageView.element,
      altChars,
      options,
      this);

  var keyElement = this.viewMap.get(key).element;
  alternativesCharMenu.show(keyElement);

  this.alternativesCharMenu = alternativesCharMenu;
  return alternativesCharMenu;
};

// Hide the alternative menu
ViewManager.prototype.hideAlternativesCharMenu = function() {
  if (!this.alternativesCharMenu) {
    console.error('No alternative char menu to hide!');
    return;
  }

  this.alternativesCharMenu.hide();
};

ViewManager.prototype.resize = function(callback) {
  // This function consists of two main tasks
  // 1. resize the current page view, now it would be needed to resize the
  //    handwriting pad.
  // 2. getVisualData (stores visual offsets in internal array)
  var changeScale;
  // Font size recalc
  if (this.screenInPortraitMode()) {
    changeScale = this.cachedWindowWidth / 32;
    document.documentElement.style.fontSize = changeScale + 'px';
    this.container.classList.remove('landscape');
    this.container.classList.add('portrait');
  } else {
    changeScale = this.cachedWindowWidth / 64;
    document.documentElement.style.fontSize = changeScale + 'px';
    this.container.classList.remove('portrait');
    this.container.classList.add('landscape');
  }

  // Width calc
  if (!this.currentPageView) {
    return;
  }

  // Hack alert! we always use 100% of width so we avoid calling
  // keyboard.clientWidth because that causes a costy reflow...
  this.currentPageView.resize(this.cachedWindowWidth);

  if (callback) {
    window.requestAnimationFrame(callback);
  }
};

ViewManager.prototype.getWidth = function() {
  if (!this.currentPageView) {
    return 0;
  }

  return this.cachedWindowWidth;
};

ViewManager.prototype.getHeight = function() {
  if (!this.currentPageView) {
    return 0;
  }

  return this.currentPageView.getHeight() | 0;
};

ViewManager.prototype.showCandidates = function(candidates) {
  if (!this.currentPageView) {
    return;
  }

  this._toggleCandidatePanelWithoutResetScroll(false);
  this.currentPageView.showCandidates(candidates);
};

ViewManager.prototype.showMoreCandidates = function(rowLimit, candidates) {
  if (!this.currentPageView) {
    return;
  }

  this.currentPageView.showMoreCandidates(rowLimit, candidates);
};

ViewManager.prototype.getNumberOfCandidatesPerRow = function() {
  if (!this.currentPageView) {
    return;
  }

  return this.currentPageView.getNumberOfCandidatesPerRow();
};

// Key metrics info for calculating proximity info for predictive text
ViewManager.prototype.getKeyArray = function() {
  return this.currentPageView.getVisualData();
};

ViewManager.prototype.getKeyWidth = function() {
  return Math.ceil(this.cachedWindowWidth / this.columnCount);
};

ViewManager.prototype.getKeyHeight = function() {
  if (!this.currentPageView) {
    return 0;
  }

  var row = this.currentPageView.element.querySelector('.keyboard-row');
  return row.clientHeight;
};

// Register target -> View mapping
ViewManager.prototype.registerView = function(target, view) {
  this.app.layoutRenderingManager.domObjectMap.set(view.element, target);
  this.viewMap.set(target, view);
};

ViewManager.prototype.screenInPortraitMode = function() {
  return this.cachedWindowWidth <= this.cachedWindowHeight;
};

ViewManager.prototype.getView = function (target) {
  return this.viewMap.get(target);
};

ViewManager.prototype._createPageView = function (layout, options) {
  var pageView;

  if (layout.panelKeys) {
    pageView = new SwipeablePageView(layout, options, this);
  } else {
    pageView = new LayoutPageView(layout, options, this);
  }

  return pageView;
};

exports.ViewManager = ViewManager;

})(window);
