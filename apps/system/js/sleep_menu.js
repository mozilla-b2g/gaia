/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SleepMenu = {
  // Indicate setting status of ril.radio.disabled
  isFlightModeEnabled: false,

  // Indicate setting status of volume
  isSilentModeEnabled: false,

  // Reserve settings before turn on flight mode
  reservedSettings: {
    data: true,
    wifi: true,
    bluetooth: true,

    // reserve for geolocation
    geolocation: false
  },

  // XXX: bug#766895
  // https://bugzilla.mozilla.org/show_bug.cgi?id=766895
  turnOffFlightMode: function sm_turnOffFlightMode() {
    var settings = navigator.mozSettings;
    if (settings && this.reservedSettings.data) {
      settings.getLock().set({'ril.data.disabled': this.reservedSettings.data});
    }

    var wifiManager = navigator.mozWifiManager;
    if (wifiManager && this.reservedSettings.wifi && !wifiManager.enabled) {
      wifiManager.setEnabled(true);
    }

    var bluetooth = navigator.mozBluetooth;
    if (bluetooth && this.reservedSettings.bluetooth && !bluetooth.enabled) {
      bluetooth.setEnabled(true);
    }
  },

  turnOnFlightMode: function sm_turnOnFlightMode() {
    var settings = navigator.mozSettings;
    var self = this;
    if (settings) {
      var req = settings.getLock().get('ril.data.disabled');
      req.onsuccess = function sm_EnabledFetched() {
        self.reservedSettings.data = req.result['ril.data.disabled'];
        settings.getLock().set({'ril.data.disabled': true});
      };
    }

    var wifiManager = navigator.mozWifiManager;
    if (wifiManager) {
      this.reservedSettings.wifi = wifiManager.enabled;
      wifiManager.setEnabled(false);
    }

    var bluetooth = navigator.mozBluetooth;
    if (bluetooth) {
      this.reservedSettings.bluetooth = bluetooth.enabled;
      bluetooth.setEnabled(false);
    }
  },

  init: function sm_init() {
    window.addEventListener('holdsleep', this.show.bind(this));
  },

  // Generate items
  generateItems: function sm_generateItems() {
    var items = [];
    var settings = window.navigator.mozSettings;
    var _ = navigator.mozL10n.get;
    var options = {
      airplane: {
        label: _('airplane'),
        value: 'airplane',
        icon: '/style/sleep_menu/images/airplane.png'
      },
      airplaneOff: {
        label: _('airplaneOff'),
        value: 'airplane'
      },
      silent: {
        label: _('silent'),
        value: 'silent',
        icon: '/style/sleep_menu/images/vibration.png'
      },
      silentOff: {
        label: _('normal'),
        value: 'silentOff'
      },
      restart: {
        label: _('restart'),
        value: 'restart',
        icon: '/style/sleep_menu/images/power-off.png'
      },
      power: {
        label: _('power'),
        value: 'power',
        icon: '/style/sleep_menu/images/restart.png'
      }
    };

    if (this.isFlightModeEnabled) {
      items.push(options.airplaneOff);
    } else {
      items.push(options.airplane);
    }

    if (!this.isSilentModeEnabled) {
      items.push(options.silent);
    } else {
      items.push(options.silentOff);
    }

    items.push(options.restart);
    items.push(options.power);

    return items;
  },

  show: function sm_show() {
    var self = this;
    ListMenu.request(this.generateItems(), function(action) {
      self.handler(action);
    });
  },

  handler: function sm_handler(action) {
    switch (action) {
      case 'airplane':
        // Airplane mode should turn off
        //
        // Radio ('ril.radio.disabled'`)
        // Data ('ril.data.disabled'`)
        // Wifi
        // Bluetooth
        // Geolocation
        //
        // It should also save the status of the latter 4 items
        // so when leaving the airplane mode we could know which one to turn on.

        var settings = window.navigator.mozSettings;
        if (settings) {
          this.isFlightModeEnabled = !this.isFlightModeEnabled;

          if (this.isFlightModeEnabled) {
            this.turnOnFlightMode();
          } else {
            this.turnOffFlightMode();
          }

          settings.getLock().set({
            'ril.radio.disabled': this.isFlightModeEnabled
          });
        }
        break;

      // About silent and silentOff
      // * Turn on silent mode will cause:
      //   * Turn off ringtone no matter if ring is on or off
      //   * for sms and incoming calls.
      // * Turn off silent mode will cause:
      //   * Turn on ringtone no matter if ring is on or off
      //   * for sms and incoming calls.
      case 'silent':
        var settings = window.navigator.mozSettings;
        if (settings) {
          settings.getLock().set({'phone.ring.incoming': false});
          settings.getLock().set({'sms.ring.received': false});
          this.isSilentModeEnabled = true;
        }
        break;

      case 'silentOff':
        var settings = window.navigator.mozSettings;
        if (settings) {
          settings.getLock().set({'phone.ring.incoming': true});
          settings.getLock().set({'sms.ring.received': true});
          this.isSilentModeEnabled = false;
        }
        break;

      case 'restart':
        navigator.mozPower.reboot();
        break;

      case 'power':
        navigator.mozPower.powerOff();
        break;
    }
  }
};
