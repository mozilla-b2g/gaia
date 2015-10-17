'use strict';
(function(exports) {
  var BrowserKeyEventManager = function BrowserKeyEventManager() {
  };

  BrowserKeyEventManager.prototype = {
    KEY_EVENTS: Object.freeze([
      'mozbrowserbeforekeydown',
      'mozbrowserbeforekeyup',
      'mozbrowserafterkeydown',
      'mozbrowserafterkeyup',
      'keydown',
      'keyup'
    ]),
    SYSTEM_ONLY_KEYS: Object.freeze([
      'power',
      'home',
      'mozhomescreen',
      'exit'
    ]),
    APP_CANCELLED_KEYS: Object.freeze([
      'volumeup',
      'volumedown',
      'camera'
    ]),
    // Home key has different .key values on different devices.
    HOME_KEY_ALIAS: Object.freeze([
      'home',
      'mozhomescreen',
      'exit'
    ]),
    TRANSLATION_TABLE: Object.freeze({
      'power': 'sleep-button',
      'exit': 'home-button',
      'home': 'home-button',
      'mozhomescreen': 'home-button',
      'volumeup': 'volume-up-button',
      'volumedown': 'volume-down-button',
      'camera': 'camera-button'
    }),
    _getLowerCaseKeyName: function bkem_getLowerCaseKeyName(event) {
      return event.key && event.key.toLowerCase();
    },
    _isSystemOnlyKey: function bkem_isSystemOnlyKey(event) {
      var key = this._getLowerCaseKeyName(event);
      return (this.SYSTEM_ONLY_KEYS.indexOf(key) > -1);
    },
    _isAppCancelledKey: function bkem_isAppCancelledKey(event) {
      var key = this._getLowerCaseKeyName(event);
      return (this.APP_CANCELLED_KEYS.indexOf(key) > -1);
    },
    _isBeforeEvent: function bkem_isBeforeEvent(event) {
      return event.type === 'mozbrowserbeforekeyup' ||
        event.type === 'mozbrowserbeforekeydown';
    },
    _isAfterEvent: function bkem_isAfterEvent(event) {
      return event.type === 'mozbrowserafterkeyup' ||
        event.type === 'mozbrowserafterkeydown';
    },
    _isKeyEvent: function bkem_isKeyEvent(event) {
      return event.type === 'keyup' ||
        event.type === 'keydown';
    },
    _targetToIframe: function bkem_targetToIframe(event) {
      return (event.target instanceof HTMLIFrameElement);
    },

    // This function applies the appropriate event dispatch policy for this
    // key event, and returns true if the system app should handle the event
    // or false if the system app should not handle it. For system-only keys,
    // it prevents them from being dispatched to the app. For "app-cancelled"
    // keys, it allows them to be dispatched to the app first, and then
    // only allows them to be handled by the system app if the app did not
    // call preventDefault(). If more than one button is pressed, then
    // app-cancelled buttons are treated as system-only and not passed to the
    // app. Finally, unknown keys are never processed by the system app.
    _applyPolicy: function bkem_applyPolicy(event, isButtonPressed=false) {
      if (this._isSystemOnlyKey(event) &&
          (this._isBeforeEvent(event) || this._isKeyEvent(event))) {
        event.preventDefault();
        return true;
      } else if (isButtonPressed &&
                 this._isAppCancelledKey(event) &&
                 event.type === 'mozbrowserbeforekeydown') {
        // If there is already a button held down and this is another key down
        // event then we want to treat it as a system only key and ensure that
        // it is not dispatched to the app. Note that we won't handle it here
        // because that might change whether we're in the base state or
        // not. We'll handle it below when the afterkeydown arrives
        event.preventDefault();
        return false;
      } else if (isButtonPressed &&
                 this._isAppCancelledKey(event) &&
                 event.type === 'mozbrowserafterkeydown') {
        return true;
      } else if (this._isAppCancelledKey(event) && this._isAfterEvent(event)) {
        // If the app handled and cancelled the event, we don't want to
        // process it again here at the system app level.
        return !event.embeddedCancelled;
      } else if (this._isKeyEvent(event) &&
          !this._targetToIframe(event)) {
        // When focus is on embedded iframe and user press hardware key, system
        // app will receive an extra keydown keyup event targeted to the iframe.
        // We should ignore this event otherwise we will have strange state
        // transition in HardwareButton module.
        // Please see https://bugzilla.mozilla.org/show_bug.cgi?id=989198#c194
        // and https://bugzilla.mozilla.org/show_bug.cgi?id=1014418#c20
        return true;
      }

      // all unknown keys default to APP-ONLY, so the system app
      // is not interested in them, by definition
      return false;
    },
    isHomeKey: function bkem_isHomeKey(event) {
      var key = this._getLowerCaseKeyName(event);
      return (this.HOME_KEY_ALIAS.indexOf(key) > -1);
    },
    isHardwareKeyEvent: function bkem_isHardwareKeyEvent(type) {
      return (this.KEY_EVENTS.indexOf(type) > -1);
    },
    getButtonEventType: function bkem_getButtonEventType(event,
                                                         isButtonPressed) {
      var key;
      var suffix;

      if (this.isHardwareKeyEvent(event.type) &&
          this._applyPolicy(event, isButtonPressed)) {
        key = this._getLowerCaseKeyName(event);
        if (this.TRANSLATION_TABLE[key]) {
          suffix = (event.type.indexOf('keyup') > -1) ? '-release' : '-press';
          return this.TRANSLATION_TABLE[key] + suffix;
        }
      }
    }
  };

  exports.BrowserKeyEventManager = BrowserKeyEventManager;
}(window));
