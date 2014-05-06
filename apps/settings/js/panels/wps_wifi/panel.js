define(function(require) {
  'use strict';
  var SettingsPanel = require('modules/settings_panel');
  var WifiWps = require('panels/wps_wifi/wps_wifi');

  return function ctor_wpsWifi() {
    var wifiWps = WifiWps();

    return SettingsPanel({
      onInit: function(panel) {
        wifiWps.onInit.call(wifiWps, panel);
      },
      onBeforeShow: function(panel, options) {
        wifiWps.onBeforeShow.call(wifiWps, panel, options);
      },
      onBeforeHide: function() {

      }
    });
  };
});
