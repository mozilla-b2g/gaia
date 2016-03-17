define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');

  function ScreenLockItem(element) {
    this._itemEnabled = false;
    this._lockscreenEnable = false;
    this._lockscreenEnableEvent = 'lockscreen.enabled';
    this._lockscreenPasscodeEnableEvent = 'lockscreen.passcode-lock.enabled';
    this._element = element;
    this._boundUpdateEnable = this._updateEnable.bind(this);
    this._boundUpdatePasscodeEnable = this._updatePasscodeEnable.bind(this);
  }

  ScreenLockItem.prototype = {
    set enabled(value) {
      if (value === this._itemEnabled) {
        return;
      } else {
        this._itemEnabled = value;
        if (this._itemEnabled) {
          SettingsListener.observe(this._lockscreenEnableEvent, false,
            this._boundUpdateEnable);
          SettingsListener.observe(this._lockscreenPasscodeEnableEvent, false,
            this._boundUpdatePasscodeEnable);
        } else {
          SettingsListener.unobserve(this._lockscreenEnableEvent,
            this._boundUpdateEnable);
          SettingsListener.unobserve(this._lockscreenPasscodeEnableEvent,
            this._boundUpdatePasscodeEnable);
        }
      }
    },

    get enabled() {
      return this._itemEnabled;
    },

    _updateEnable: function sl_updateEnable(enabled) {
      this._lockscreenEnable = enabled;
      var l10nId = enabled ? 'screenLock-enabled-with-no-passcode' : 'disabled';
      this._element.setAttribute('data-l10n-id', l10nId);
    },

    _updatePasscodeEnable: function sl_updatePasscodeEnable(enabled) {
      var l10nId = 'disabled';
      if (this._lockscreenEnable) {
        l10nId = enabled ?
          'screenLock-enabled-with-passcode' :
          'screenLock-enabled-with-no-passcode';
      }
      this._element.setAttribute('data-l10n-id', l10nId);
    }
  };

  return function ctor_screen_lock_item(element) {
    return new ScreenLockItem(element);
  };
});
