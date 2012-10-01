/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var BatteryManager = {
  TOASTER_TIMEOUT: 5000,
  TRANSITION_SPEED: 1.8,
  TRANSITION_FRACTION: 0.30,

  _notification: null,
  _screenOn: true,

  getAllElements: function bm_getAllElements() {
    this.screen = document.getElementById('screen');
    this.overlay = document.getElementById('system-overlay');
    this.notification = document.getElementById('battery');
  },

  init: function bm_init() {
    this.getAllElements();
    var battery = window.navigator.battery;
    if (battery) {
      battery.addEventListener('levelchange', this);
      battery.addEventListener('chargingchange', this);
    }
    window.addEventListener('screenchange', this);
    this._toasterGD = new GestureDetector(this.notification);
    ['mousedown', 'swipe'].forEach(function(evt) {
      this.notification.addEventListener(evt, this);
    }, this);
  },

  handleEvent: function bm_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        this._screenOn = evt.detail.screenEnabled;
        break;

      case 'levelchange':
        var battery = window.navigator.battery;
        if (!battery)
          return;

        if (this._screenOn) {
          var level = Math.floor(battery.level * 10) * 10;
          this.notification.dataset.level = level;
          if (level == 10 || level == 30 || level == 100)
            this.display();
        }

        PowerSaveHandler.onBatteryChange();
        break;
      case 'chargingchange':
        PowerSaveHandler.onBatteryChange();
        break;

      case 'mousedown':
        this.mousedown(evt);
        break;
      case 'swipe':
        this.swipe(evt);
        break;
    }
  },

  display: function bm_display() {
    var overlayClass = this.overlay.classList;
    var notificationClass = this.notification.classList;

    overlayClass.add('battery');
    notificationClass.add('visible');
    this._toasterGD.startDetecting();

    if (this._toasterTimeout)
      clearTimeout(this._toasterTimeout);

    this._toasterTimeout = setTimeout((function() {
      overlayClass.remove('battery');
      notificationClass.remove('visible');
      this._toasterTimeout = null;
      this._toasterGD.stopDetecting();
    }).bind(this), this.TOASTER_TIMEOUT);
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
      self.notification.classList.remove('visible');
      self.notification.classList.remove('disappearing');
      self.overlay.classList.remove('battery');
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
  }

  function disablePowerSave() {

    var settingsToSet = {};

    for (var state in _powerSaveResume) {
      if (_powerSaveResume[state] == true)
        settingsToSet[state] = true;
    }

    setMozSettings(settingsToSet);
  }

  function onBatteryChange() {
    var battery = window.navigator.battery;

    if (battery.charging) {
      if (_powerSaveEnabled)
        setMozSettings({'powersave.enabled' : false});

      return;
    }

    SettingsListener.observe('powersave.threshold', 0,
      function getThreshold(value) {
        if (battery.level <= value && !_powerSaveEnabled) {
          setMozSettings({'powersave.enabled' : true});
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
