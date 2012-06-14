/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var StatusBar = {
  radioDisabled: false,

  init: function sb_init() {
    // XXX: is this the correct way to probe language changes?
    SettingsListener.observe('language.current', 'en-US',
      (function localeChanged(value) {
        this.updateConnection();
      }).bind(this)
    );

    SettingsListener.observe('ril.radio.disabled', false,
      (function rilDisable(value) {
        this.radioDisabled = value;
        this.updateConnection();
        this.updateWifi();
      }).bind(this)
    );

    this.getAllElements();

    window.addEventListener('screenchange', this);
    this.addListeners();

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

      case 'volumechange':
        this.updateMuteState();
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

    var wifiManager = window.navigator.mozWifiManager;
    if (wifiManager) {
      wifiManager.onstatuschange =
        wifiManager.connectionInfoUpdate = (this.updateWifi).bind(this);
    }

    this.updateClock();

    window.addEventListener('volumechange', this);
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

    var wifiManager = window.navigator.mozWifiManager;
    if (wifiManager) {
      wifiManager.onstatuschange =
        wifiManager.connectionInfoUpdate = null;
    }

    clearTimeout(this._clockTimer);

    window.removeEventListener('volumechange', this);
  },

  updateClock: function sb_updateClock() {
    // Schedule another clock update when a new minute rolls around
    var now = new Date();
    var sec = now.getSeconds();
    this._clockTimer =
      window.setTimeout((this.updateClock).bind(this), (59 - sec) * 1000);

    // XXX: respect clock format in Settings,
    // but drop the AM/PM part according to spec
    this.time.textContent = now.toLocaleFormat('%R');
  },

  updateBattery: function sb_updateBattery() {
    var mozBattery = window.navigator.mozBattery;
    if (!mozBattery)
      return;

    var battery = this.battery;
    var fuel = this.batteryFuel;
    var charging = this.batteryCharging;

    var level = mozBattery.level * 100;

    if (mozBattery.charging) {
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
  },

  updateConnection: function sb_updateConnection() {
    var conn = window.navigator.mozMobileConnection;
    if (!conn || !conn.voice)
      return;

    var _ = document.mozL10n.get;
    /* Information about voice connection */
    var voice = conn.voice;
    /* Information about data connection */
    var data = conn.data;

    if (this.radioDisabled) {
      this.conn.textContent = _('airplane');
      return;
    }

    // Update the operator name / SIM status.
    var title = '';
    switch (conn.cardState) {
      case 'absent':
        title = _('noSimCard');
        break;
      case 'pin_required':
        title = _('pinCodeRequired');
        break;
      case 'puk_required':
        title = _('pukCodeRequired');
        break;
      case 'network_locked':
        title = _('networkLocked');
        break;
    }

    if (!title) {
      if (!voice.connected) {
        if (voice.emergencyCallsOnly) {
          title = _('emergencyCallsOnly');
        } else {
          title = _('searching');
        }
      } else {
        // voice.network will be introduced by bug 761482
        // Before that, get operator name from voice.operator.
        title = (voice.network) ?
          voice.network.shortName : voice.operator;

        if (voice.roaming) {
          this.signal.classList.add('roaming');
        } else {
          this.signal.classList.remove('roaming');
        }
      }
    }

    this.conn.textContent = title;

    // Update the 3G/data status.
    // XXX: need icon for 3G/EDGE/etc instead of expose the type text
    if (data) {
      this.data.textContent =
        data.connected ? data.type.toUpperCase() : '';
    } else {
      this.data.textContent = '';
    }

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
    var wifiManager = window.navigator.mozWifiManager;
    if (!wifiManager)
      return;
    var network = wifiManager.connection.network;

    // We'll hide the data status icon here since all traffic is
    // going through Wifi when it's connected
    this.wifi.hidden = !network;
    this.data.hidden = !!network;

    if (network && evt.relSignalStrength) {
      // relSignalStrength should be between 0 and 100
      var relSignalStrength = evt.relSignalStrength || 0;
      if (wifiManager.connectionInformation) {
        relSignalStrength =
          wifiManager.connectionInformation.relSignalStrength;
      }

      var level = Math.min(Math.floor(relSignalStrength / 20), 4);
      this.wifi.className = 'signal-level' + level;
    }
  },

  updateMuteState: function sb_updateMuteState() {
    this.mute.hidden = !!SoundManager.currentVolume;
  },

  updateNotification: function sb_updateNotification(show) {
    this.notification.hidden = !show;
  },

  getAllElements: function ls_getAllElements() {
    // ID of elements to create references
    var elements = ['signal', 'conn', 'data', 'wifi',
      'notification', 'mute', 'battery', 'battery-fuel',
      'battery-charging', 'time'];

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
