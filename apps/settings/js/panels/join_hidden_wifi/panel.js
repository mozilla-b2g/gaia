define(function(require) {
  'use strict';
  var SettingsPanel = require('modules/settings_panel');
  var WifiJoinHidden = require('panels/join_hidden_wifi/join_hidden_wifi');
  return function ctor_joinHiddenWifi() {
    var wifiJoinHidden = WifiJoinHidden();

    return SettingsPanel({
      onInit: function(panel, options) {
        wifiJoinHidden.onInit.call(wifiJoinHidden, panel, options);
      },
      onBeforeShow: function(panel, options) {
        wifiJoinHidden.onBeforeShow.call(wifiJoinHidden, panel, options);
      },
      onBeforeHide: function() {
        wifiJoinHidden.onBeforeHide.call(wifiJoinHidden);
      }
    });
  };
});
