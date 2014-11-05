/*
 * Handle Do not track panel functionality.
 * Including key migration and carry value for compatibility.
 *
 * @module DoNotTrack
 */
define(function(require) {
  'use strict';

  var SettingsCache = require('modules/settings_cache');

  var settings = Settings.mozSettings;
  /**
   * ENABLED_KEY: "privacy.donottrackheader.enabled"
   * VALUE_KEY    "privacy.donottrackheader.value"
   *
   *                ENABLED_KEY  VALUE_KEY
   * Do not track:     true         1
   * Track:            true         0
   * No preference:    false        N/A
   */
  var kEnabledKey = 'privacy.donottrackheader.enabled';
  var kValueKey = 'privacy.donottrackheader.value';

  var enabledMap = {
    '0': true,   // Track
    '1': true,   // Do not track
    '-1': false  // No preference
  };

  var DoNotTrack = function() {};

  DoNotTrack.prototype = {
    /* 
     * If 'privacy.donottrackheader.value' was not defined then
     * we're upgrading from 1.1 which did not have this key.
     * Set it according to the contents of
     * 'privacy.donottrackheader.enabled'.
     */
    keyMigration: function dnt_migration() {
      SettingsCache.getSettings(function(results) {
        if (results[kValueKey] === undefined) {
          var value = '-1';
          if (results[kEnabledKey] !== undefined) {
            value = results[kEnabledKey] ? '1' : '-1';
          }
          settings.createLock().set({ kValueKey: value });
        }
      });
    },

    /**
     * if 'privacy.donottrackheader.value' is changed,
     * carry the value to 'privacy.donottrackheader.enabled'.
     */
    carryKeyChange: function carryKeyChange() {
      settings.addObserver(kValueKey, function(result) {
        var enabled = enabledMap[result.settingValue];
        if (enabled === undefined) {
          console.warn('Invalid ' + kValueKey + ' value ' +
            result.settingValue);
          return;
        }

        var cset = {};
        cset[kEnabledKey] = enabled;
        var request = settings.createLock().set(cset);
        request.onerror = function set_onerror() {
          console.warn('Set ' + kEnabledKey + ' failed');
        };
      });
    }
  };

  return function ctor_do_not_track() {
    return new DoNotTrack();
  };
});
