define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Root = require('panels/root/root');

  return function ctor_root_panel() {
    var root = Root();

    return SettingsPanel({
      onInit: function rp_onInit() {
        root.init();
      }
    });
  };
});
