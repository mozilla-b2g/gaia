/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var AirplaneMode = {
  // Reserve settings before turn on airplane mode
  previousSettings: {
    wifi: true,
    bluetooth: true
  },

  init: function bt_init() {
    var self = this;
    SettingsListener.observe('ril.radio.disabled', false, function(value) {
      var settings = navigator.mozSettings;
      if (settings) {
        if (value) {
          // Turn on airplane mode
          // Turn off Bluetooth and Wifi.
          // Data will be turn off automatically since the radio is off.
          var bluetoothReq = settings.getLock().get('bluetooth.enabled');
          bluetoothReq.onsuccess = function bt_EnabledSuccess() {
            self.previousSettings.bluetooth =
                bluetoothReq.result['bluetooth.enabled'];
            settings.getLock().set({'bluetooth.enabled': false});
          };
          var wifiReq = settings.getLock().get('wifi.enabled');
          wifiReq.onsuccess = function wf_EnabledSuccess() {
            self.previousSettings.wifi = wifiReq.result['wifi.enabled'];
            settings.getLock().set({'wifi.enabled': false});
          };
        } else {
          // Turn off airplane mode
          // Turn on all services that was enabled before.
          if (self.previousSettings.bluetooth) {
            settings.getLock().set({'bluetooth.enabled': true});
          }
          if (self.previousSettings.wifi) {
            settings.getLock().set({'wifi.enabled': true});
          }
        }
      }
    });
  }
};

AirplaneMode.init();
