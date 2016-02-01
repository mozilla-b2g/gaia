/**
 * Used to show Cellular and Data panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Carrier = require('panels/carrier/carrier');

  return function ctor_media_storage_panel() {
    return SettingsPanel({
      onInit: function() {
        //XXX should further refactor the panel
        Carrier.init();
      }
    });
  };
});
