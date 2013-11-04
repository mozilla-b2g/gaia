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

  element: document.querySelector('input[name="ril.radio.disabled"]'),

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

  /**
   * Called when the user interacts with the airplane_mode switch
   */
  handleEvent: function(e) {
    this.element.disabled = true;
  },

  init: function apm_init(settingsResult) {
    var mobileConnection = getMobileConnection();
    var wifiManager = WifiHelper.getWifiManager();
    var bluetooth = navigator.mozBluetooth;
    var settings = Settings.mozSettings;

    var geolocationCheckbox =
      document.querySelector('input[name="geolocation.enabled"]');
    geolocationCheckbox.onchange = function toggleGeo() {
      // 'geolocation.suspended' is always false if users toggle it manually.
      settings.createLock().set({
        'geolocation.suspended': false
      });
    };

    var self = this;

    // Disable airplane mode when we interact with it
    this.element.addEventListener('change', this);

    var enabled = {};
    var suspended = {};
    var deviceNames = [];

    // mobile connection
    if (mobileConnection) {
      deviceNames.push('ril.data');

      settings.addObserver('ril.data.enabled', function(e) {
        enabled['ril.data'] = e.settingValue;
        self.notify('ril.data.enabled');
      });

      enabled['ril.data'] = settingsResult['ril.data.enabled'] || false;
      suspended['ril.data'] = settingsResult['ril.data.suspended'] || false;
    }

    // bluetooth
    if (bluetooth) {
      deviceNames.push('bluetooth');

      // when bluetooth is really enabled, notify if needed
      window.addEventListener('bluetooth-adapter-added', function() {
        enabled['bluetooth.enabled'] = true;
        self.notify('bluetooth.enabled');
      });

      // when bluetooth is really disabled, notify if needed
      window.addEventListener('bluetooth-disabled', function() {
        enabled['bluetooth.enabled'] = false;
        self.notify('bluetooth.enabled');
      });

      enabled['bluetooth'] = bluetooth.enabled;
      suspended['bluetooth'] = settingsResult['bluetooth.suspended'] || false;
    }

    // wifi
    if (wifiManager) {
      deviceNames.push('wifi');

      // when wifi is really enabled, notify if needed
      window.addEventListener('wifi-enabled', function() {
        enabled['wifi'] = true;
        self.notify('wifi.enabled');
      });

      // when wifi is really disabled, notify if needed
      window.addEventListener('wifi-disabled', function() {
        enabled['wifi'] = false;
        self.notify('wifi.enabled');
      });

      enabled['wifi'] = wifiManager.enabled;
      suspended['wifi'] = settingsResult['wifi.suspended'] || false;
    }

    // geolocation
    deviceNames.push('geolocation');
    settings.addObserver('geolocation.enabled', function(e) {
      enabled['geolocation'] = e.settingValue;
      self.notify('geolocation.enabled');
    });
    enabled['geolocation'] = settingsResult['geolocation.enabled'] || false;
    suspended['geolocation'] = settingsResult['geolocation.suspended'] || false;

    // Observe the change of airplane mode
    settings.addObserver('ril.radio.disabled', function(e) {
      // Reset notification params
      self._ops = 0;
      self._doNotify = true;

      if (e.settingValue) {
        deviceNames.forEach(function(deviceName) {
          suspended[deviceName] = enabled[deviceName];
          if (enabled[deviceName])
            self._ops++;
        });
      } else {
        // Don't count if the device is already on
        deviceNames.forEach(function(deviceName) {
          if (!enabled[deviceName] && suspended[deviceName])
            self._ops++;
        });
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
      if (Settings.mozSettings) {
        Settings.getSettings(AirplaneMode.init.bind(AirplaneMode));
      }
      navigator.removeIdleObserver(idleObserver);
    }
  };
  navigator.addIdleObserver(idleObserver);
});
