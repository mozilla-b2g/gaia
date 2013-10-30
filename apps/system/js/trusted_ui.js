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

  throbber: document.getElementById('trustedui-throbber'),

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
    window.addEventListener('appopen', this);
    window.addEventListener('appwillclose', this);
    window.addEventListener('appcreated', this);
    window.addEventListener('appterminated', this);
    window.addEventListener('keyboardhide', this);
    window.addEventListener('keyboardchange', this);
    this.closeButton.addEventListener('click', this);
  },

  open: function trui_open(name, frame, chromeEventId, onCancelCB) {
    screen.mozLockOrientation('portrait');
    this._hideAllFrames();
    if (this.currentStack.length) {
      this._makeDialogHidden(this._getTopDialog());
      this._pushNewDialog(name, frame, chromeEventId, onCancelCB);
    } else {
      // first time, spin back to home screen first
      this.popupContainer.classList.add('up');
      this.popupContainer.classList.remove('closing');
      this._hideCallerApp(this._lastDisplayedApp, function openTrustedUI() {
        this.popupContainer.classList.remove('up');
        this._pushNewDialog(name, frame, chromeEventId, onCancelCB);
      }.bind(this));
    }
  },

  close: function trui_close(chromeEventId, callback, origin) {
    var stackSize = origin ? this._dialogStacks[origin].length :
                             this.currentStack.length;

    this._restoreOrientation();

    if (callback)
      callback();

    if (stackSize === 0) {
      // Nothing to close.  what are you doing?
      return;
    } else if (stackSize === 1) {
      // Only one dialog, so transition back to main app.
      var self = this;
      var container = this.popupContainer;
      if (!CardsView.cardSwitcherIsShown()) {
        if (!origin) {
          this._restoreCallerApp(this._lastDisplayedApp);
        }
        container.addEventListener('transitionend', function wait(event) {
          this.removeEventListener('transitionend', wait);
          self._closeDialog(chromeEventId, origin);
        });
      } else {
        if (!origin) {
          this._restoreCallerApp(this._lastDisplayedApp);
        }
        this._closeDialog(chromeEventId, origin);
      }

      // The css transition caused by the removal of the trustedui
      // class by the hide() method will trigger a 'transitionend'
      // event ultimately to be fired.
      this._hide();

      window.focus();
    } else {
      this._closeDialog(chromeEventId, origin);
    }
  },

  isVisible: function trui_show() {
    return this.screen.classList.contains('trustedui');
  },

  _hideTrustedApp: function trui_hideTrustedApp() {
    var self = this;
    this.popupContainer.classList.add('closing');
    this.popupContainer.addEventListener('transitionend', function hide() {
      this.removeEventListener('transitionend', hide);
      self._hide();
    });
  },

  _reopenTrustedApp: function trui_reopenTrustedApp() {
    this._hideAllFrames();
    var dialog = this._getTopDialog();
    this._makeDialogVisible(dialog);
    this.popupContainer.classList.add('closing');
    this._show();
    this.popupContainer.classList.remove('closing');
  },

  _hideCallerApp: function trui_hideCallerApp(origin, callback) {
    var app = WindowManager.getRunningApps()[origin];
    if (app == null || app.isHomescreen) {
      return;
    }

    this.publish('trusteduishow', { origin: origin });
    var frame = app.frame;
    frame.classList.add('back');
    frame.classList.remove('restored');
    if (callback) {
      frame.addEventListener('transitionend', function execCallback() {
        frame.style.visibility = 'hidden';
        frame.removeEventListener('transitionend', execCallback);
        callback();
      });
    }
  },

  publish: function trui_publish(evtName, detail) {
    var evt = new CustomEvent(evtName, {
      bubbles: true,
      cancelable: true,
      detail: detail
    });

    window.dispatchEvent(evt);
  },

  _restoreCallerApp: function trui_restoreCallerApp(origin) {
    var frame = WindowManager.getAppFrame(origin);
    frame.style.visibility = 'visible';
    frame.classList.remove('back');
    if (!WindowManager.getCurrentDisplayedApp().isHomescreen) {
      this.publish('trusteduihide', { origin: origin });
    }
    if (WindowManager.getDisplayedApp() == origin) {
      frame.classList.add('restored');
      frame.addEventListener('transitionend', function removeRestored() {
        frame.removeEventListener('transitionend', removeRestored);
        frame.classList.remove('restored');
      });
    }
  },

  _dispatchCloseEvent: function dispatchCloseEvent(eventId) {
    if (!eventId) {
      return;
    }
    var event = document.createEvent('customEvent');
    var details = {
      id: eventId,
      type: 'cancel',
      errorMsg: 'DIALOG_CLOSED_BY_USER'
    };
    event.initCustomEvent('mozContentEvent', true, true, details);
    window.dispatchEvent(event);
  },

  _getTopDialog: function trui_getTopDialog(origin) {
    // Get the topmost dialog for the _lastDisplayedApp, the given origin
    // or null.
    if (origin) {
      var stack = this._dialogStacks[origin];
      return stack[stack.length - 1];
    }
    return this.currentStack[this.currentStack.length - 1];
  },

  _pushNewDialog: function trui_PushNewDialog(name, frame, chromeEventId,
                                              onCancelCB) {
    // Add some data attributes to the frame.
    var dataset = frame.dataset;
    dataset.frameType = 'popup';
    dataset.frameName = frame.name;
    dataset.frameOrigin = this._lastDisplayedApp;

    // Add mozbrowser listeners.
    frame.addEventListener('mozbrowserloadstart',
                           this.handleBrowserEvent);
    frame.addEventListener('mozbrowserloadend',
                           this.handleBrowserEvent);

    // Make a shiny new dialog object.
    var dialog = {
      name: name,
      frame: frame,
      chromeEventId: chromeEventId,
      onCancelCB: onCancelCB
    };

    // Push and show.
    this.currentStack.push(dialog);
    this.dialogTitle.textContent = dialog.name;
    this.container.appendChild(dialog.frame);
    this._makeDialogVisible(dialog);
  },

  _makeDialogVisible: function trui_makeDialogVisible(dialog) {
    // make sure the trusty ui is visible
    this.popupContainer.classList.remove('closing');
    this._show();

    // ensure the frame is visible and the dialog title is correct.
    dialog.frame.classList.add('selected');
    this.dialogTitle.textContent = dialog.name;
  },

  _makeDialogHidden: function trui_makeDialogHidden(dialog) {
    if (!dialog)
      return;
    this._restoreOrientation();
    dialog.frame.classList.remove('selected');
  },

  _restoreOrientation: function trui_restoreOrientation() {
    var app = WindowManager.getDisplayedApp();
    WindowManager.setOrientationForApp(app);
  },

  /**
   * Close the dialog identified by the chromeEventId.
   */
  _closeDialog: function trui_closeDialog(chromeEventId, origin) {
    var stack = origin ? this._dialogStacks[origin] :
                         this.currentStack;
    if (stack.length === 0) {
      return;
    }

    var found = false;
    for (var i = 0; i < stack.length; i++) {
      if (stack[i].chromeEventId === chromeEventId) {
        var frame = stack.splice(i, 1)[0].frame;
        frame.removeEventListener('mozbrowserloadstart',
                                  this.handleBrowserEvent);
        frame.removeEventListener('mozbrowserloadend',
                                  this.handleBrowserEvent);
        this.container.removeChild(frame);
        found = true;
        break;
      }
    }

    if (found && stack.length) {
      this._makeDialogVisible(this._getTopDialog());
    }
  },

  _hide: function trui_hide() {
    this.screen.classList.remove('trustedui');
  },

  _show: function trui_show() {
    this.screen.classList.add('trustedui');
  },

  _setHeight: function trui_setHeight(height) {
    this.overlay.style.height = height + 'px';
  },

  /*
   * _destroyDialog: internal method called when the dialog is closed
   * by user action (canceled), or when 'appterminated' is received.
   * In either case, notify the caller.
   */
  _destroyDialog: function trui_destroyDialog(origin) {
    var stack = this.currentStack;
    if (origin) {
      stack = this._dialogStacks[origin];
    }

    if (stack.length === 0)
      return;

    // If the user closed a trusty UI dialog, they probably meant
    // to close every dialog.
    for (var i = 0, toClose = stack.length; i < toClose; i++) {
      var dialog = this._getTopDialog(origin);

      // First, send a chrome event saying we've been canceled
      this._dispatchCloseEvent(dialog.chromeEventId);

      // Now close and fire the cancel callback, if it exists
      this.close(dialog.chromeEventId, dialog.onCancelCB, origin);
    }
    this._hide();
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

        this._hideTrustedApp();
        break;
      case 'click':
        // Close-button clicked
        this._destroyDialog();
        break;
      case 'appterminated':
        this._destroyDialog(evt.detail.origin);
        break;
      case 'appcreated':
        // XXX: This is a quick fix for sometimes an app is created
        // at background and never got brought to foregroud.
        // We ought not to repy on app* events but embed us
        // in appWindow class to achieve a true fix.
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=911880
        if (!this._dialogStacks[evt.detail.origin]) {
          this._dialogStacks[evt.detail.origin] = [];
        }
        break;
      case 'appwillopen':
        // Hiding trustedUI when coming from Activity
        if (this.isVisible())
          this._hideTrustedApp();

        // Ignore homescreen
        if (evt.target.classList.contains('homescreen'))
          return;
        this._lastDisplayedApp = evt.detail.origin;
        if (this.currentStack.length) {
          // Reopening an app with trustedUI
          this.popupContainer.classList.remove('up');
          this._makeDialogVisible(this._getTopDialog());
          this._hideCallerApp(this._lastDisplayedApp);
          this._reopenTrustedApp();
        }
        break;
      case 'appopen':
        if (this.currentStack.length) {
          screen.mozLockOrientation('portrait');
        }
        break;
      case 'appwillclose':
        if (this.isVisible())
          return;
        var dialog = this._getTopDialog();
        this._makeDialogHidden(dialog);
        this._hide();
        break;
      case 'keyboardchange':
        var keyboardHeight = KeyboardManager.getHeight();
        this._setHeight(window.innerHeight - StatusBar.height - keyboardHeight);
        break;
      case 'keyboardhide':
        this._setHeight(window.innerHeight - StatusBar.height);
        break;
    }
  },

  handleBrowserEvent: function trui_handleBrowserEvent(evt) {
    switch (evt.type) {
      case 'mozbrowserloadstart':
        TrustedUIManager.throbber.classList.add('loading');
        break;
      case 'mozbrowserloadend':
        TrustedUIManager.throbber.classList.remove('loading');
        break;
    }
  }

};

TrustedUIManager.init();

