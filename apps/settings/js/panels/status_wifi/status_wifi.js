define(function(require) {
  'use strict';
  var _ = navigator.mozL10n.get;
  var WifiHelper = require('shared/wifi_helper');

  var WifiStatus = function() {
    return {
      onInit: function(panel) {
        this._elements = {};
        this._elements.ip = panel.querySelector('[data-ip]');
        this._elements.speed = panel.querySelector('[data-speed]');
        this._elements.ssid = panel.querySelector('[data-ssid]');
        this._elements.signal = panel.querySelector('[data-signal]');
        this._elements.security = panel.querySelector('[data-security]');
        this._gWifiManager = WifiHelper.getWifiManager();
      },
      onBeforeShow: function(panel, options) {
        this._updateNetworkInfo();
        this._elements.ssid.textContent = options.network.ssid;
        this._elements.signal.textContent =
          _('signalLevel' + options.network.sl);
        this._elements.security.textContent =
          options.security || _('securityNone');

        this._gWifiManager.connectionInfoUpdate = this._updateNetworkInfo;
      },
      onBeforeHide: function() {
        this._gWifiManager.connectionInfoUpdate = null;
      },
      _updateNetworkInfo: function() {
        var info = this._gWifiManager.connectionInformation || {};
        this._elements.ip.textContent = info.ipAddress || '';
        this._elements.speed.textContent = _('linkSpeedMbs', {
          linkSpeed: info.linkSpeed
        });
      }
    };
  };
  return WifiStatus;
});
