'use strict';

/* global app */

// |app| is considered created and started at this point.
// It was intentionally exposed from bootstrap.js to allow lagency code access
// here. Eventually this file should be factor out and removed.

var isKeyboardRendered = false;

// Time we wait after blur to hide the keyboard
// in case we get a focus event right after
const HIDE_KEYBOARD_TIMEOUT = 500;

var hideKeyboardTimeout = 0;

initKeyboard();

function initKeyboard() {
  app.perfTimer.startTimer('initKeyboard');
  app.perfTimer.printTime('initKeyboard');

  window.addEventListener('hashchange', function handleHashchange() {
    app.perfTimer.printTime('hashchange');

    updateCurrentKeyboardState();
  }, false);

  // Need to listen to both mozvisibilitychange and oninputcontextchange,
  // because we are not sure which will happen first and we will call
  // showKeyboard() when document.hidden is false and we got inputContext
  window.addEventListener('visibilitychange', function visibilityHandler() {
    app.perfTimer.printTime('visibilitychange');
    updateCurrentKeyboardState();
  });

  window.navigator.mozInputMethod.oninputcontextchange = function() {
    app.perfTimer.printTime('inputcontextchange');
    app.inputContext = navigator.mozInputMethod.inputcontext;
    updateCurrentKeyboardState();
  };

  // Initialize the current layout according to
  // the hash this page is loaded with.
  if (!window.location.hash) {
    console.error('This page should never be loaded without an URL hash.');

    return;
  }

  app.inputContext = navigator.mozInputMethod.inputcontext;

  // Finally, if we are only loaded by keyboard manager when the user
  // have already focused, the keyboard should show right away.
  updateCurrentKeyboardState();

  app.perfTimer.printTime('BLOCKING initKeyboard', 'initKeyboard');
}

function updateCurrentKeyboardState() {
  app.perfTimer.printTime('updateCurrentKeyboardState');

  var layoutName = window.location.hash.substring(1);
  // Before we really decide whether or not to show the keyboard layout,
  // let's try to start the loading process of what we need.
  app.layoutManager.loader.getLayoutAsync(layoutName).then(function(layout) {
    var imEngineName = layout.imEngine;

    // Ask the loader to start loading IMEngine
    if (imEngineName) {
      app.inputMethodManager.loader.getInputMethodAsync(imEngineName);
    }
  });

  // Don't bother try to switch the layout if it's not needed (yet).
  if (document.hidden || !app.inputContext) {
    hideKeyboard();

    // Load l10n library here, there is nothing more to do left
    // in the critical path.
    app.l10nLoader.load();

    return;
  }

  // Make sure we are working in parallel,
  // since eventually IMEngine will be switched.
  // See showKeyboard()->switchIMEngine()
  app.inputMethodManager.updateInputContextData();

  app.layoutManager.switchCurrentLayout(layoutName).then(function() {
    app.perfTimer.printTime('updateCurrentKeyboardState:promise resolved');
    // Now the that we have the layout ready,
    // we should show the keyboard if we need it.
    if (!document.hidden && app.inputContext) {
      showKeyboard();
    }
  });
}

function renderKeyboard() {
  app.perfTimer.printTime('renderKeyboard');
  app.perfTimer.startTimer('renderKeyboard');

  app.layoutRenderingManager.updateLayoutRendering();

  isKeyboardRendered = true;

  app.perfTimer.printTime('BLOCKING renderKeyboard', 'renderKeyboard');
}

// Set up the keyboard and its input method.
// This is called when we get an event from mozInputMethod.
// The state argument is the data passed with that event, and includes
// the input field type, its inputmode, its content, and the cursor position.
function showKeyboard() {
  app.perfTimer.printTime('showKeyboard');
  clearTimeout(hideKeyboardTimeout);

  app.inputContext = navigator.mozInputMethod.inputcontext;

  app.layoutManager.updateLayoutPage(app.layoutManager.LAYOUT_PAGE_DEFAULT);
  app.upperCaseStateManager.reset();

  // everything.me uses this setting to improve searches,
  // but they really shouldn't.
  app.settingsPromiseManager.set({
    'keyboard.current': app.layoutManager.currentLayoutName
  });

  switchIMEngine();
}

// Hide keyboard
function hideKeyboard() {
  if (!isKeyboardRendered) {
    return;
  }

  app.candidatePanelManager.hideFullPanel();
  app.inputMethodManager.switchCurrentIMEngine('default');

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

function switchIMEngine() {
  app.perfTimer.printTime('switchIMEngine');

  var layout = app.layoutManager.currentModifiedLayout;
  var imEngineName = layout.imEngine || 'default';

  var p = app.inputMethodManager.switchCurrentIMEngine(imEngineName);
  p.then(function() {
    app.perfTimer.printTime('switchIMEngine:promise resolved');
    renderKeyboard();

    // Load l10n library after IMEngine is loaded (if it's not loaded yet).
    app.l10nLoader.load();
  });
}
