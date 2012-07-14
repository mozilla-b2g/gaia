/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var StatusBar = {
  radioDisabled: false,

  init: function sb_init() {
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
    this.updateAll();
  },

  handleEvent: function sb_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        if (evt.detail.screenEnabled) {
          this.addListeners();
          this.updateAll();
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

  updateAll: function sb_updateAll() {
    this.updateClock();
    this.updateBattery();
    this.updateConnection();
    this.updateWifi();
  },

  addListeners: function sb_addListeners() {
    var battery = window.navigator.battery;
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

    window.addEventListener('volumechange', this);
  },

  removeListeners: function sb_removeListeners(evt) {
    var battery = window.navigator.battery;
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
    var battery = window.navigator.battery;
    if (!battery)
      return;

    var battery = this.battery;
    var fuel = this.batteryFuel;
    var charging = this.batteryCharging;

    var level = battery.level * 100;

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
  },

  updateConnection: function sb_updateConnection() {
    var conn = window.navigator.mozMobileConnection;
    if (!conn || !conn.voice)
      return;

    var _ = navigator.mozL10n.get;
    /* Information about voice connection */
    var voice = conn.voice;
    /* Information about data connection */
    var data = conn.data;

    if (this.radioDisabled) {
      this.conn.textContent = _('airplane');
      this.conn.dataset.l10nId = 'airplane';
      this.signal.hidden = true;
      this.data.textContent = '';
      return;
    }
    this.signal.hidden = false;

    // Update the operator name / SIM status.
    var titleL10nId = '';
    var title = '';
    switch (conn.cardState) {
      case 'absent':
        titleL10nId = 'noSimCard';
        break;
      case 'pin_required':
        titleL10nId = 'pinCodeRequired';
        break;
      case 'puk_required':
        titleL10nId = 'pukCodeRequired';
        break;
      case 'network_locked':
        titleL10nId = 'networkLocked';
        break;
    }

    if (!titleL10nId) {
      if (!voice.connected) {
        if (voice.emergencyCallsOnly) {
          titleL10nId = 'emergencyCallsOnly';
        } else {
          titleL10nId = 'searching';
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

    if (title) {
      this.conn.textContent = title;
      delete this.conn.dataset.l10nId;
    } else if (titleL10nId) {
      this.conn.textContent = _(titleL10nId) || '';
      this.conn.dataset.l10nId = titleL10nId;
    } else {
      this.conn.textContent = '';
      delete this.conn.dataset.l10nId;
    }

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

    if (network && evt && evt.relSignalStrength) {
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
    SettingsListener.observe('audio.volume.master', 5, (function(volume) {
      this.mute.hidden = volume;
    }).bind(this));
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
