/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
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
    window.addEventListener('appwillclose', this);
    window.addEventListener('home', this);
  },

  _showWait: function pm_showWait() {
    this.loadingIcon.classList.add('popup-loading');
  },

  _hideWait: function pm_hideWait() {
    this.loadingIcon.classList.remove('popup-loading');
  },

  open: function pm_open(name, frame, origin, trusted) {
    // Only one popup at a time. If the popup is being shown, we swap frames.
    if (this._currentPopup) {
      this.container.removeChild(this._currentPopup);
      this._currentPopup = null;
    } else if (trusted) {
      // Save the current displayed app in order to show it after closing the
      // popup.
      this._lastDisplayedApp = WindowManager.getDisplayedApp();
      // Show the homescreen.
      WindowManager.setDisplayedApp(null);
    }

    this._currentPopup = frame;

    var popup = this._currentPopup;
    var dataset = popup.dataset;
    dataset.frameType = 'popup';
    dataset.frameName = name;
    dataset.frameOrigin = origin;

    this.container.appendChild(popup);

    this.screen.classList.add('popup');

    popup.addEventListener('mozbrowserloadend', this);
    popup.addEventListener('mozbrowserloadstart', this);
  },

  close: function pm_close(evt, callback) {
    if (evt && (!'frameType' in evt.target.dataset ||
        evt.target.dataset.frameType !== 'popup'))
      return;

    this.screen.classList.remove('popup');

    var self = this;
    this.container.addEventListener('transitionend', function trWait() {
      self.container.removeEventListener('transitionend', trWait);
      self.container.removeChild(self._currentPopup);
      self._currentPopup = null;

      // If the popup was opened as a trusted UI on top of the homescreen
      // we show the last displayed application.
      if (self._lastDisplayedApp) {
        WindowManager.setDisplayedApp(self._lastDisplayedApp);
        self._lastDisplayedApp = null;
      }

      if (callback)
        callback();
    });

    // We just removed the focused window leaving the system
    // without any focused window, let's fix this.
    window.focus();
  },

  // Workaround for Bug: 781452
  // - when window.open is called mozbrowserloadstart and mozbrowserloadend
  // are fired two times
  handleLoadStart: function pm_handleLoadStart(evt) {
     this._startTimes++;
     if (this._startTimes > 1) {
      this._showWait();
     }
  },

  // Workaround for Bug: 781452
  // - when window.open is called mozbrowserloadstart and mozbrowserloadend
  // are fired two times
  handleLoadEnd: function pm_handleLoadEnd(evt) {
      this._endTimes++;
      if (this._endTimes > 1) {
        this._hideWait();
      }
  },

  backHandling: function pm_backHandling(evt) {
    if (!this._currentPopup)
      return;

    this.close();
    evt.stopImmediatePropagation();
  },

  isVisible: function pm_isVisible() {
    return (this._currentPopup != null);
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
        this.open(evt.detail.name, evt.detail.frameElement,
                  evt.target.dataset.frameOrigin, false);
        break;
      case 'mozbrowserclose':
        this.close(evt);
        break;
      case 'home':
        this.backHandling(evt);
        break;
      case 'appwillclose':
        if (!this._currentPopup)
          return;

        this.close();
        break;
    }
  }
};

PopupManager.init();
