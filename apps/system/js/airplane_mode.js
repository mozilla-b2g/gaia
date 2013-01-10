/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var AirplaneMode = {
  enabled: false,

  init: function apm_init() {
    if (!window.navigator.mozSettings)
      return;

    var mobileDataEnabled = false;
    SettingsListener.observe('ril.data.enabled', false, function(value) {
      mobileDataEnabled = value;
    });

    var bluetoothEnabled = false;
    SettingsListener.observe('bluetooth.enabled', false, function(value) {
      bluetoothEnabled = value;
    });

    var wifiEnabled = false;
    SettingsListener.observe('wifi.enabled', false, function(value) {
      wifiEnabled = value;
    });

    var geolocationEnabled = false;
    SettingsListener.observe('geolocation.enabled', false, function(value) {
      geolocationEnabled = value;
    });

    var bluetooth = window.navigator.mozBluetooth;
    var wifiManager = window.navigator.mozWifiManager;
    var mobileData = window.navigator.mozMobileConnection &&
      window.navigator.mozMobileConnection.data;
    var fmRadio = window.navigator.mozFMRadio;

    var restoreMobileData = false;
    var restoreBluetooth = false;
    var restoreWifi = false;
    var restoreGeolocation = false;
    // Note that we don't restore Wifi tethering when leaving airplane mode
    // because Wifi tethering can't be switched on before data connection is
    // established.

    var self = this;
    SettingsListener.observe('ril.radio.disabled', false, function(value) {
      if (value) {
        // Entering airplane mode.
        self.enabled = true;

        // Turn off mobile data
        // We toggle the mozSettings value here just for the sake of UI,
        // platform ril disconnects mobile data when
        // 'ril.radio.disabled' is true.
        if (mobileData) {
          restoreMobileData = mobileDataEnabled;
          if (mobileDataEnabled) {
            SettingsListener.getSettingsLock().set({
              'ril.data.enabled': false
            });
          }
        }

        // Turn off Bluetooth.
        if (bluetooth) {
          restoreBluetooth = bluetoothEnabled;
          if (bluetoothEnabled) {
            SettingsListener.getSettingsLock().set({
              'bluetooth.enabled': false
            });
          }
        }

        // Turn off Wifi.
        if (wifiManager) {
          restoreWifi = wifiEnabled;
          if (wifiEnabled) {
            SettingsListener.getSettingsLock().set({
              'wifi.enabled': false
            });
          }

          // Turn off Wifi tethering.
          SettingsListener.getSettingsLock().set({
            'tethering.wifi.enabled': false
          });
        }

        // Turn off Geolocation.
        restoreGeolocation = geolocationEnabled;
        if (geolocationEnabled) {
          SettingsListener.getSettingsLock().set({
            'geolocation.enabled': false
          });
        }

        // Turn off FM Radio.
        if (fmRadio && fmRadio.enabled)
          fmRadio.disable();

      } else {
        self.enabled = false;
        // Don't attempt to turn on mobile data if it's already on
        if (mobileData && !mobileDataEnabled && restoreMobileData) {
          SettingsListener.getSettingsLock().set({
            'ril.data.enabled': true
          });
        }

        // Don't attempt to turn on Bluetooth if it's already on
        if (bluetooth && !bluetooth.enabled && restoreBluetooth) {
          SettingsListener.getSettingsLock().set({
            'bluetooth.enabled': true
          });
        }

        // Don't attempt to turn on Wifi if it's already on
        if (wifiManager && !wifiManager.enabled && restoreWifi) {
          SettingsListener.getSettingsLock().set({
            'wifi.enabled': true
          });
        }

        // Don't attempt to turn on Geolocation if it's already on
        if (!geolocationEnabled && restoreGeolocation) {
          SettingsListener.getSettingsLock().set({
            'geolocation.enabled': true
          });
        }
      }
    });
  }
};

AirplaneMode.init();

