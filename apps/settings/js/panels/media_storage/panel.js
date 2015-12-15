/**
 * Used to show Media Storage panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var MediaStorage = require('panels/media_storage/media_storage');

  return function ctor_media_storage_panel() {
    return SettingsPanel({
      onInit: function() {
        //XXX should further refactor in Bug 973451
        MediaStorage.init();
      }
    });
  };
});
