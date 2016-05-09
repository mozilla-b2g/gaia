/* global KeyboardManager, InteractiveNotifications */
'use strict';

(function(exports) {
  var WATCHED_EVENTS = [
    'mozChromeRemoteControlEvent',
    'focuschanged'
  ];

  var CURSOR_MODE_LIST = [
    'app://browser.gaiamobile.org/manifest.webapp'
  ];

  function RemoteControl() {
    this._activePIN = null;
    this._isCursorMode = null;
  }

  RemoteControl.prototype = {
    start: function() {
      WATCHED_EVENTS.forEach((event) => {
        window.addEventListener(event, this);
      });
    },

    stop: function() {
      WATCHED_EVENTS.forEach((event) => {
        window.removeEventListener(event, this);
      });

      this._isCursorMode = null;
    },

    handleEvent: function(evt) {
      switch(evt.type) {
        case 'focuschanged':
          var topMost = evt.detail.topMost;
          var isCursorMode;
          if (topMost.CLASS_NAME == 'AppWindow') {
            isCursorMode = CURSOR_MODE_LIST.includes(topMost.manifestURL);
          } else {
            isCursorMode = false;
          }
          this._fireControlModeChanged(isCursorMode);
          break;
        case 'mozChromeRemoteControlEvent':
          this._handleRemoteControlEvent(evt.detail);
          break;
      }
    },

    _handleRemoteControlEvent: function(detail) {
      switch(detail.action) {
        case 'request-control-mode':
          // In case the server is, for some reason, initialized or rebooted
          // after system app is loaded, it can retrieve the current control
          // mode immediately by utilizing this event instead of waiting for the
          // next "control-mode-changed" event triggered.
          this._fireControlModeChanged(this._isCursorMode, true);
          break;
        case 'grant-input':
          // InputFrameManager needs to deactivate the currently-active input
          // frame first and then the system app can be set an active input
          // frame by the server. It will be resumed as soon as the input
          // procedure is finished.
          KeyboardManager.inputFrameManager.pauseTemporarily(detail.value);
          break;
        case 'input-string':
          this._inputString(detail);
          break;
        case 'pin-created':
          this._createPIN(detail.pincode);
          break;
        case 'pin-destroyed':
          this._destroyPIN();
          break;
      }
    },

    _inputString: function(detail) {
      var mozIM = navigator.mozInputMethod;
      var inputcontext = mozIM.inputcontext;
      if (inputcontext) {
        if (detail.clear) {
          var lengthBeforeCursor = inputcontext.textBeforeCursor.length;
          var lengthAfterCursor = inputcontext.textAfterCursor.length;
          inputcontext.deleteSurroundingText(
            -1 * lengthBeforeCursor,
            lengthBeforeCursor + lengthAfterCursor
          );
        }

        if (detail.string) {
          inputcontext.setComposition(detail.string);
          inputcontext.endComposition(detail.string);
        }

        if (detail.keycode) {
          inputcontext.sendKey(detail.keycode);
        }
      }
    },

    _createPIN: function(pincode) {
      if (this._activePIN) {
        this._destroyPIN();
      }
      this._activePIN = {
        title: {id: 'pairing-code-notification-title'},
        text: pincode,
        icon: null,
        timeout: 30000,
        buttons: [{
          id: 'dismiss',
          label: {id: 'dismiss-pairing-code'}
        }],
        onClosed: (button) => {
          if (button == 'dismiss') {
            this._firePINDismissed('manually');
          } else if (this._activePIN) {
            this._firePINDismissed('timeout');
          }
          this._activePIN = null;
        }
      };
      window.interactiveNotifications.showNotification(
        InteractiveNotifications.TYPE.ALERT, this._activePIN);
    },

    _destroyPIN: function() {
      var activePIN = this._activePIN;
      this._activePIN = null;
      window.interactiveNotifications.hideNotification(
        InteractiveNotifications.TYPE.ALERT, activePIN);
    },

    _firePINDismissed: function(reason) {
      this._sendContentEvent('remote-control-pin-dismissed', {
        reason: reason
      });
    },

    _fireControlModeChanged: function(isCursorMode, fireAnyway) {
      if (!fireAnyway && isCursorMode === this._isCursorMode) {
        return;
      }
      this._isCursorMode = isCursorMode;
      this._sendContentEvent('control-mode-changed', {
        cursor: isCursorMode
      });
    },

    _sendContentEvent: function(type, detail) {
      window.dispatchEvent(new CustomEvent('mozContentEvent', {
        detail: {
          type: type,
          detail: detail
        }
      }));
    }
  };

  exports.RemoteControl = RemoteControl;
}(window));
