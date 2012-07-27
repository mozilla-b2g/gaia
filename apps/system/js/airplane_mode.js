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

    var geolocationEnabled = false;
    SettingsListener.observe('geolocation.enabled', false, function(value) {
      geolocationEnabled = value;
    });

    var bluetooth = window.navigator.mozBluetooth;
    var wifiManager = window.navigator.mozWifiManager;
    var mobileData = window.navigator.mozMobileConnection &&
      window.navigator.mozMobileConnection.data;

    var restoreMobileData = false;
    var restoreBluetooth = false;
    var restoreWifi = false;
    var restoreGeolocation = false;

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

        // Turn off Geolocation
        restoreGeolocation = geolocationEnabled;
        if (geolocationEnabled) {
          settings.getLock().set({
            'geolocation.enabled': false
          });
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

        // Don't attempt to turn on Geolocation if it's already on
        if (!geolocationEnabled && restoreGeolocation) {
          settings.getLock().set({
            'geolocation.enabled': true
          });
        }
      }
    });
  }
};

AirplaneMode.init();
