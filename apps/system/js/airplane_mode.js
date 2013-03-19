/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var AirplaneMode = {
  enabled: false,

  init: function apm_init() {
    if (!window.navigator.mozSettings)
      return;

    var settings = {
      // mozSetting state for Data connection, Bluetooth, Wifi, GPS
      'ril.data.enabled': false,
      'bluetooth.enabled': false,
      'wifi.enabled': false,
      'geolocation.enabled': false,

      // remember the mozSetting states before the airplane mode disables them
      'ril.data.suspended': false,
      'bluetooth.suspended': false,
      'wifi.suspended': false,
      'geolocation.suspended': false
    };

    // observe the corresponding mozSettings
    for (var key in settings) {
      (function(settingID) {
        SettingsListener.observe(settingID, false, function(value) {
          settings[settingID] = value;
        });
      })(key);
    }

    // turn off the mozSetting corresponding to `key'
    // and remember its initial state by storing it in another setting
    function suspend(key) {
      var enabled = settings[key + '.enabled'];
      var suspended = settings[key + '.suspended'];
      if (suspended)
        return;

      // remember the state before switching it to false
      var sset = {};
      sset[key + '.suspended'] = enabled;
      SettingsListener.getSettingsLock().set(sset);

      // switch the state to false if necessary
      if (enabled) {
        var eset = {};
        eset[key + '.enabled'] = false;
        SettingsListener.getSettingsLock().set(eset);
      }
    }

    // turn on the mozSetting corresponding to `key'
    // if it has been suspended by the airplane mode
    function restore(key) {
      var suspended = settings[key + '.suspended'];

      // clear the 'suspended' state
      var sset = {};
      sset[key + '.suspended'] = false;
      SettingsListener.getSettingsLock().set(sset);

      // switch the state to true if it was suspended
      if (suspended) {
        var rset = {};
        rset[key + '.enabled'] = true;
        SettingsListener.getSettingsLock().set(rset);
      }
    }

    var bluetooth = window.navigator.mozBluetooth;
    var wifiManager = window.navigator.mozWifiManager;
    var mobileData = window.navigator.mozMobileConnection &&
      window.navigator.mozMobileConnection.data;
    var fmRadio = window.navigator.mozFMRadio;

    // Note that we don't restore Wifi tethering when leaving airplane mode
    // because Wifi tethering can't be switched on before data connection is
    // established.

    var self = this;
    SettingsListener.observe('ril.radio.disabled', false, function(value) {
      if (value) {
        // Entering airplane mode.
        self.enabled = true;

        // Turn off mobile data:
        // we toggle the mozSettings value here just for the sake of UI,
        // platform RIL disconnects mobile data when
        // 'ril.radio.disabled' is true.
        if (mobileData) {
          suspend('ril.data');
        }

        // Turn off Bluetooth.
        if (bluetooth) {
          suspend('bluetooth');
        }

        // Turn off Wifi and Wifi tethering.
        if (wifiManager) {
          suspend('wifi');
          SettingsListener.getSettingsLock().set({
            'tethering.wifi.enabled': false
          });
        }

        // Turn off Geolocation.
        suspend('geolocation');

        // Turn off FM Radio.
        if (fmRadio && fmRadio.enabled) {
          fmRadio.disable();
        }
      } else {
        // Leaving airplane mode.
        self.enabled = false;

        // Don't attempt to turn on mobile data if it's already on
        if (mobileData && !settings['ril.data.enabled']) {
          restore('ril.data');
        }

        // Don't attempt to turn on Bluetooth if it's already on
        if (bluetooth && !bluetooth.enabled) {
          restore('bluetooth');
        }

        // Don't attempt to turn on Wifi if it's already on
        if (wifiManager && !wifiManager.enabled) {
          restore('wifi');
        }

        // Don't attempt to turn on Geolocation if it's already on
        if (!settings['geolocation.enabled']) {
          restore('geolocation');
        }
      }
    });
  }
};

AirplaneMode.init();

