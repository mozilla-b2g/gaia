/* global SettingsListener, KeyboardManager */
'use strict';

(function(exports) {
  var SETTINGS = 'remote-control.enabled';

  var WATCHED_EVENTS = [
    'mozChromeRemoteControlEvent',
    'focuschanged'
  ];

  var CURSOR_MODE_LIST = [
    'app://browser.gaiamobile.org/manifest.webapp'
  ];

  function RemoteControl() {
    this._enabled = false;
    this._isCursorMode = null;
    this._settingsObserver = null;
  }

  RemoteControl.prototype = {
    start: function() {
      this._settingsObserver = this._setEnable.bind(this);
      SettingsListener.observe(SETTINGS, false, this._settingsObserver);

      WATCHED_EVENTS.forEach((event) => {
        window.addEventListener(event, this);
      });
    },

    stop: function() {
      WATCHED_EVENTS.forEach((event) => {
        window.removeEventListener(event, this);
      });

      SettingsListener.unobserve(SETTINGS, this._settingsObserver);
      this._settingsObserver = null;

      this._setEnable(false);
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
          if (this._enabled) {
            this._handleRemoteControlEvent(evt.detail);
          }
          break;
      }
    },

    _setEnable: function(enabled) {
      this._enabled = enabled;
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

    _fireControlModeChanged: function(isCursorMode, fireAnyway) {
      if (!fireAnyway && isCursorMode === this._isCursorMode) {
        return;
      }
      this._isCursorMode = isCursorMode;
      window.dispatchEvent(new CustomEvent('mozContentEvent', {
        detail: {
          type: 'control-mode-changed',
          detail: {
            cursor: isCursorMode
          }
        }
      }));
    }
  };

  exports.RemoteControl = RemoteControl;
}(window));
