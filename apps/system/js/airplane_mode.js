/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var AirplaneMode = {
  // Reserve settings before turn on airplane mode
  previousSettings: {
    wifi: true,
    bluetooth: true
  },

  init: function apm_init() {
    var settings = window.navigator.mozSettings;
    if (!settings)
      return;

    var bluetooth = window.navigator.mozBluetooth;
    var wifiManager = window.navigator.mozWifiManager;

    // XXX: need a way to toggle Geolocation here
    // https://github.com/mozilla-b2g/gaia/issues/2833
    // https://bugzilla.mozilla.org/show_bug.cgi?id=777594

    var restoreBluetooth = false;
    var restoreWifi = false;

    SettingsListener.observe('ril.radio.disabled', false, function(value) {
      if (value) {
        // Entering airplane mode.

        // Turn off Bluetooth.
        if (bluetooth) {
          restoreBluetooth = bluetooth.enabled;
          if (bluetooth.enabled) {
            settings.getLock().set({
              'bluetooth.enabled': false
            });
          }
        }

        // Turn off Wifi.
        if (wifiManager) {
          restoreWifi = wifiManager.enabled;
          if (wifiManager.enabled) {
            settings.getLock().set({
              'wifi.enabled': false
            });
          }
        }

      } else {
        // Leaving airplane mode.

        // Don't attempt to turn on the Bluetooth if it's already on
        if (bluetooth && !bluetooth.enabled && restoreBluetooth) {
          settings.getLock().set({
            'bluetooth.enabled': true
          });
        }

        if (wifiManager && !wifiManager.enabled && restoreWifi) {
          settings.getLock().set({
            'wifi.enabled': true
          });
        }
      }
    });
  }
};

AirplaneMode.init();
