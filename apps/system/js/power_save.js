'use strict';
/* global batteryOverlay, MozActivity, NotificationHelper,
   SettingsListener */

(function(exports) {

  function PowerSave() {}

  PowerSave.prototype = {
    _powerSaveResume: {},

    _powerSaveEnabled: false,

    _states: {
      'wifi.enabled': false,
      'ril.data.enabled': false,
      'bluetooth.enabled': false,
      'geolocation.enabled': false
    },

    _powerSaveEnabledLock: false,

    start: function() {
      SettingsListener.observe('powersave.enabled', false, value => {
        var enabled = value;
        if (enabled) {
          this.enablePowerSave();
        } else {
          this.disablePowerSave();
        }
        this._powerSaveEnabled = enabled;
      });

      SettingsListener.observe('powersave.threshold', -1, value => {
        this.doCheckThreshold(value);
      });

      function getState(state, value) {
        /* jshint validthis: true */
        this._states[state] = value;
      }

      // Monitor the states of various modules
      for (var j in this._states) {
        SettingsListener.observe(j, true, getState.bind(this, j));
      }
    },

    // XXX Break down obj keys in a for each loop because mozSettings
    // does not currently supports multiple keys in one set()
    // https://bugzilla.mozilla.org/show_bug.cgi?id=779381
    setMozSettings: function(keypairs) {
      var setlock = SettingsListener.getSettingsLock();
      for (var key in keypairs) {
        // not set bluetooth key because we'll handle it separately
        // for API compatibility
        if ('bluetooth.enabled' !== key) {
          var obj = {};
          obj[key] = keypairs[key];
          setlock.set(obj);
        }
      }
    },

    enablePowerSave: function() {
      // Keep the original states of various modules
      for (var j in this._states) {
        this._powerSaveResume[j] = this._states[j];
      }

      var settingsToSet = {
        // Turn off Wifi
        'wifi.enabled': false,
        // Turn off Data
        'ril.data.enabled': false,
        // Turn off Geolocation
        'geolocation.enabled': false
      };

      this.setMozSettings(settingsToSet);
      // Turn off Bluetooth
      window.dispatchEvent(new CustomEvent('request-disable-bluetooth'));

      this._powerSaveEnabledLock = false;
    },

    disablePowerSave: function() {
      var settingsToSet = {};

      for (var state in this._powerSaveResume) {
        if (this._powerSaveResume[state] === true) {
          settingsToSet[state] = true;
        }
      }
      if (this._powerSaveResume['bluetooth.enabled'] === true) {
        // Turn on Bluetooth
        window.dispatchEvent(new CustomEvent('request-enable-bluetooth'));
      }

      this.setMozSettings(settingsToSet);
    },

    showPowerSavingNotification: function() {
      var clickCB = function() {
        var activityRequest = new MozActivity({
          name: 'configure',
          data: {
            target: 'device',
            section: 'battery'
          }
        });
        activityRequest.onsuccess = () => {};
      };

      NotificationHelper.send('notification-powersaving-mode-on-title', {
        'bodyL10n': 'notification-powersaving-mode-on-description',
        'icon': 'style/icons/Power_saving_mode.png',
        'mozbehavior': {
          showOnlyOnce: true
        }
      }).then(function(notification) {
        notification.addEventListener('click', clickCB);
      });
    },

    checkThreshold: function() {
      var key = 'powersave.threshold';
      var lock = navigator.mozSettings.createLock();
      var req = lock.get(key);
      req.onerror = function(e) {
        console.error('Error while quering setting ' + key + ': ' + e);
      };

      req.onsuccess = (function() {
        this.doCheckThreshold(req.result[key] || -1);
      }).bind(this);
    },

    doCheckThreshold: function(value) {
      var battery = batteryOverlay._battery;

      // If 'turn on automatically' is set to 'never', don't change the
      // power saving state
      if (value == -1) {
        return;
      }

      if (battery.level <= value && !this._powerSaveEnabled) {
        this.setMozSettings({
          'powersave.enabled': true
        });
        if (!this._powerSaveEnabledLock) {
          this.showPowerSavingNotification();
          this._powerSaveEnabledLock = true;
        }
        return;
      }

      if (battery.level > value && this._powerSaveEnabled) {
        this.setMozSettings({
          'powersave.enabled': false
        });
        return;
      }
    },

    onBatteryChange: function() {
      var battery = batteryOverlay._battery;

      if (battery.charging) {
        if (this._powerSaveEnabled) {
          this.setMozSettings({
            'powersave.enabled': false
          });
        }

        return;
      }

      this.checkThreshold();
    }
  };

  exports.PowerSave = PowerSave;

}(window));
