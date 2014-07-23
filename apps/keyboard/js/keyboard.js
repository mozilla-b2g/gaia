'use strict';

/* global app, IMERender */

// |app| is considered created and started at this point.
// It was intentionally exposed from bootstrap.js to allow lagency code access
// here. Eventually this file should be factor out and removed.

var isKeyboardRendered = false;

// Time we wait after blur to hide the keyboard
// in case we get a focus event right after
const HIDE_KEYBOARD_TIMEOUT = 500;

var hideKeyboardTimeout = 0;

app.upperCaseStateManager.onstatechange = handleUpperCaseStateChange;

// A MutationObserver we use to spy on the renderer module
var dimensionsObserver;

initKeyboard();

// We cannot listen to resize event right at start because of
// https://bugzil.la/1007595 ;
// only attach the event listener after 600ms.
setTimeout(function attachResizeListener() {
  app.perfTimer.printTime('attachResizeListener');
  // Handle resize events
  window.addEventListener('resize', onResize);
}, 2000);

function initKeyboard() {
  app.perfTimer.startTimer('initKeyboard');
  app.perfTimer.printTime('initKeyboard');

  // Initialize the rendering module
  IMERender.init();

  dimensionsObserver = new MutationObserver(function() {
    app.perfTimer.printTime('dimensionsObserver:callback');
    updateTargetWindowHeight();
  });

  // And observe mutation events on the renderer element
  dimensionsObserver.observe(IMERender.ime, {
    childList: true, // to detect changes in IMEngine
    attributes: true, attributeFilter: ['class', 'style']
  });

  window.addEventListener('hashchange', function() {
    app.perfTimer.printTime('hashchange');
    var layoutName = window.location.hash.substring(1);

    app.layoutManager.loader.getLayoutAsync(layoutName);
    updateCurrentLayout(layoutName);
  }, false);

  // Need to listen to both mozvisibilitychange and oninputcontextchange,
  // because we are not sure which will happen first and we will call
  // showKeyboard() when mozHidden is false and we got inputContext
  window.addEventListener('mozvisibilitychange', function visibilityHandler() {
    app.perfTimer.printTime('mozvisibilitychange');
    if (document.mozHidden && !app.inputContext) {
      hideKeyboard();

      return;
    }

    var layoutName = window.location.hash.substring(1);
    updateCurrentLayout(layoutName);
  });

  window.navigator.mozInputMethod.oninputcontextchange = function() {
    app.perfTimer.printTime('inputcontextchange');
    app.inputContext = navigator.mozInputMethod.inputcontext;
    if (document.mozHidden && !app.inputContext) {
      hideKeyboard();

      return;
    }

    var layoutName = window.location.hash.substring(1);
    updateCurrentLayout(layoutName);
  };

  // Initialize the current layout according to
  // the hash this page is loaded with.
  var layoutName = '';
  if (window.location.hash !== '') {
    layoutName = window.location.hash.substring(1);
    app.layoutManager.loader.getLayoutAsync(layoutName);
  } else {
    console.error('This page should never be loaded without an URL hash.');

    return;
  }

  app.inputContext = navigator.mozInputMethod.inputcontext;

  // Finally, if we are only loaded by keyboard manager when the user
  // have already focused, the keyboard should show right away.
  updateCurrentLayout(layoutName);

  app.perfTimer.printTime('BLOCKING initKeyboard', 'initKeyboard');
}

function deactivateInputMethod() {
  // Switching to default IMEngine makes the current IMEngine deactivate.
  // The currentIMEngine will be set and activates again in
  // showKeyboard() (specifically, switchIMEngine()).
  app.inputMethodManager.switchCurrentIMEngine('default');
}

function updateCurrentLayout(name) {
  app.perfTimer.printTime('updateCurrentLayout');

  // Make sure we are working in parallel,
  // since eventually IMEngine will be switched.
  // See showKeyboard()->switchIMEngine()
  if (!document.mozHidden) {
    app.inputMethodManager.updateInputContextData();
  }

  app.layoutManager.switchCurrentLayout(name).then(function() {
    app.perfTimer.printTime('updateCurrentLayout:promise resolved');

    // Ask the loader to start loading IMEngine
    var imEngineloader = app.inputMethodManager.loader;
    var imEngineName = app.layoutManager.currentLayout.imEngine;
    if (imEngineName && !imEngineloader.getInputMethod(imEngineName)) {
      imEngineloader.getInputMethodAsync(imEngineName);
    }

    // Now the that we have the layout ready,
    // we should either show or hide the keyboard.
    if (!document.mozHidden && app.inputContext) {
      showKeyboard();
    } else {
      hideKeyboard();

      // Load l10n library here, there is nothing more to do left
      // in the critical path.
      app.l10nLoader.load();
    }
  }, function(error) {
    console.warn('Failed to switch layout for ' + name + '.' +
      ' It might possible because we were called more than once.');
  });
}

// This function asks render.js to create an HTML layout for the keyboard.
// The layout is based on the layout in layout.js, but is augmented by
// modifyLayout() to include keyboard-switching keys and type-specific keys
// for url and email address input, e.g.
//
// This should be called when the keyboard changes or when the layout page
// changes in order to actually render the layout.
//
function renderKeyboard() {
  app.perfTimer.printTime('renderKeyboard');
  app.perfTimer.startTimer('renderKeyboard');

  IMERender.ime.classList.remove('full-candidate-panel');

  // Rule of thumb: always render uppercase, unless secondLayout has been
  // specified (for e.g. arabic, then depending on shift key)
  var needsUpperCase =
    app.layoutManager.currentModifiedLayout.secondLayout ?
      app.upperCaseStateManager.isUpperCase : true;

  // And draw the layout
  IMERender.draw(app.layoutManager.currentModifiedLayout, {
    uppercase: needsUpperCase,
    inputType: app.getBasicInputType(),
    showCandidatePanel: needsCandidatePanel()
  }, function() {
    app.perfTimer.printTime('IMERender.draw:callback');
    app.perfTimer.startTimer('IMERender.draw:callback');
    // So there are a couple of things that we want don't want to block
    // on here, so we can do it if resizeUI is fully finished
    IMERender.setUpperCaseLock(app.upperCaseStateManager);

    // Tell the input method about the new keyboard layout
    updateLayoutParams();

    app.candidatePanelManager.showCandidates();
    app.perfTimer.printTime(
      'BLOCKING IMERender.draw:callback', 'IMERender.draw:callback');
  });

  // Tell the renderer what input method we're using. This will set a CSS
  // classname that can be used to style the keyboards differently
  IMERender.setInputMethodName(
    app.layoutManager.currentModifiedLayout.imEngine || 'default');

  // If needed, empty the candidate panel
  if (app.inputMethodManager.currentIMEngine.empty) {
    app.inputMethodManager.currentIMEngine.empty();
  }

  isKeyboardRendered = true;

  app.perfTimer.printTime('BLOCKING renderKeyboard', 'renderKeyboard');
}

function handleUpperCaseStateChange() {
  if (!isKeyboardRendered) {
    return;
  }

  // When we have secondLayout, we need to force re-render on uppercase switch
  if (app.layoutManager.currentModifiedLayout.secondLayout) {
    return renderKeyboard();
  }

  // Otherwise we can just update only the keys we need...
  // Try to block the event loop as little as possible
  window.requestAnimationFrame(function() {
    app.perfTimer.startTimer('setUpperCase:requestAnimationFrame:callback');
    // And make sure the caps lock key is highlighted correctly
    IMERender.setUpperCaseLock(app.upperCaseStateManager);

    //restore the previous candidates
    app.candidatePanelManager.showCandidates();

    app.perfTimer.printTime(
      'BLOCKING setUpperCase:requestAnimationFrame:callback',
      'setUpperCase:requestAnimationFrame:callback');
  });
}

// Inform about a change in the displayed application via mutation observer
// http://hacks.mozilla.org/2012/05/dom-mutationobserver
function updateTargetWindowHeight(hide) {
  app.perfTimer.printTime('updateTargetWindowHeight');
  // height of the current active IME + 1px for the borderTop
  var imeHeight = IMERender.getHeight() + 1;
  var imeWidth = IMERender.getWidth();
  window.resizeTo(imeWidth, imeHeight);
}

function getKeyCoordinateY(y) {
  var candidatePanel = IMERender.candidatePanel;

  var yBias = 0;
  if (candidatePanel) {
    yBias = candidatePanel.clientHeight;
  }

  return y - yBias;
}

// Turn to default values
function resetKeyboard() {
  app.layoutManager.updateLayoutPage(
    app.layoutManager.LAYOUT_PAGE_DEFAULT);

  app.upperCaseStateManager.reset();
}

// Set up the keyboard and its input method.
// This is called when we get an event from mozInputMethod.
// The state argument is the data passed with that event, and includes
// the input field type, its inputmode, its content, and the cursor position.
function showKeyboard() {
  app.perfTimer.printTime('showKeyboard');
  clearTimeout(hideKeyboardTimeout);

  app.inputContext = navigator.mozInputMethod.inputcontext;

  resetKeyboard();

  if (!app.inputContext) {
    return;
  }

  // everything.me uses this setting to improve searches,
  // but they really shouldn't.
  app.settingsPromiseManager.set({
    'keyboard.current': app.layoutManager.currentLayoutName
  });

  // If we are already visible,
  // render the keyboard only after IMEngine is loaded.
  if (isKeyboardRendered) {
    switchIMEngine(true);

    return;
  }

  // render the keyboard right away w/o waiting for IMEngine
  // (it will be rendered again after imEngine is loaded)
  renderKeyboard();
  switchIMEngine(false);
}

// Hide keyboard
function hideKeyboard() {
  if (!isKeyboardRendered) {
    return;
  }

  deactivateInputMethod();

  clearTimeout(hideKeyboardTimeout);

  // For quick blur/focus events we don't want to hide the IME div
  // to avoid flickering and such

  hideKeyboardTimeout = setTimeout(function() {
    isKeyboardRendered = false;
  }, HIDE_KEYBOARD_TIMEOUT);

  // everything.me uses this setting to improve searches,
  // but they really shouldn't.
  app.settingsPromiseManager.set({
    'keyboard.current': undefined
  });

  app.targetHandlersManager.activeTargetsManager.clearAllTargets();
}

// Resize event handler
function onResize() {
  app.perfTimer.printTime('onResize');
  if (document.mozHidden) {
    return;
  }

  IMERender.resizeUI(app.layoutManager.currentModifiedLayout);
  updateTargetWindowHeight(); // this case is not captured by the mutation
  // observer so we handle it apart

  // TODO: need to check how to handle orientation change case to
  // show corrent word suggestions
  updateLayoutParams();
}

function switchIMEngine(mustRender) {
  app.perfTimer.printTime('switchIMEngine');

  var layout = app.layoutManager.currentModifiedLayout;
  var imEngineName = layout.imEngine || 'default';

  var p = app.inputMethodManager.switchCurrentIMEngine(imEngineName);
  p.then(function() {
    app.perfTimer.printTime('switchIMEngine:promise resolved');
    // Render keyboard again to get updated info from imEngine
    if (mustRender || imEngineName !== 'default') {
      renderKeyboard();
    }

    // Load l10n library after IMEngine is loaded (if it's not loaded yet).
    app.l10nLoader.load();
  }, function() {
    console.warn('Failed to switch imEngine for ' + layout.layoutName + '.' +
      ' It might possible because we were called more than once.');
  });
}

// If the input method cares about layout details, get those details
// from the renderer and pass them on to the input method. This is called
// from renderKeyboard() each time the keyboard layout changes.
// As an optimzation, however, we only send parameters if layoutPage is
// the default, since the input methods we support don't do anything special
// for symbols
function updateLayoutParams() {
  if (app.inputMethodManager.currentIMEngine.setLayoutParams &&
      app.layoutManager.currentLayoutPage ===
      app.layoutManager.LAYOUT_PAGE_DEFAULT) {
    app.inputMethodManager.currentIMEngine.setLayoutParams({
      keyboardWidth: IMERender.getWidth(),
      keyboardHeight: getKeyCoordinateY(IMERender.getHeight()),
      keyArray: IMERender.getKeyArray(),
      keyWidth: IMERender.getKeyWidth(),
      keyHeight: IMERender.getKeyHeight()
    });
  }
}

// To determine if the candidate panel for word suggestion is needed
function needsCandidatePanel() {
  // Disable the word suggestion for Greek SMS layout.
  // This is because the suggestion result is still unicode and
  // we would not convert the suggestion result to GSM 7-bit.
  if (isGreekSMS()) {
    return false;
  }

  return !!((app.layoutManager.currentLayout.autoCorrectLanguage ||
           app.layoutManager.currentLayout.needsCandidatePanel) &&
          (!app.inputMethodManager.currentIMEngine.displaysCandidates ||
            app.inputMethodManager.currentIMEngine.displaysCandidates()));
}

// To determine if we need to show a "all uppercase layout" for Greek SMS
function isGreekSMS() {
  return (app.inputContext.inputMode === '-moz-sms' &&
          app.layoutManager.currentLayoutName === 'el');
}
