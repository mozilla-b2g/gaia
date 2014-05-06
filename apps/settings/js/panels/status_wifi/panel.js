define(function(require) {
  'use strict';
  var SettingsPanel = require('modules/settings_panel');
  var WifiStatus = require('panels/status_wifi/status_wifi');

  return function ctor_statusWifi() {
    var wifiStatus = WifiStatus();

    return SettingsPanel({
      onInit: function(panel) {
        wifiStatus.onInit.call(wifiStatus, panel);
      },
      onBeforeShow: function(panel, options) {
        wifiStatus.onBeforeShow.call(wifiStatus, panel, options);
      },
      onBeforeHide: function() {
        wifiStatus.onBeforeHide.call(wifiStatus);
      }
    });
  };
});
