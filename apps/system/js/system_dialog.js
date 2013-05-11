/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

/**
 * System app is made of a top-level `<div ="screen"></div>` DOM element
 * which contain all possible screens displayed by the app.
 * Multiple screens can be displayed at a time. We store the list of currently
 * visible screens into this DOM element class attribute.
 */
var SystemScreen = {
  screen: document.getElementById('screen'),

  show: function ss_show(screenName) {
    this.screen.classList.add(screenName);
  },

  hide: function ss_show(screenName) {
    this.screen.classList.remove(screenName);
  },

  isVisible: function ss_isVisible(screenName) {
    return this.screen.classList.contains(screenName);
  }
};

/**
 * System app displays various kind of dialogs.
 * A dialog is a system app 'screen' that has a high z-index and is used to be
 * displayed on top of other apps. But it doesn't display over the status bar,
 * nor the eventually displayed keyboard.
 *
 * `SystemDialog` except the dialog DOM Element `id`.
 * This DOM Element has to have a DOM attribute 'role' set to 'dialog'.
 *
 * It also supports a second `options` object with following attributes:
 *  `onHide`: function called when dialog is hidden, either when `hide()`
 *            method is called, or when dialog is automatically hidden on
 *            home button press
 */
function SystemDialog(id, options) {
  var overlay = document.getElementById('dialog-overlay');
  var dialog = document.getElementById(id);
  var screenName = 'dialog';

  // Listen to keyboard visibility changes and window resizing
  // in order to resize the dialog accordingly
  function updateHeight(keyboardHeight) {
    if (SystemScreen.isVisible(screenName)) {
      var height = window.innerHeight -
                   (keyboardHeight ? keyboardHeight : 0) -
                   StatusBar.height;
      overlay.style.height = height + 'px';
    }
  };
  function handleEvent(evt) {
    switch (evt.type) {
      case 'resize':
      case 'keyboardhide':
        updateHeight();
        break;
      case 'keyboardchange':
        var keyboardHeight = KeyboardManager.getHeight();
        updateHeight(keyboardHeight);
        break;
      case 'home':
      case 'holdhome':
        // Automatically hide the dialog on home button press
        if (SystemScreen.isVisible(screenName)) {
          hide(evt.type);
          // Prevent WindowManager to shift homescreen to the first page
          // when the dialog is on top of the homescreen
          var displayedApp = WindowManager.getDisplayedApp();
          var displayedAppFrame = WindowManager.getAppFrame(displayedApp);
          if (evt.type == 'home' &&
              displayedAppFrame.classList.contains('homescreen'))
            evt.stopImmediatePropagation();
        }
        break;
    }
  };
  window.addEventListener('resize', handleEvent);
  window.addEventListener('keyboardchange', handleEvent);
  window.addEventListener('keyboardhide', handleEvent);
  window.addEventListener('home', handleEvent);
  window.addEventListener('holdhome', handleEvent);

  function show() {
    dialog.hidden = false;
    dialog.classList.add(id);
    SystemScreen.show(screenName);
    updateHeight();
  }

  function hide(reason) {
    dialog.hidden = true;
    dialog.classList.remove(id);
    SystemScreen.hide(screenName);
    if (typeof(options.onHide) == 'function')
      options.onHide(reason);
  }

  function isVisible() {
    return SystemScreen.isVisible(screenName) &&
           overlay.classList.contains(id);
  }

  return {
    show: show,
    hide: hide,
    isVisible: isVisible
  };
}

