/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/**
 * This file manages airplane mode interaction within the settings app.
 * The airplane mode button is disabled when the user taps it.
 * We then determine the number of components that need to change,
 * and fire off an event only when all components are ready.
 */

'use strict';

var AirplaneMode = {

  /**
   * Counter for operstions before radiosafe event
   * Updated when we toggle radio mode
   * @private
   */
  _ops: 0,

  /**
   * Whether or not we are firing the event for airplane mode
   * @private
   */
  _doNotify: false,

  element: document.getElementById('airplaneMode-input'),

  /**
   * Enable the radio state
   */
  enableRadioSwitch: function() {
    this.element.disabled = false;
  },

  /**
   * Notifies apps that components are in a stable state
   * This waits until all components are enabled after changing airplane mode
   * @param {String} the setting name.
   */
  notify: function(name) {
    if (!this._doNotify)
      return;

    this._ops--;
    if (this._ops === 0) {
      this._doNotify = false;
      this.enableRadioSwitch();
    }
  },

  _initRadioSwitch: function() {
    var mobileConnections = window.navigator.mozMobileConnections;
    var self = this;
    var isError = false;
    var setCount = 0;

    var setRadioAfterReqsCalled = function(enabled) {
      if (setCount !== mobileConnections.length) {
        return;
      } else {
        if (isError) {
          setAirplaneModeEnabled(enabled);
        } else {
          SettingsListener.getSettingsLock().set(
            {'ril.radio.disabled': !enabled}
          );
        }
      }
    };

    var doSetRadioEnabled = function doSetRadioEnabled(i, enabled) {
      var conn = mobileConnections[i];
      var req = conn.setRadioEnabled(enabled);
      setCount++;

      req.onsuccess = function() {
        setRadioAfterReqsCalled(enabled);
      };
      req.onerror = function() {
        isError = true;
        setRadioAfterReqsCalled(enabled);
      };
    };

    var setRadioEnabled = function setRadioEnabled(i, enabled) {
      var conn = mobileConnections[i];
      if (conn.radioState !== 'enabling' &&
          conn.radioState !== 'disabling' &&
          conn.radioState !== null) {
        doSetRadioEnabled(i, enabled);
      } else {
        conn.addEventListener('radiostatechange',
          function radioStateChangeHandler() {
            if (conn.radioState == 'enabling' ||
                conn.radioState == 'disabling' ||
                conn.radioState == null) {
              return;
            }
            conn.removeEventListener('radiostatechange',
              radioStateChangeHandler);
            doSetRadioEnabled(i, enabled);
        });
      }
    };

    var setAirplaneModeEnabled = function setAirplaneModeEnabled(enabled) {
      isError = false;
      setCount = 0;
      // set airplane mode `true`
      // means setRadioEnabled `false`
      enabled = !enabled;
      if (mobileConnections.length == 1) {
        setRadioEnabled(0, enabled);
      } else {
        setRadioEnabled(0, enabled);
        setRadioEnabled(1, enabled);
      }
    };

    SettingsListener.observe('ril.radio.disabled', false, function(value) {
      self.element.disabled = false;
      self.element.checked = value;
    });

    this.element.addEventListener('change', function(e) {
      this.disabled = true;
      setAirplaneModeEnabled(this.checked);
    });
  },

  init: function apm_init() {
    var mobileConnection = getMobileConnection();
    var wifiManager = WifiHelper.getWifiManager();
    var nfcManager = getNfc();

    var settings = Settings.mozSettings;
    if (!settings)
      return;

    var self = this;
    this._initRadioSwitch();

    var mobileDataEnabled = false;
    settings.addObserver('ril.data.enabled', function(e) {
      mobileDataEnabled = e.settingValue;
      self.notify('ril.data.enabled');
    });

    var bluetoothEnabled = false;
    var wifiEnabled = false;
    var geolocationEnabled = false;
    var nfcEnabled = false;
    settings.addObserver('geolocation.enabled', function(e) {
      geolocationEnabled = e.settingValue;
      self.notify('geolocation.enabled');
    });

    // when wifi is really enabled, notify if needed
    window.addEventListener('wifi-enabled', function() {
      wifiEnabled = true;
      self.notify('wifi.enabled');
    });

    // when wifi is really disabled, notify if needed
    window.addEventListener('wifi-disabled', function() {
      wifiEnabled = false;
      self.notify('wifi.enabled');
    });

    if (window.gBluetooth) {
      // when bluetooth is really enabled, notify if needed
      window.addEventListener('bluetooth-adapter-added', function() {
        bluetoothEnabled = true;
        self.notify('bluetooth.enabled');
      });

      // when bluetooth is really disabled, notify if needed
      window.addEventListener('bluetooth-disabled', function() {
        bluetoothEnabled = false;
        self.notify('bluetooth.enabled');
      });
    }
    settings.addObserver('nfc.enabled', function(e) {
      nfcEnabled = e.settingValue;
      self.notify('nfc.enabled');
    });


    var restoreMobileData = false;
    var restoreBluetooth = false;
    var restoreWifi = false;
    var restoreGeolocation = false;
    var restoreNfc = false;

    settings.addObserver('ril.radio.disabled', function(e) {
      // Reset notification params
      self._ops = 0;
      self._doNotify = true;

      if (e.settingValue) {
        if (mobileConnection) {
          restoreMobileData = mobileDataEnabled;
          if (mobileDataEnabled)
            self._ops++;
        }

        // Bluetooth.
        if (window.gBluetooth) {
          restoreBluetooth = bluetoothEnabled;
          if (bluetoothEnabled)
            self._ops++;
        }

        // Wifi.
        if (wifiManager) {
          restoreWifi = wifiEnabled;
          if (wifiEnabled)
            self._ops++;
        }

        // Geolocation
        restoreGeolocation = geolocationEnabled;
        if (geolocationEnabled)
          self._ops++;

        // NFC
        restoreNfc = nfcEnabled;
        if (nfcManager) {
          self._ops++;
        }

      } else {
        // Don't count mobile data if it's already on
        if (mobileConnection && !mobileDataEnabled && restoreMobileData)
          self._ops++;

        // Don't count Bluetooth if it's already on
        if (window.gBluetooth && !gBluetooth.enabled && restoreBluetooth)
          self._ops++;

        // Don't count Wifi if it's already on
        if (wifiManager && !wifiManager.enabled && restoreWifi)
          self._ops++;

        // Don't count Geolocation if it's already on
        if (!geolocationEnabled && restoreGeolocation)
          self._ops++;

        // Don't count NFC if it's already on
        if (nfcManager && !nfcEnabled && restoreNfc)
          self._ops++;
      }

      // If we have zero operations to perform, enable the radio switch
      if (self._ops === 0)
        self.enableRadioSwitch();
    });
  }
};

// starting when we get a chance
navigator.mozL10n.ready(function loadWhenIdle() {
  var idleObserver = {
    time: 5,
    onidle: function() {
      AirplaneMode.init();
      navigator.removeIdleObserver(idleObserver);
    }
  };
  navigator.addIdleObserver(idleObserver);
});
