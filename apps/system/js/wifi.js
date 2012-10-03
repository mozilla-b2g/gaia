/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Wifi = {
  wifiWakeLocked: false,

  wifiEnabled: true,

  wifiDisabledByWakelock: false,

  // Without wake lock, wait for kOffTime ms and turn wifi off
  // after the conditions are met.
  kOffTime: 60 * 1000,

  _offTimer: null,

  init: function wf_init() {
    window.addEventListener('screenchange', this);

    var battery = window.navigator.battery;
    battery.addEventListener('chargingchange', this);

    if (!window.navigator.mozSettings)
      return;

    // If wifi is turned off by us and phone got rebooted,
    // bring wifi back.
    var name = 'wifi.disabled_by_wakelock';
    var req = SettingsListener.getSettingsLock().get(name);
    req.onsuccess = function gotWifiDisabledByWakelock() {
      if (!req.result[name])
        return;

      // Re-enable wifi and reset wifi.disabled_by_wakelock
      var lock = SettingsListener.getSettingsLock();
      lock.set({ 'wifi.enabled': true });
      lock.set({ 'wifi.disabled_by_wakelock': false });
    };

    var self = this;
    var wifiManager = window.navigator.mozWifiManager;

    // Track the wifi.enabled mozSettings value
    SettingsListener.observe('wifi.enabled', true, function(value) {
      if (!wifiManager && value) {
        self.wifiEnabled = false;

        // roll back the setting value to notify the UIs
        // that wifi interface is not available
        if (value) {
          SettingsListener.getSettingsLock().set({
            'wifi.enabled': false
          });
        }

        return;
      }

      self.wifiEnabled = value;
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
    if (!battery || !wifiManager ||
        (!this.wifiEnabled && !this.wifiDisabledByWakelock))
      return;

    var lock = SettingsListener.getSettingsLock();

    // Let's quietly turn off wifi if there is no wake lock and
    // the screen is off and we are not on a power source.
    if (!ScreenManager.screenEnabled &&
        !this.wifiWakeLocked && !battery.charging) {

      // We don't need to do anything if wifi is not enabled currently
      if (!this.wifiEnabled)
        return;

      // Start with a timer, only turn off wifi till timeout
      this._offTimer = setTimeout(function wifiOffTimeout() {
        // Actually turn off the wifi
        lock.set({ 'wifi.enabled': false });

        // Remember that it was turned off by us.
        this.wifiDisabledByWakelock = true;

        // Keep this value in disk so if the phone reboots we'll
        // be able to turn the wifi back on.
        lock.set({ 'wifi.disabled_by_wakelock': true });
      }, this.kOffTime);
    }
    // ... and quietly turn it back on or cancel the timer otherwise
    else {
      clearTimeout(this._offTimer);

      // We don't need to do anything if we didn't disable wifi at first place.
      if (!this.wifiDisabledByWakelock)
        return;

      // turn wifi back on.
      lock.set({ 'wifi.enabled': true });

      this.wifiDisabledByWakelock = false;
      lock.set({ 'wifi.disabled_by_wakelock': false });
    }
  }
};

Wifi.init();
