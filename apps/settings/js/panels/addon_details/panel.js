define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var AddonDetails = require('panels/addon_details/addon_details');

  return function ctor_addon_details_panel() {
    var details;

    return SettingsPanel({
      onInit: function(panel) {
        details = AddonDetails(panel);
      },

      onBeforeShow: function(panel, options) {
        details.render(options.addon);
      }
    });
  };
});
