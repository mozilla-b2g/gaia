define(function(require) {
  'use strict';

  var _ = navigator.mozL10n.get;
  var SettingsPanel = require('modules/settings_panel');
  var WifiHelper = require('shared/wifi_helper');
  var wifiManager = WifiHelper.getWifiManager();

  return function ctor_statusWifi() {
    var elements = {};

    return SettingsPanel({
      onInit: function(panel) {
        elements = {};
        elements.ip = panel.querySelector('[data-ip]');
        elements.speed = panel.querySelector('[data-speed]');
        elements.ssid = panel.querySelector('[data-ssid]');
        elements.signal = panel.querySelector('[data-signal]');
        elements.security = panel.querySelector('[data-security]');
      },
      onBeforeShow: function(panel, options) {
        this._updateNetworkInfo();
        elements.ssid.textContent = options.network.ssid;
        elements.signal.textContent = _('signalLevel' + options.sl);
        elements.security.textContent = options.security || _('securityNone');
        wifiManager.onconnectioninfoupdate = this._updateNetworkInfo;
      },
      onBeforeHide: function() {
        wifiManager.onconnectioninfoupdate = null;
      },
      _updateNetworkInfo: function() {
        var info = wifiManager.connectionInformation || {};
        elements.ip.textContent = info.ipAddress || '';
        elements.speed.textContent = _('linkSpeedMbs', {
          linkSpeed: info.linkSpeed
        });
      }
    });
  };
});
