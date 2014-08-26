define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');

  function ScreenLockItem(element) {
    this._itemEnabled = false;
    this._observedKey = 'lockscreen.enabled';
    this._element = element;
    this._boundUpdateUI = this._updateUI.bind(this);
  }
  
  ScreenLockItem.prototype = {
    set enabled(value) {
      if (value === this._itemEnabled) {
        return;
      } else {
        this._itemEnabled = value;
        if (this._itemEnabled) {
          SettingsListener.observe(this._observedKey, false,
            this._boundUpdateUI);
        } else {
          SettingsListener.unobserve(this._observedKey, this._boundUpdateUI);
        }
      }
    },

    get enabled() {
      return this._itemEnabled;
    },

    _updateUI: function sl_updateUI(enabled) {
      var l10nId = enabled ? 'enabled' : 'disabled';
      this._element.setAttribute('data-l10n-id', l10nId);
    }
  };

  return function ctor_screen_lock_item(element) {
    return new ScreenLockItem(element);
  };
});
