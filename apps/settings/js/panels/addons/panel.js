define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Addons = require('panels/addons/addons');

  return function ctor_themes() {
    var addons = Addons();

    return SettingsPanel({
      onInit: function(panel) {
        addons.onInit(panel);
      },
      onBeforeShow: function() {
        addons.onBeforeShow();
      }
    });
  };
});
