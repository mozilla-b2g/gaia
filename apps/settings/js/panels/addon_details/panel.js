define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var AddonDetails = require('panels/addon_details/addon_details');

  return function ctor_addon_details_panel() {
    var details;

    return SettingsPanel({
      onInit: function(panel) {
      },

      onBeforeShow: function(panel, options) {
        details = AddonDetails(panel);
        details.render(options.addon);
      },

      onBeforeHide: function() {
        // XXX: any event handlers to remove?
      }
    });
  };
});
