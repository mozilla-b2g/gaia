'use strict';
/* global System */

(function(exports) {
  var BatteryManager = function(battery) {
    this._battery = battery;
  };
  BatteryManager.SUB_MODULES = ['PowerSaveHandler'];
  BatteryManager.EVENTS = [
    'levelchange',
    'homescreen-ready'
  ];

  System.create(BatteryManager, {}, {
    name: 'BatteryManager',
    EVENT_PREFIX: 'battery',
    TOASTER_TIMEOUT: 5000,
    TRANSITION_SPEED: 1.8,
    TRANSITION_FRACTION: 0.30,

    AUTO_SHUTDOWN_LEVEL: 0.00,
    EMPTY_BATTERY_LEVEL: 0.1,

    _notification: null,
    containerElement: document.getElementById('screen'),
    view: function() {
      return '<div id="battery" data-z-index-level="system-overlay">' +
              '<span class="icon-battery"></span>' +
              '<span class="battery-notification" data-l10n-id="battery-almost-empty"></span>' +
            '</div>';
    },

    getAllElements: function bm_getAllElements() {
      this.screen = document.getElementById('screen');
      this.overlay = document.getElementById('system-overlay');
      this.notification = document.getElementById('battery');
    },

    checkBatteryDrainage: function bm_checkBatteryDrainage() {
      var battery = this._battery;
      if (!battery) {
        return;
      }
      if (battery.level <= this.AUTO_SHUTDOWN_LEVEL && !battery.charging) {
        // Fire a event to inform sleepMenu perform shutdown.
        this.publish('shutdown');
      }
    },

    '_handle_homescreen-ready': function() {
      this.checkBatteryDrainage();
    },

    _start: function bm_init() {
      this.getAllElements();
      var battery = this._battery;
      if (battery) {
        battery.addEventListener('levelchange', this);
        battery.addEventListener('chargingchange', this);
      }

      this._screenOn = true;
      this._wasEmptyBatteryNotificationDisplayed = false;

      this.displayIfNecessary();
    },

    _handle_screenchange: function(evt) {
      this._screenOn = evt.detail.screenEnabled;
      this.displayIfNecessary();
    },

    _handle_levelchange: function() {
      var battery = this._battery;
      if (!battery) {
        return;
      }

      this.checkBatteryDrainage();
      this.displayIfNecessary();

      this.powerSaveHandler.onBatteryChange();
    },

    _handle_chargingchange: function() {
      this.powerSaveHandler.onBatteryChange();

      var battery = this._battery;
      // We turn the screen on if needed in order to let
      // the user knows the device is charging
      if (battery && battery.charging) {
        this.hide();
        this._wasEmptyBatteryNotificationDisplayed = false;

        if (!this._screenOn) {
          this.publish('requestwake', this, true);
        }
      } else {
        this.displayIfNecessary();
      }
      this.publish('chargingchange');
    },

    _shouldWeDisplay: function bm_shouldWeDisplay() {
      var battery = this._battery;
      if (!battery) {
        return false;
      }

      return (!this._wasEmptyBatteryNotificationDisplayed &&
          !battery.charging &&
          battery.level <= this.EMPTY_BATTERY_LEVEL &&
          this._screenOn);
    },

    displayIfNecessary: function bm_display() {
      if (! this._shouldWeDisplay()) {
        return;
      }

      this.overlay.classList.add('battery');

      this._wasEmptyBatteryNotificationDisplayed = true;

      if (this._toasterTimeout) {
        clearTimeout(this._toasterTimeout);
      }

      this._toasterTimeout = setTimeout(this.hide.bind(this),
          this.TOASTER_TIMEOUT);
    },

    hide: function bm_hide() {
      var overlayCss = this.overlay.classList;
      if (overlayCss.contains('battery')) {
        this.overlay.classList.remove('battery');
        this._toasterTimeout = null;
      }
    }
  });
  exports.BatteryManager = BatteryManager;
}(window));
