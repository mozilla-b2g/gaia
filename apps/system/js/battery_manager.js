/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var BatteryManager = {
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
    if (!battery)
      return;
    if (battery.level <= this.AUTO_SHUTDOWN_LEVEL && !battery.charging) {
      // Fire a event to inform SleepMenu perform shutdown.
      window.dispatchEvent(new CustomEvent('batteryshutdown'));
    }
  },

  init: function bm_init() {
    this.getAllElements();
    var battery = this._battery;
    if (battery) {
      // When the device is booted, check if the battery is drained.
      // If so, batteryshutdown would be triggered to inform SleepMenu shutdown.
      window.addEventListener('homescreen-ready',
                              this.checkBatteryDrainage.bind(this));

      battery.addEventListener('levelchange', this);
      battery.addEventListener('chargingchange', this);
    }
    window.addEventListener('screenchange', this);
    this._toasterGD = new GestureDetector(this.notification);
    ['mousedown', 'swipe'].forEach(function(evt) {
      this.notification.addEventListener(evt, this);
    }, this);

    this._screenOn = true;
    this._wasEmptyBatteryNotificationDisplayed = false;

    this.displayIfNecessary();
  },

  handleEvent: function bm_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        this._screenOn = evt.detail.screenEnabled;
        this.displayIfNecessary();
        break;

      case 'levelchange':
        var battery = this._battery;
        if (!battery)
          return;

        this.checkBatteryDrainage();
        this.displayIfNecessary();

        PowerSaveHandler.onBatteryChange();
        break;
      case 'chargingchange':
        PowerSaveHandler.onBatteryChange();

        var battery = this._battery;
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

      case 'mousedown':
        this.mousedown(evt);
        break;
      case 'swipe':
        this.swipe(evt);
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
    if (! this._shouldWeDisplay()) {
      return;
    }

    // we know it's here, it's checked in shouldWeDisplay()
    var level = this._battery.level;

    this.overlay.classList.add('battery');

    this._toasterGD.startDetecting();
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
      this._toasterGD.stopDetecting();
    }
  },

  // Swipe handling
  mousedown: function bm_mousedown(evt) {
    evt.preventDefault();
    this._containerWidth = this.overlay.clientWidth;
  },

  swipe: function bm_swipe(evt) {
    var detail = evt.detail;
    var distance = detail.start.screenX - detail.end.screenX;
    var fastEnough = Math.abs(detail.vx) > this.TRANSITION_SPEED;
    var farEnough = Math.abs(distance) >
      this._containerWidth * this.TRANSITION_FRACTION;

    // If the swipe distance is too short or swipe speed is too slow,
    // do nothing.
    if (!(farEnough || fastEnough))
      return;

    var self = this;
    this.notification.addEventListener('animationend', function animationend() {
      self.notification.removeEventListener('animationend', animationend);
      self.notification.classList.remove('disappearing');
      self.hide();
    });
    this.notification.classList.add('disappearing');
  }
};

var PowerSaveHandler = (function PowerSaveHandler() {

  var _powerSaveResume = {};
  var _powerSaveEnabled = false;
  var _states = {
    'wifi.enabled' : false,
    'ril.data.enabled' : false,
    'bluetooth.enabled' : false,
    'geolocation.enabled' : false
  };

  var _powerSaveEnabledLock = false;

  function init() {
    SettingsListener.observe('powersave.enabled', false,
      function sl_getPowerSave(value) {
        var enabled = value;
        if (enabled) {
          enablePowerSave();
        } else {
          disablePowerSave();
        }
        _powerSaveEnabled = enabled;
      });

    // Monitor the states of various modules
    for (var j in _states) {
      SettingsListener.observe(j, true, function getState(state, value) {
        _states[state] = value;
      }.bind(null, j));
    }
  }

  // XXX Break down obj keys in a for each loop because mozSettings
  // does not currently supports multiple keys in one set()
  // https://bugzilla.mozilla.org/show_bug.cgi?id=779381
  function setMozSettings(keypairs) {
    var setlock = SettingsListener.getSettingsLock();
    for (var key in keypairs) {
      var obj = {};
      obj[key] = keypairs[key];
      setlock.set(obj);
    }
  }

  function enablePowerSave() {
    // Keep the original states of various modules
    for (var j in _states) {
      _powerSaveResume[j] = _states[j];
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

    setMozSettings(settingsToSet);

    _powerSaveEnabledLock = false;
  }

  function disablePowerSave() {

    var settingsToSet = {};

    for (var state in _powerSaveResume) {
      if (_powerSaveResume[state] == true)
        settingsToSet[state] = true;
    }

    setMozSettings(settingsToSet);
  }

  function showPowerSavingNotification() {
    var _ = navigator.mozL10n.get;

    var clickCB = function() {
      var activityRequest = new MozActivity({
        name: 'configure',
        data: {
          target: 'device',
          section: 'battery'
        }
      });
    };

    NotificationHelper.send(_('notification-powersaving-mode-on-title'),
                            _('notification-powersaving-mode-on-description'),
                            'style/icons/System.png',
                            clickCB);
  }

  function onBatteryChange() {
    var battery = BatteryManager._battery;

    if (battery.charging) {
      if (_powerSaveEnabled)
        setMozSettings({'powersave.enabled' : false});

      return;
    }

    SettingsListener.observe('powersave.threshold', -1,
      function getThreshold(value) {
        // If 'turn on automatically' is set to 'never', don't change the
        // power saving state
        if (value == -1)
          return;

        if (battery.level <= value && !_powerSaveEnabled) {
          setMozSettings({'powersave.enabled' : true});
          if (!_powerSaveEnabledLock) {
            showPowerSavingNotification();
            _powerSaveEnabledLock = true;
          }
          return;
        }

        if (battery.level > value && _powerSaveEnabled) {
          setMozSettings({'powersave.enabled' : false});
          return;
        }
    });
  }

  return {
    init: init,
    onBatteryChange: onBatteryChange
  };
})();

// init PowerSaveHandler first, since it will be used by BatteryManager
PowerSaveHandler.init();
BatteryManager.init();
