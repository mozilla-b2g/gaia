define(function(require) {
  'use strict';

  var WifiContext = require('modules/wifi_context');
  var wifiManager = navigator.mozWifiManager;

  function WifiItem(element) {
    this._enabled = false;
    this._boundUpdateWifiDesc = this._updateWifiDesc.bind(this, element);
  }

  WifiItem.prototype = {
    set enabled(value) {
      if (value === this._enabled || !wifiManager) {
        return;
      }

      this._enabled = value;
      if (this._enabled) {
        this._boundUpdateWifiDesc();
        WifiContext.addEventListener('wifiStatusTextChange',
          this._boundUpdateWifiDesc);
      } else {
        WifiContext.removeEventListener('wifiStatusTextChange',
          this._boundUpdateWifiDesc);
      }
    },

    get enabled() {
      return this._enabled;
    },

    _updateWifiDesc: function root_updateWifiDesc(element) {
      element.textContent = WifiContext.wifiStatusText;
    }
  };

  return function ctor_wifiItem(element) {
    return new WifiItem(element);
  };
});
