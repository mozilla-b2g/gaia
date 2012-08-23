/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

// As per Bug 768943, all window.open calls should open a popup dialog as
// defined by the trustworthy UI proposal. That is so far, opening the dialog
// on top of the homescreen.
// TODO: This is still pending a final UX and security agreement.

'use strict';

var PopupManager = {
  _currentPopup: null,
  _lastDisplayedApp: null,
  _endTimes: 0,
  _startTimes: 0,

  overlay: document.getElementById('dialog-overlay'),

  container: document.getElementById('popup-container'),

  screen: document.getElementById('screen'),

  loadingIcon: document.getElementById('statusbar-loading'),

  init: function pm_init() {
    window.addEventListener('mozbrowseropenwindow', this);
    window.addEventListener('mozbrowserclose', this);

    window.addEventListener('home', this);
  },

  _showWait: function pm_showWait() {
    this.loadingIcon.classList.add('popup-loading');
  },

  _hideWait: function pm_hideWait() {
    this.loadingIcon.classList.remove('popup-loading');
  },

  open: function pm_open(evt) {
    // Only one popup at a time.
    // TODO: Swap frames instead of returning.
    if (this._currentPopup)
      return;

    // Save the current displayed app in order to show it after closing the
    // popup.
    this._lastDisplayedApp = WindowManager.getDisplayedApp();

    // Save the frame to be shown within the popup container.
    this._currentPopup = evt.detail.frameElement;

    WindowManager.showHomescreen();

    var popup = this._currentPopup;
    popup.dataset.frameType = 'popup';
    popup.dataset.frameName = evt.detail.name;
    popup.dataset.frameOrigin = evt.target.dataset.frameOrigin;

    this.container.appendChild(popup);

    this.screen.classList.add('popup');

    popup.addEventListener('mozbrowserloadend', this);
    popup.addEventListener('mozbrowserloadstart', this);
  },

  // Workaround for Bug 781452: when window.open is called
  // mozbrowserloadstart and mozbrowserloadend are fired two times.
  handleLoadStart: function pm_handleLoadStart(evt) {
     this._startTimes++;
     if (this._startTimes > 1) {
      this._showWait();
     }
  },

  // Workaround for Bug 781452: when window.open is called
  // mozbrowserloadstart and mozbrowserloadend are fired two times.
  handleLoadEnd: function pm_handleLoadEnd(evt) {
      this._endTimes++;
      if (this._endTimes > 1) {
        this._hideWait();
      }
  },

  handleEvent: function pm_handleEvent(evt) {
    switch (evt.type) {
      case 'mozbrowserloadstart':
        this.handleLoadStart(evt);
        break;
      case 'mozbrowserloadend':
        this.handleLoadEnd(evt);
        break;
      case 'mozbrowseropenwindow':
        this.open(evt);
        break;
      case 'mozbrowserclose':
        this.close(evt);
        break;
      case 'home':
        this.backHandling(evt);
        break;
    }
  },

  close: function pm_close(evt) {
    if (evt && (!'frameType' in evt.target.dataset ||
        evt.target.dataset.frameType !== 'popup'))
      return;

    this.screen.classList.remove('popup');

    var self = this;
    this.container.addEventListener('transitionend', function trWait() {
      self.container.removeEventListener('transitionend', trWait);
      self.container.removeChild(self._currentPopup);
      self._currentPopup = null;

      // Show the latest displayed app.
      WindowManager.setDisplayedApp(self._lastDisplayedApp);
      this._lastDisplayedApp = null;
    });

    // We just removed the focused window leaving the system
    // without any focused window, let's fix this.
    window.focus();
  },

  backHandling: function pm_backHandling(evt) {
    if (!this._currentPopup)
      return;

    this.close();
    evt.stopImmediatePropagation();
  },

  isVisible: function pm_isVisible() {
    return (this._currentPopup != null);
  }
};

PopupManager.init();
