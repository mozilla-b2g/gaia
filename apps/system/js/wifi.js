/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Wifi = {
  wifiWakeLocked: false,

  wifiEnabled: true,

  init: function wf_init() {
    window.addEventListener('screenchange', this);

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

      // Let's quietly turn off wifi if there is no wake lock and
      // the screen is off.
      if (!ScreenManager.screenEnabled && !self.wifiWakeLocked)
        wifiManager.setEnabled(false);
    });
  },

  handleEvent: function wifi_handleEvent(evt) {
    var wifiManager = window.navigator.mozWifiManager;
    if (!wifiManager)
      return;

    switch (evt.type) {
      case 'screenchange':
        var screenEnabled = evt.detial.screenEnabled;

        // Let's quietly turn off wifi if there is no wake lock and
        // the screen is off.
        if (!screenEnabled && !this.wifiWakeLocked)
          wifiManager.setEnabled(false);

        // ... and quietly turn it back on when the screen is on
        if (screenEnabled && this.wifiEnabled)
          wifiManager.setEnabled(true);

        break;
    }
  }
};

Wifi.init();
