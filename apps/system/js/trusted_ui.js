/* -*- Mode: js2; js2-basic-offset: 2; indent-tabs-mode: nil -*- */
/* vim: set ft=javascript sw=2 ts=2 autoindent cindent expandtab: */

'use strict';

var TrustedUIManager = {

  get currentStack() {
    if (!this._dialogStacks[this._lastDisplayedApp]) {
      this._dialogStacks[this._lastDisplayedApp] = [];
    }
    return this._dialogStacks[this._lastDisplayedApp];
  },

  _dialogStacks: {},
  _lastDisplayedApp: null,

  overlay: document.getElementById('dialog-overlay'),

  popupContainer: document.getElementById('trustedui-container'),

  popupContainerInner: document.getElementById('trustedui-inner'),

  container: document.getElementById('trustedui-frame-container'),

  dialogTitle: document.getElementById('trustedui-title'),

  screen: document.getElementById('screen'),

  loadingIcon: document.getElementById('statusbar-loading'),

  closeButton: document.getElementById('trustedui-close'),

  hasTrustedUI: function trui_hasTrustedUI(origin) {
    return (this._dialogStacks[origin] && this._dialogStacks[origin].length);
  },

  getDialogFromOrigin: function trui_getDialogFromOrigin(origin) {
    if (!origin || !this.hasTrustedUI(origin))
      return false;
    var stack = this._dialogStacks[origin];
    return stack[stack.length - 1];
  },

  init: function trui_init() {
    window.addEventListener('home', this);
    window.addEventListener('holdhome', this);
    window.addEventListener('appwillopen', this);
    window.addEventListener('appwillclose', this);
    window.addEventListener('appterminated', this);
    window.addEventListener('keyboardhide', this);
    window.addEventListener('keyboardchange', this);
    this.closeButton.addEventListener('click', this);
  },

  hideTrustedApp: function trui_hideTrustedApp() {
    var self = this;
    this.popupContainer.classList.add('closing');
    this.popupContainer.addEventListener('transitionend', function hide() {
      this.removeEventListener('transitionend', hide);
      self.hide();
    });
  },

  reopenTrustedApp: function trui_reopenTrustedApp() {
    this._hideAllFrames();
    var dialog = this._getTopDialog();
    this._makeDialogVisible(dialog);
    this.popupContainer.classList.add('closing');
    this.show();
    this.popupContainer.classList.remove('closing');
  },

  open: function trui_open(name, frame, chromeEventId) {
    this._hideAllFrames();
    if (this.currentStack.length > 0) {
      this._makeDialogHidden(this._getTopDialog());
      this._pushNewDialog(name, frame, chromeEventId);
    } else {
      // first time, spin back to home screen first
      this.popupContainer.classList.add('up');
      this.popupContainer.classList.remove('closing');
      WindowManager.hideCurrentApp(function openTrustedUI() {
        this.popupContainer.classList.remove('up');
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
      var container = this.popupContainer;
      WindowManager.restoreCurrentApp();
      container.addEventListener('transitionend', function wait(event) {
        this.removeEventListener('transitionend', wait);
        self._closeTopDialog();
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
    return this.currentStack[this.currentStack.length - 1];
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
    this.dialogTitle.textContent = dialog.name;
    this.container.appendChild(dialog.frame);
    this._makeDialogVisible(dialog);
  },

  _makeDialogVisible: function trui_makeDialogVisible(dialog) {
    // make sure the trusty ui is visible
    this.popupContainer.classList.remove('closing');
    this.show();

    // ensure the frame is visible
    dialog.frame.classList.add('selected');
  },

  _makeDialogHidden: function trui_makeDialogHidden(dialog) {
    if (!dialog)
      return;
    dialog.frame.classList.remove('selected');
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
    return this.screen.classList.contains('trustedui');
  },

  setHeight: function trui_setHeight(height) {
    this.overlay.style.height = height + 'px';
  },

  _destroyDialog: function trui_destroyDialog(origin) {
    var stack = this.currentStack;
    if (origin)
      stack = this._dialogStacks[origin];

    if (stack.length === 0)
      return;

    // If the user closed a trusty UI dialog, they probably meant
    // to close every dialog.
    for (var i = 0, toClose = stack.length; i < toClose; i++) {
      this.close();
    }
    this.hide();
    this.popupContainer.classList.remove('closing');
  },

  _hideAllFrames: function trui_hideAllFrames() {
    var selectedFrames = this.container.querySelectorAll('iframe.selected');
    for (var i = 0; i < selectedFrames.length; i++) {
      selectedFrames[i].classList.remove('selected');
    }
  },

  handleEvent: function trui_handleEvent(evt) {
    switch (evt.type) {
      case 'home':
      case 'holdhome':
        if (!this.isVisible())
          return;

        this.hideTrustedApp();
        break;
      case 'click':
        // Close-button clicked
        this._destroyDialog();
        break;
      case 'appterminated':
        this._destroyDialog(evt.detail.origin);
        break;
      case 'appwillopen':
        this._lastDisplayedApp = evt.detail.origin;
        if (this.currentStack.length > 0) {
          // Reopening an app with trustedUI
          this.popupContainer.classList.remove('up');
          this._makeDialogVisible(this._getTopDialog());
          WindowManager.hideCurrentApp();
          this.reopenTrustedApp();
        }
        break;
      case 'appwillclose':
        if (this.isVisible())
          return;
        var dialog = this._getTopDialog();
        this._makeDialogHidden(dialog);
        this.hide();
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
