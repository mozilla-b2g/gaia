'use strict';
/* global BaseModule */
/* global ScreenManager */
/* global BatteryIcon */
/* global LazyLoader */

(function() {
  function BatteryOverlay() {
    LazyLoader.load(['js/battery_icon.js']).then(function() {
      this.icon = new BatteryIcon(this);
      this.icon.start();
    }.bind(this)).catch(function(err) {
      console.error(err);
    });
  }
  BatteryOverlay.SUB_MODULES = [
    'PowerSave'
  ];

  BaseModule.create(BatteryOverlay, {
    name: 'BatteryOverlay',
    TOASTER_TIMEOUT: 5000,
    TRANSITION_SPEED: 1.8,
    TRANSITION_FRACTION: 0.30,

    AUTO_SHUTDOWN_LEVEL: 0.00,
    EMPTY_BATTERY_LEVEL: 0.1,

    _battery: window.navigator.battery,
    _notification: null,

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
        window.dispatchEvent(new CustomEvent('batteryshutdown'));
      }
    },

    _start: function bm_init() {
      this.getAllElements();
      var battery = this._battery;
      if (battery) {
        // When the device is booted, check if the battery is drained. If so,
        // batteryshutdown would be triggered to inform sleepMenu shutdown.
        this.checkBatteryDrainage.bind(this);

        battery.addEventListener('levelchange', this);
        battery.addEventListener('chargingchange', this);
      }
      window.addEventListener('screenchange', this);

      this._screenOn = true;
      this._wasEmptyBatteryNotificationDisplayed = false;

      this.displayIfNecessary();
    },

    handleEvent: function bm_handleEvent(evt) {
      var battery = this._battery;

      switch (evt.type) {
        case 'screenchange':
          this._screenOn = evt.detail.screenEnabled;
          this.displayIfNecessary();
          break;

        case 'levelchange':
          if (!battery) {
            return;
          }

          this.checkBatteryDrainage();
          this.displayIfNecessary();

          this.powerSave && this.powerSave.onBatteryChange();
          this.icon && this.icon.update();
          break;
        case 'chargingchange':
          this.powerSave && this.powerSave.onBatteryChange();
          this.icon && this.icon.update();

          // We turn the screen on if needed in order to let
          // the user knows the device is charging

          if (battery && battery.charging) {
            this.hide();
            this._wasEmptyBatteryNotificationDisplayed = false;

            if (!this._screenOn) {
              ScreenManager.turnScreenOn();
            }
          } else {
            this.displayIfNecessary();
          }
          break;
      }
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
      if (!this._shouldWeDisplay()) {
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

}());
