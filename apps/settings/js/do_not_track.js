/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * ENABLED_KEY: "privacy.donottrackheader.enabled"
 * VALUE_KEY    "privacy.donottrackheader.value"

 *                ENABLED_KEY  VALUE_KEY
 * Do not track:     true         1
 * Track:            true         0
 * No preference:    false        N/A
 */
(function() {
  var settings = Settings.mozSettings;
  if (!settings)
    return;

  var enabledMap = {
    '0': true,   // Track
    '1': true,   // Do not track
    '-1': false  // No preference
  };
  settings.addObserver('privacy.donottrackheader.value', function(result) {
    var enabled = enabledMap[result.settingValue];
    if (enabled == null)
      return;

    var lock = settings.createLock();
    var cset = {
      'privacy.donottrackheader.enabled': enabled
    };
    var request = lock.set(cset);
    request.onerror = function set_onerror() {
      console.warn('Set privacy.donottrackheader.enabled failed');
    };
  });
})();
