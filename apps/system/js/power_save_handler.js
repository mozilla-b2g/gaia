/* global BaseModule, NotificationHelper, SettingsListener, MozActivity */
/* jshint nonew: false */
'use strict';
(function(exports) {
  var PowerSaveHandler = function(batteryManager) {
    this.batteryManager = batteryManager;
    this.battery = batteryManager.battery;
  };
  PowerSaveHandler.prototype = Object.create(BaseModule.prototype);
  PowerSaveHandler.prototype.constructor = PowerSaveHandler;
  PowerSaveHandler.SETTINGS = [
    'powersave.enabled',
    'wifi.enabled',
    'ril.data.enabled',
    'bluetooth.enabled',
    'geolocation.enabled',
    'powersave.threshold'
  ];
  var prototype = {
    _states: {
      'geolocation.enabled' : false,
      'ril.data.enabled' : false,
      'bluetooth.enabled' : false,
      'wifi.enabled' : false
    },
    'name': 'PowerSaveHandler',
    '_observe_powersave.enabled': function(value) {
      var enabled = value;
      if (enabled) {
        this.enablePowerSave();
      } else {
        this.disablePowerSave();
      }
      this._powerSaveEnabled = enabled;
    },
    '_observe_geolocation.enabled': function(value) {
      this._states['geolocation.enabled'] = value;
    },
    '_observe_ril.data.enabled': function(value) {
      this._states['ril.data.enabled'] = value;
    },
    '_observe_bluetooth.enabled': function(value) {
      this._states['bluetooth.enabled'] = value;
    },
    '_observe_wifi.enabled': function(value) {
      this._states['wifi.enabled'] = value;
    },

    _start: function() {
      this._powerSaveResume = {};
      this._powerSaveEnabled = false;
      this._powerSaveEnabledLock = false;
    },

    // XXX Break down obj keys in a for each loop because mozSettings
    // does not currently supports multiple keys in one set()
    // https://bugzilla.mozilla.org/show_bug.cgi?id=779381
    setMozSettings: function(keypairs) {
      var setlock = SettingsListener.getSettingsLock();
      for (var key in keypairs) {
        var obj = {};
        obj[key] = keypairs[key];
        setlock.set(obj);
      }
    },

    enablePowerSave: function() {
      // Keep the original states of various modules
      for (var j in this._states) {
        this._powerSaveResume[j] = this._states[j];
      }

      var settingsToSet = {
        // Turn off Wifi
        'wifi.enabled' : false,
        // Turn off Data
        'ril.data.enabled' : false,
        // Turn off Bluetooth
        'bluetooth.enabled' : false,
        // Turn off Geolocation
        'geolocation.enabled' : false
      };

      this.setMozSettings(settingsToSet);

      this._powerSaveEnabledLock = false;
    },

    disablePowerSave: function() {
      var settingsToSet = {};

      for (var state in this._powerSaveResume) {
        if (this._powerSaveResume[state] === true) {
          settingsToSet[state] = true;
        }
      }

      this.setMozSettings(settingsToSet);
    },

    showPowerSavingNotification: function() {
      var _ = navigator.mozL10n.get;

      var clickCB = function() {
        new MozActivity({
          name: 'configure',
          data: {
            target: 'device',
            section: 'battery'
          }
        });
      };

      NotificationHelper.send(_('notification-powersaving-mode-on-title'),
                              _('notification-powersaving-mode-on-description'),
                              'style/icons/Power_saving_mode.png',
                              clickCB);
    },

    onBatteryChange: function() {
      var battery = this.battery;

      if (battery.charging) {
        if (this._powerSaveEnabled) {
          this.setMozSettings({'powersave.enabled' : false});
        }
      }
    },

    '_observe_powersave.threshold': function(value) {
      // If 'turn on automatically' is set to 'never', don't change the
      // power saving state
      if (value == -1) {
        return;
      }

      if (this.battery.level <= value && !this._powerSaveEnabled) {
        this.setMozSettings({'powersave.enabled' : true});
        if (!this._powerSaveEnabledLock) {
          this.showPowerSavingNotification();
          this._powerSaveEnabledLock = true;
        }
        return;
      }

      if (this.battery.level > value && this._powerSaveEnabled) {
        this.setMozSettings({'powersave.enabled' : false});
        return;
      }
    }
  };
  BaseModule.mixin(PowerSaveHandler.prototype, prototype);
  exports.PowerSaveHandler = PowerSaveHandler;
}(window));
