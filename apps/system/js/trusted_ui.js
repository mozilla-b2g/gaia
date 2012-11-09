/* -*- Mode: js2; js2-basic-offset: 2; indent-tabs-mode: nil -*- */
/* vim: set ft=javascript sw=2 ts=2 autoindent cindent expandtab: */

'use strict';

var TrustedUIManager = {

  get currentStack () {
    if (!this._dialogStacks[this._lastDisplayedApp]) {
      this._dialogStacks[this._lastDisplayedApp] = [];
    }
    return this._dialogStacks[this._lastDisplayedApp];
  },

  _dialogStacks: {},
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

  open: function trui_open(name, frame, chromeEventId) {
    if (this.currentStack.length > 0) {
      this._makeDialogHidden(this._getTopDialog());
      this._pushNewDialog(name, frame, chromeEventId);
    } else {
      // first time, spin back to home screen first
      WindowManager.hideCurrentApp(function openTrustedUI() {
        this._pushNewDialog(name, frame, chromeEventId);
      }.bind(this));
    }
  },

  close: function trui_close(callback) {
    // XXX this assumes that close() will only be called from the
    // topmost element in the frame stack.  woooog.
    var stackSize = this.currentStack.length;

    if (callback)
      callback();

    if (stackSize === 0) {
      // nothing to close.  what are you doing?
      return;
    }

    else if (stackSize === 1) {
      // only one dialog, so transition back to main app
      var self = this;
      this.popupContainer.addEventListener('transitionend', function wait(event) {
        this.removeEventListener('transitionend', wait);
        self._closeTopDialog();
        WindowManager.restoreCurrentApp();
      });

      // The css transition caused by the removal of the trustedui
      // class by the hide() method will trigger a 'transitionend'
      // event ultimately to be fired.
      this.hide();

      window.focus();
    }

    else {
      // there are two or more dialogs, so remove the top one
      // (which reveals the one beneath it)
      this._closeTopDialog();
    }
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

  _getTopDialog: function trui_getTopDialog() {
    // get the topmost dialog for the _lastDisplayedApp or null
    return this.currentStack[this.currentStack.length-1];
  },

  _pushNewDialog: function trui_PushNewDialog(name, frame, chromeEventId) {
    // add some data attributes to the frame
    var dataset = frame.dataset;
    dataset.frameType = 'popup';
    dataset.frameName = frame.name;
    dataset.frameOrigin = this._lastDisplayedApp;

    // make a shiny new dialog object
    var dialog = {
      name: name,
      frame: frame,
      chromeEventId: chromeEventId
    };

    // push and show
    this.currentStack.push(dialog);
    this._makeDialogVisible(dialog);
  },

  _makeDialogVisible: function trui_makeDialogVisible(dialog) {
    this.dialogTitle.textContent = dialog.name;
    this.container.appendChild(dialog.frame);
    // make sure the trusty ui is visible
    this.show();

    // ensure the frame is visible
    dialog.frame.classList.add('selected');
  },

  _makeDialogHidden: function trui_makeDialogHidden(dialog) {
    this.container.removeChild(dialog.frame);
  },

  _closeTopDialog: function trui_closeTopDialog() {
    if (this.currentStack.length === 0)
      return;

    var dialog = this.currentStack.pop();
    this.container.removeChild(dialog.frame);
    this._dispatchCloseEvent(dialog.chromeEventId);

    if (this.currentStack.length > 0) {
      this._makeDialogVisible(this._getTopDialog());
    }
  },

  hide: function trui_hide() {
    this.screen.classList.remove('trustedui');
  },

  show: function trui_show() {
    this.screen.classList.add('trustedui');
  },

  isVisible: function trui_show() {
    this.screen.classList.contains('trustedui');
  },

  setHeight: function trui_setHeight(height) {
    this.overlay.style.height = height + 'px';
  },

  handleEvent: function trui_handleEvent(evt) {
    switch (evt.type) {
      case 'home':
        if (!this.isVisible())
          return;

        WindowManager.restoreCurrentApp();
        this.hide();
        break;
      case 'click':
        // Close-button clicked
        if (this.currentStack.length === 0)
          return;

        // If the user closed a trusty UI dialog, they probably meant
        // to close every dialog.
        for (var i = 0, toClose = this.currentStack.length; i < toClose; i++) {
          this.close();
        }
        break;
      case 'appopen':
        this._lastDisplayedApp = evt.detail.origin;
        if (this.currentStack.length > 0) {
          // Reopening an app with trustedUI
          this.container.innerHTML = '';
          WindowManager.hideCurrentApp(function openTrustedUI() {
            this._makeDialogVisible(this._getTopDialog());
          }.bind(this));
        }
        break;
      case 'appwillclose':
        if (this.currentStack.length === 0)
          return;
        this.hide();
        break;
      case 'appterminated':
        if (this.currentStack.length === 0)
          return;
        // cleanup
        var dialog = this.currentStack.pop();
        this.container.removeChild(dialog.frame);
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
