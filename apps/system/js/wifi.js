/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Wifi = {
  wifiWakeLocked: false,

  wifiEnabled: true,

  // Without wake lock, wait for kOffTime ms and turn wifi off
  // after the conditions are met.
  kOffTime: 60 * 1000,

  _offTimer: null,

  init: function wf_init() {
    window.addEventListener('screenchange', this);

    var battery = window.navigator.battery;
    battery.addEventListener('chargingchange', this);

    var self = this;
    var settings = window.navigator.mozSettings;
    if (!settings)
      return;

    var wifiManager = window.navigator.mozWifiManager;

    // Sync the wifi.enabled mozSettings value with real API
    // These code should be rewritten once this bug is fixed
    // https://bugzilla.mozilla.org/show_bug.cgi?id=729877
    SettingsListener.observe('wifi.enabled', true, function(value) {
      if (!wifiManager) {
        self.wifiEnabled = false;

        // roll back the setting value to notify the UIs
        // that wifi interface is not available
        if (value) {
          settings.getLock().set({
            'wifi.enabled': false
          });
        }
        return;
      }

      self.wifiEnabled = value;

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

    var power = navigator.mozPower;
    power.addWakeLockListener(function wifi_handleWakeLock(topic, state) {
      if (topic !== 'wifi')
        return;

      self.wifiWakeLocked = (state == 'locked-foreground' ||
                             state == 'locked-background');

      self.maybeToggleWifi();
    });
  },

  handleEvent: function wifi_handleEvent(evt) {
    this.maybeToggleWifi();
  },

  // Check the status of screen, wifi wake lock and power source
  // and turn on/off wifi accordingly
  maybeToggleWifi: function wifi_maybeToggleWifi() {
    var battery = window.navigator.battery;
    var wifiManager = window.navigator.mozWifiManager;
    if (!battery || !wifiManager || !this.wifiEnabled)
      return;

    // Let's quietly turn off wifi if there is no wake lock and
    // the screen is off and we are not on a power source.
    if (!ScreenManager.screenEnabled &&
        !this.wifiWakeLocked && !battery.charging) {
      this._offTimer = setTimeout(function wifiOffTimeout() {
        wifiManager.setEnabled(false);
      }, this.kOffTime);
    }
    // ... and quietly turn it back on otherwise
    else {
      clearTimeout(this._offTimer);
      wifiManager.setEnabled(true);
    }
  }
};

Wifi.init();
