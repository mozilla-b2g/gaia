/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var TrustedUIManager = {
  _currentPopup: null,
  _lastDisplayedApp: null,

  overlay: document.getElementById('dialog-overlay'),

  popupContainer: document.getElementById('popup-container'),

  container: document.getElementById('frame-container'),

  screen: document.getElementById('screen'),

  loadingIcon: document.getElementById('statusbar-loading'),

  init: function trui_init() {
    window.addEventListener('home', this);
  },

  open: function trui_open(name, frame, origin) {
    if (this.isVisible()) {
      this.container.removeChild(this._currentPopup);
      this._currentPopup = null;
    } else {
      this._lastDisplayedApp = WindowManager.getDisplayedApp();
      WindowManager.setDisplayedApp(null);
    }

    this.popupContainer.dataset.trusty = true;

    this.setHeight(window.innerHeight - StatusBar.height);
    var popup = this._currentPopup = frame;
    var dataset = popup.dataset;
    dataset.frameType = 'popup';
    dataset.frameName = name;
    dataset.frameOrigin = origin;
    this.container.appendChild(popup);

    this.screen.classList.add('popup');
  },

  close: function trui_close(callback) {
    var self = this;
    this.popupContainer.addEventListener('transitionend', function wait(event) {
      self.popupContainer.removeEventListener('transitionend', wait);
      self.screen.classList.remove('popup');
      self.popupContainer.classList.remove('disappearing');
      self.popupContainer.dataset.trusty = false;
      self.container.removeChild(self._currentPopup);
      delete self._currentPopup;

      WindowManager.setDisplayedApp(self._lastDisplayedApp);
      self._lastDisplayedApp = null;

      if (callback)
        callback();

    });

    this.popupContainer.classList.add('disappearing');

    window.focus();
  },

  setHeight: function trui_setHeight(height) {
    if (this.isVisible())
      this.overlay.style.height = height + 'px';
  },

  isVisible: function trui_isVisible() {
    return (this._currentPopup != null);
  },

  handleEvent: function trui_handleEvent(evt) {
    switch (evt.type) {
      case 'home':
        if (this.isVisible())
          this.close();
        break;
    }
  },

};

TrustedUIManager.init();
