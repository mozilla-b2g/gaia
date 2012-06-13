/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var StatusBar = {
  init: function sb_init() {
    // XXX: is this the correct way to probe language changes?
    SettingsListener.observe('language.current', 'en-US',
      (function localeChanged(value) {
        this.updateConnection();
      }).bind(this)
    );

    this.getAllElements();

    window.addEventListener('screenchange', this);
    this.addListeners();

    this.updateClock();
    this.updateBattery();
    this.updateConnection();
    this.updateWifi();
  },

  handleEvent: function sb_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        if (evt.detail.screenEnabled) {
          this.addListeners();
        } else {
          this.removeListeners();
        }
        break;

      case 'chargingchange':
      case 'levelchange':
      case 'statuschange':
        this.updateBattery();
        break;

      case 'cardstatechange':
      case 'voicechange':
      case 'datachange':
        this.updateConnection();
        break;
    }
  },

  addListeners: function sb_addListeners() {
    var battery = window.navigator.mozBattery;
    if (battery) {
      battery.addEventListener('chargingchange', this);
      battery.addEventListener('levelchange', this);
      battery.addEventListener('statuschange', this);
    }

    var conn = window.navigator.mozMobileConnection;
    if (conn && conn.voice) {
      conn.addEventListener('cardstatechange', this);
      conn.addEventListener('voicechange', this);
      conn.addEventListener('datachange', this);
    }

    var wifi = window.navigator.mozWifiManager;
    if (wifi)
      wifi.connectionInfoUpdate = (this.updateWifi).bind(this);
  },

  removeListeners: function sb_removeListeners(evt) {
    var battery = window.navigator.mozBattery;
    if (battery) {
      battery.removeEventListener('chargingchange', this);
      battery.removeEventListener('levelchange', this);
      battery.removeEventListener('statuschange', this);
    }

    var conn = window.navigator.mozMobileConnection;
    if (conn && conn.voice) {
      conn.removeEventListener('cardstatechange', this);
      conn.removeEventListener('voicechange', this);
      conn.removeEventListener('datachange', this);
    }

    var wifi = window.navigator.mozWifiManager;
    if (wifi)
      wifi.connectionInfoUpdate = null;

    clearTimeout(this._clockTimer);
  },

  updateClock: function sb_updateClock() {
    // Schedule another clock update when a new minute rolls around
    var now = new Date();
    var sec = now.getSeconds();
    this._clockTimer =
      window.setTimeout((this.updateClock).bind(this), (59 - sec) * 1000);

    // Update time
    var element = document.getElementById('statusbar-time');
    element.textContent = now.toLocaleFormat(element.dataset.format);
  },

  updateBattery: function sb_updateBattery() {
    var battery = window.navigator.mozBattery;
    if (!battery)
      return;
    var elements = document.getElementsByClassName('battery');

    for (var n = 0; n < elements.length; ++n) {
      var element = elements[n];
      var fuel = element.children[0];
      var level = battery.level * 100;

      var charging = element.children[1];
      if (battery.charging) {
        charging.hidden = false;
        fuel.className = 'charging';
        fuel.style.minWidth = (level / 5.88) + 'px';
      } else {
        charging.hidden = true;

        fuel.style.minWidth = fuel.style.width = (level / 5.88) + 'px';
        if (level <= 10)
          fuel.className = 'critical';
        else if (level <= 30)
          fuel.className = 'low';
        else
          fuel.className = '';
      }
    }
  },

  updateConnection: function sb_updateConnection() {
    var conn = window.navigator.mozMobileConnection;
    if (!conn || !conn.voice)
      return;

    var _ = document.mozL10n.get;
    var voice = conn.voice;

    var airplaneMode = false;
    var settings = window.navigator.mozSettings;
    if (settings) {
      var settingName = 'ril.radio.disabled';
      var req = settings.getLock().get(settingName);
      req.onsuccess = function() {
        airplaneMode = req.result[settingName];
        if (airplaneMode) {
          document.getElementById('titlebar').textContent = _('airplane');
        }
      }
    }

    // Update the operator name / SIM status.
    var title = '';
    if (conn.cardState == 'absent') {
      title = _('noSimCard');
    } else if (conn.cardState == 'pin_required') {
      title = _('pinCodeRequired');
    } else if (conn.cardState == 'puk_required') {
      title = _('pukCodeRequired');
    } else if (conn.cardState == 'network_locked') {
      title = _('networkLocked');
    } else if (!voice.connected) {
      if (voice.emergencyCallsOnly) {
        title = _('emergencyCallsOnly');
      } else {
        title = _('searching');
      }
    } else {
      // voice.network will be introduced by bug 761482
      // Before that, get operator name from voice.operator.
      var networkName = (voice.network) ?
        voice.network.shortName : voice.operator;

      if (voice.roaming) {
        title = _('roaming', { operator: (networkName || '') });
      } else {
        title = networkName || '';
      }
    }
    document.getElementById('titlebar').textContent = title;

    // Update the 3G/data status.
    var dataType = conn.data.connected ? conn.data.type : '';
    document.getElementById('data').textContent = dataType;

    // Update the signal strength bars.
    var signalElements = this.signal.children;
    for (var i = 0; i < 4; i++) {
      var haveSignal = (i < voice.relSignalStrength / 25);
      var el = signalElements[i];
      if (haveSignal) {
        el.classList.add('have-signal');
      } else {
        el.classList.remove('have-signal');
      }
    }
  },

  updateWifi: function sb_updateWifi(evt) {
    var wifi = window.navigator.mozWifiManager;
    if (!wifi)
      return;
    var wifiIndicator = document.getElementById('wifi');

    // relSignalStrength should be between 0 and 100
    var level = Math.min(Math.floor(evt.relSignalStrength / 20), 4);
    wifiIndicator.className = 'signal-level' + level;
  },

  getAllElements: function ls_getAllElements() {
    // ID of elements to create references
    var elements = ['signal'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    }

    elements.forEach((function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById('statusbar-' + name);
    }).bind(this));
  }
};

StatusBar.init();
