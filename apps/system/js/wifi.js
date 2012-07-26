/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Wifi = {
  init: function wf_init() {
    var wifiManager = window.navigator.mozWifiManager;
    if (!wifiManager)
      return;

    var settings = window.navigator.mozSettings;
    if (!settings)
      return;

    // Sync the wifi.enabled mozSettings value with real API
    // These code should be removed once this bug is fixed
    // https://bugzilla.mozilla.org/show_bug.cgi?id=729877
    SettingsListener.observe('wifi.enabled', true, function(value) {
      if (wifiManager.enabled == value)
        return;

      var req = wifiManager.setEnabled(value);
      req.onerror = function wf_enabledError() {
        // roll back the setting value to notify the UIs
        // that wifi has failed to enable/disable.
        settings.getLock().set({
          'wifi.enabled': !value
        });
      };
    });
  }
};

Wifi.init();
