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
 */
function SystemDialog(id) {
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
        updateHeight(evt.detail.height);
        break;
    }
  };
  window.addEventListener('resize', handleEvent);
  window.addEventListener('keyboardchange', handleEvent);
  window.addEventListener('keyboardhide', handleEvent);

  return {
    show: function sd_show() {
      dialog.hidden = false;
      dialog.classList.add(id);
      SystemScreen.show(screenName);
      updateHeight();
    },

    hide: function sd_hide() {
      dialog.hidden = true;
      dialog.classList.remove(id);
      SystemScreen.hide(screenName);
    },

    isVisible: function sd_isVisible() {
      return SystemScreen.isVisible(screenName) &&
             overlay.classList.contains(id);
    }
  };
}

