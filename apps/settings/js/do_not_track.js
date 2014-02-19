/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals Settings */

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
  var kEnabledKey = 'privacy.donottrackheader.enabled';
  var kValueKey = 'privacy.donottrackheader.value';

  var settings = Settings.mozSettings;
  if (!settings) {
    return;
  }

  var valueLock = settings.createLock();
  var valueReq = valueLock.get(kValueKey);

  valueReq.onsuccess = function() {
    if (this.result[kValueKey] === undefined) {
      /* If 'privacy.donottrackheader.value' was not defined then we're
       * upgrading from 1.1 which did not have this key. Set it according to
       * the contents of 'privacy.donottrackheader.enabled'. */
      var enabledLock = settings.createLock();
      var enabledReq = enabledLock.get(kEnabledKey);

      enabledReq.onsuccess = function() {
        var value = '-1';

        if (this.result[kEnabledKey] !== undefined) {
          value = this.result[kEnabledKey] ? '1' : '-1';
        }

        settings.createLock().set({ kValueKey: value });

        // Update the appropriate node
        var rule = 'input[name="' + kValueKey + '"]' +
                   '[value="' + value + '"]';
        var node = document.querySelector(rule);

        node.checked = true;
      };
    }
  };

  var enabledMap = {
    '0': true,   // Track
    '1': true,   // Do not track
    '-1': false  // No preference
  };
  settings.addObserver(kValueKey, function(result) {
    var enabled = enabledMap[result.settingValue];
    if (enabled === undefined) {
      console.warn('Invalid ' + kValueKey + ' value ' + result.settingValue);
      return;
    }

    var lock = settings.createLock();
    var cset = {};
    cset[kEnabledKey] = enabled;
    var request = lock.set(cset);
    request.onerror = function set_onerror() {
      console.warn('Set ' + kEnabledKey + ' failed');
    };
  });
})();
