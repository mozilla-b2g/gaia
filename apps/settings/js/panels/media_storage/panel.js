/**
 * Used to show Storage/Media Storage panel
 */
define(function(require) {
  'use strict';
  var SettingsPanel = require('modules/settings_panel');
  // var MediaStorage = require('modules/media_storage');
  var MediaStorage = require('panels/media_storage/media_storage');

  return function ctor_media_storage_panel() {
    var media_storage = MediaStorage();
    return SettingsPanel({
      onInit: function(panel) {
        media_storage.init();
      }
    });
  };
});
