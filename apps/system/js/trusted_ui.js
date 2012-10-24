/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var TrustedUIManager = {

  _dialogs: {},
  _lastDisplayedApp: null,

  overlay: document.getElementById('dialog-overlay'),

  popupContainer: document.getElementById('trustedui-container'),

  container: document.getElementById('trustedui-frame-container'),

  dialogTitle: document.getElementById('trustedui-title'),

  screen: document.getElementById('screen'),

  loadingIcon: document.getElementById('statusbar-loading'),

  closeButton: document.getElementById('trustedui-close'),

  init: function trui_init() {
    window.addEventListener('home', this);
    window.addEventListener('appopen', this);
    window.addEventListener('appwillclose', this);
    window.addEventListener('appterminated', this);
    window.addEventListener('keyboardhide', this);
    window.addEventListener('keyboardchange', this);
    this.closeButton.addEventListener('click', this);
  },

  open: function trui_open(name, frame, origin, chromeEventId) {
    if (this._alreadyExists(this._lastDisplayedApp)) {
      // If already exists a Dialog, swap them
      this.container.removeChild(this._dialogs[this._lastDisplayedApp].frame);
      this._createDialog(name, frame, this._lastDisplayedApp, chromeEventId);
    } else {
      WindowManager.hideCurrentApp(function openTrustedUI() {
        this._createDialog(name, frame, this._lastDisplayedApp, chromeEventId);
      }.bind(this));
    }
  },

  _alreadyExists: function alreadyExists(origin) {
    return this._dialogs[origin];
  },

  _dispatchCloseEvent: function dispatchCloseEvent(eventId) {
    var _ = navigator.mozL10n.get;
    if (!eventId)
      return;
    var event = document.createEvent('customEvent');
    var details = {
      id: eventId,
      errorMsg: _('dialog-closed')
    };
    event.initCustomEvent('mozContentEvent', true, true, details);
    window.dispatchEvent(event);
  },

  _createDialog: function trui_createDialog(name, frame, origin, chromeEventId) {
    this._dialogs[origin] = {
      name: name,
      frame: frame,
      chromeEventId: chromeEventId
    };
    this.dialogTitle.textContent = origin;
    var popup = frame;
    var dataset = popup.dataset;
    dataset.frameType = 'popup';
    dataset.frameName = name;
    dataset.frameOrigin = origin;
    this.container.appendChild(popup);
    this.screen.classList.add('trustedui');
  },

  _destroyDialog: function trui_destroyDialog() {
    var currentDialog = this._dialogs[this._lastDisplayedApp];
    this.container.removeChild(currentDialog.frame);
    delete this._dialogs[this._lastDisplayedApp];
  },

  close: function trui_close(callback) {
    if (!this._alreadyExists(this._lastDisplayedApp))
      return;
    var self = this;
    this.popupContainer.addEventListener('transitionend', function wait(event) {
      this.removeEventListener('transitionend', wait);
      self._destroyDialog();
      WindowManager.restoreCurrentApp();
    });

    self.screen.classList.remove('trustedui');
    if (callback)
      callback();

    window.focus();
  },

  hide: function trui_hide() {
    this.screen.classList.remove('trustedui');
  },

  setHeight: function trui_setHeight(height) {
    this.overlay.style.height = height + 'px';
  },

  handleEvent: function trui_handleEvent(evt) {
    switch (evt.type) {
      case 'home':
        WindowManager.restoreCurrentApp();
        this.hide();
        break;
      case 'click':
        var dialog = this._dialogs[this._lastDisplayedApp];
        if (!dialog)
          return;
        this.close();
        // Notify user closed the trustedUI
        this._dispatchCloseEvent(dialog.chromeEventId);
        break;
      case 'appopen':
        this._lastDisplayedApp = evt.detail.origin;
        if (this._alreadyExists(this._lastDisplayedApp)) {
          // Reopening an app with trustedUI
          var dialog = this._dialogs[this._lastDisplayedApp];
          this.container.innerHTML = '';
          WindowManager.hideCurrentApp(function openTrustedUI() {
            this._createDialog(dialog.name, dialog.frame,
                               this._lastDisplayedApp, dialog.chromeEventId);
          }.bind(this, dialog));
        }
        break;
      case 'appwillclose':
        if (!this._dialogs[this._lastDisplayedApp])
          return;
        this.hide();
        break;
      case 'appterminated':
        if (!this._dialogs[this._lastDisplayedApp])
          return;
        this._destroyDialog();
        break;
      case 'keyboardchange':
        this.setHeight(window.innerHeight -
          StatusBar.height - evt.detail.height);
        break;
      case 'keyboardhide':
        this.setHeight(window.innerHeight - StatusBar.height);
        break;
    }
  }

};

TrustedUIManager.init();

