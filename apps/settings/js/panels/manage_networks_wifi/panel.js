define(function(require) {
  'use strict';
  var SettingsPanel = require('modules/settings_panel');
  var WifiManageNetworks =
    require('panels/manage_networks_wifi/manage_networks_wifi');

  return function ctor_manage_networks_wifi_panel() {
    var wifiManageNetworks = WifiManageNetworks();

    return SettingsPanel({
      onInit: function(panel) {
        wifiManageNetworks.onInit.call(wifiManageNetworks, panel);
      },
      onBeforeShow: function(panel) {
        wifiManageNetworks.onBeforeShow.call(wifiManageNetworks, panel);
      },
      onBeforeHide: function() {

      }
    });
  };
});
