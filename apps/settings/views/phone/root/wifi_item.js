define(function(require) {
  'use strict';

  var WifiContext = require('modules/wifi_context');

  function WifiItem(element) {
    this._enabled = false;
    this._boundUpdateWifiDesc = this._updateWifiDesc.bind(this, element);
  }

  WifiItem.prototype = {
    set enabled(value) {
      if (value === this._enabled || !navigator.mozWifiManager) {
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
      element.setAttribute('data-l10n-id', WifiContext.wifiStatusText.id);
      if (WifiContext.wifiStatusText.args) {
        element.setAttribute('data-l10n-args',
          JSON.stringify(WifiContext.wifiStatusText.args));
      } else {
        element.removeAttribute('data-l10n-args');
      }
      // Bug 1217717 enable the Airplane mode interaction
      // once the wifi panel is ready
      window.dispatchEvent(new CustomEvent('wificontext-ready'));
    }
  };

  return function ctor_wifiItem(element) {
    return new WifiItem(element);
  };
});
