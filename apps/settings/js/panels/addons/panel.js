define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var AddonsList = require('panels/addons/addons_list');

  return function ctor_addons_panel() {
    var view;

    return SettingsPanel({
      onInit: function(panel) {
        view = AddonsList(panel);
      },

      onBeforeShow: function() {
        view.render();
      },

      onBeforeHide: function() {
        view.teardown();
      }
    });
  };
});
