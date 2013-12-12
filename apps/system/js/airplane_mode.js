/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var AirplaneMode = {
  _enabled: null,
  set enabled(value) {
    if (value !== this._enabled) {
      var mobileConnections = window.navigator.mozMobileConnections;
      var self = this;
      var reqsCalled = [];
      var reqsResult = [];

      // inner function
      var notTrue = function isNotTrue(called) {
        return called !== true;
      };

      var setRadioAfterReqsCalled = function() {
        // we have to make sure all requests got executed
        if (reqsCalled.length !== mobileConnections.length) {
          return;
        }

        // it means enabling/disabling one of mobileConnections failed
        // we have to restore to original status
        if (reqsResult.some(notTrue)) {
          self._enabled = !value;
          for (var i = 0; i < mobileConnections.length; i++) {
            mobileConnections[i].setRadioEnabled(self._enabled);
          }
        } else {
          // else if all requests all work as our what we expect
          // we have to change 'ril.radio.disabled'
          // to reflect UI change on Gaia
          self._enabled = value;
          SettingsListener.getSettingsLock().set(
            {'ril.radio.disabled': self._enabled}
          );
        }
      };

      var doSetRadioEnabled = function doSetRadioEnabled(enabled, index) {
        var req = mobileConnections[index].setRadioEnabled(enabled);
        reqsResult = [];
        reqsCalled = [];

        req.onsuccess = function onReqSuccess() {
          reqsResult.push(true);
          reqsCalled.push(true);
          setRadioAfterReqsCalled();
        };

        req.onerror = function onReqError() {
          reqsResult.push(false);
          reqsCalled.push(true);
          setRadioAfterReqsCalled();
        };
      };

      // we will enable each connection separately
      for (var i = 0; i < mobileConnections.length; i++) {
        var conn = mobileConnections[i];
        if (conn.radioState !== 'enabling' &&
            conn.radioState !== 'disabling') {
          doSetRadioEnabled(!value, i);
        } else {
          conn.addEventListener('radiostatechange',
            (function(i) {
              return function radioStateChangeHandler() {
                if (conn.radioState == 'enabling' ||
                    conn.radioState == 'disabling') {
                  return;
                }
                conn.removeEventListener('radiostatechange',
                  radioStateChangeHandler);
                doSetRadioEnabled(!value, i);
              };
            })(i)
          );
        }
      }
    }
  },

  get enabled() {
    return this._enabled;
  },

  init: function apm_init() {
    if (!window.navigator.mozSettings)
      return;

    var settings = {
      // mozSetting state for Data connection, Bluetooth, Wifi, GPS
      'ril.data.enabled': false,
      'bluetooth.enabled': false,
      'wifi.enabled': false,
      'geolocation.enabled': false,
      'nfc.enabled': false,

      // remember the mozSetting states before the airplane mode disables them
      'ril.data.suspended': false,
      'bluetooth.suspended': false,
      'wifi.suspended': false,
      'geolocation.suspended': false,
      'nfc.suspended': false
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

    var mozSettings = window.navigator.mozSettings;
    var bluetooth = window.navigator.mozBluetooth;
    var wifiManager = window.navigator.mozWifiManager;
    var fmRadio = window.navigator.mozFMRadio;
    var mobileData = window.navigator.mozMobileConnections[0] &&
      window.navigator.mozMobileConnections[0].data;

    // Note that we don't restore Wifi tethering when leaving airplane mode
    // because Wifi tethering can't be switched on before data connection is
    // established.

    var self = this;
    function updateStatus(value) {
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

        // Turn off NFC
        suspend('nfc');

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

        if (!settings['nfc.enabled']) {
          restore('nfc');
        }
      }
    }

    // Initialize radio state
    var request = SettingsListener.getSettingsLock().get('ril.radio.disabled');
    request.onsuccess = function() {
      var enabled = !!request.result['ril.radio.disabled'];
      // See bug 933659
      // Gecko stops using the settings key 'ril.radio.disabled' to turn
      // off RIL radio. We need to remove the code that checks existence of the
      // new API after bug 856553 lands.
      self.enabled = enabled;
    };

    // Observe settings changes
    mozSettings.addObserver('ril.radio.disabled', function(e) {
      updateStatus(e.settingValue);
    });
  }
};


if (document && (document.readyState === 'complete' ||
                 document.readyState === 'interactive')) {
  setTimeout(AirplaneMode.init.bind(AirplaneMode));
} else {
  window.addEventListener('load', function onload() {
    window.removeEventListener('load', onload);
    AirplaneMode.init();
  });
}
