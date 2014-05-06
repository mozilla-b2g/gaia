define(function(require) {
  'use strict';
  var SettingsPanel = require('modules/settings_panel');
  var WifiAuth = require('panels/auth_wifi/auth_wifi');

  return function ctor_authWifi() {
    var wifiAuth = WifiAuth();
    return SettingsPanel({
      onInit: function(panel) {
        wifiAuth.onInit.call(wifiAuth, panel);
      },
      onBeforeShow: function(panel, options) {
        wifiAuth.onBeforeShow.call(wifiAuth, panel, options);
      },
      onBeforeHide: function() {
        wifiAuth.onBeforeHide.call(wifiAuth);
      }
    });
  };
});
