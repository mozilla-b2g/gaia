/**
 * Used to show Privacy/Do Not Track panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var DoNotTrackModule = require('panels/do_not_track/do_not_track');

  return function ctor_do_not_track_panel() {
    var doNotTrack = DoNotTrackModule();

    return SettingsPanel({
      onInit: function(panel) {
        doNotTrack.keyMigration();
        doNotTrack.carryKeyChange();
      }
    });
  };
});
