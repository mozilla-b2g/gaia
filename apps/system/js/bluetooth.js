/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Bluetooth = {
  init: function bt_init() {
    var bluetooth = window.navigator.mozBluetooth;
    if (!bluetooth)
      return;

    var settings = window.navigator.mozSettings;
    if (!settings)
      return;

    // Sync the bluetooth.enabled mozSettings value with real API
    // These code should be removed once this bug is fixed
    // https://bugzilla.mozilla.org/show_bug.cgi?id=777665
    SettingsListener.observe('bluetooth.enabled', true, function(value) {
      if (bluetooth.enabled == value)
        return;

      var req = bluetooth.setEnabled(value);
      req.onerror = function bt_enabledError() {
        // roll back the setting value to notify the UIs
        // that bluetooth has failed to enable.
        settings.getLock().set({
          'bluetooth.enabled': !value
        });
      };
    });
  }
};

Bluetooth.init();
