/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var AirplaneMode = {
  init: function apm_init() {
    var settings = window.navigator.mozSettings;
    if (!settings)
      return;

    var mobileDataEnabled = false;
    SettingsListener.observe('ril.data.enabled', false, function(value) {
      mobileDataEnabled = value;
    });

    var bluetooth = window.navigator.mozBluetooth;
    var wifiManager = window.navigator.mozWifiManager;
    var mobileData = window.navigator.mozMobileConnection &&
      window.navigator.mozMobileConnection.data;

    // XXX: need a way to toggle Geolocation here
    // https://github.com/mozilla-b2g/gaia/issues/2833
    // https://bugzilla.mozilla.org/show_bug.cgi?id=777594

    var restoreMobileData = false;
    var restoreBluetooth = false;
    var restoreWifi = false;

    SettingsListener.observe('ril.radio.disabled', false, function(value) {
      if (value) {
        // Entering airplane mode.

        // Turn off mobile data
        // We toggle the mozSettings value here just for the sake of UI,
        // platform ril dissconnects mobile data when
        // 'ril.radio.disabled' is true.
        if (mobileData) {
          restoreMobileData = mobileDataEnabled;
          if (mobileDataEnabled) {
            settings.getLock().set({
              'ril.data.enabled': false
            });
          }
        }

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

        // Don't attempt to turn on mobile data if it's already on
        if (mobileData && !mobileDataEnabled && restoreMobileData) {
          settings.getLock().set({
            'ril.data.enabled': true
          });
        }

        // Don't attempt to turn on Bluetooth if it's already on
        if (bluetooth && !bluetooth.enabled && restoreBluetooth) {
          settings.getLock().set({
            'bluetooth.enabled': true
          });
        }

        // Don't attempt to turn on Wifi if it's already on
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
