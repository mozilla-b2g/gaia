/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var AirplaneMode = {
  // Reserve settings before turn on airplane mode
  reservedSettings: {
    data: true,
    wifi: true,
    bluetooth: true,

    // reserve for geolocation
    geolocation: false
  },

  init: function bt_init() {
    var self = this;
    SettingsListener.observe('ril.radio.disabled', false, function(value) {
      var settings = navigator.mozSettings;
      if (settings) {
        if (value) {
          // Flight mode ON
          // Turn off data, bluetooth, wifi
          var reqData = settings.getLock().get('ril.data.enabled');
          reqData.onsuccess = function sm_EnabledFetched() {
            self.reservedSettings.data = reqData.result['ril.data.enabled'];
            settings.getLock().set({'ril.data.enabled': false});
          };
          var reqBt = settings.getLock().get('bluetooth.enabled');
          reqBt.onsuccess = function bt_EnabledSuccess() {
            self.reservedSettings.bluetooth = reqBt.result['bluetooth.enabled'];
            settings.getLock().set({'bluetooth.enabled': false});
          };
          var reqWifi = settings.getLock().get('wifi.enabled');
          reqWifi.onsuccess = function wf_EnabledSuccess() {
            self.reservedSettings.wifi = reqWifi.result['wifi.enabled'];
            settings.getLock().set({'wifi.enabled': false});
          };
        } else {
          // Flight mode OFF
          // Turn on all services that was enabled before.
          if (self.reservedSettings.data) {
            settings.getLock().set({'ril.data.enabled': true});
          }
          if (self.reservedSettings.bluetooth) {
            settings.getLock().set({'bluetooth.enabled': true});
          }
          if (self.reservedSettings.wifi) {
            settings.getLock().set({'wifi.enabled': true});
          }
        }
      }
    });
  }
};
AirplaneMode.init();
