/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var StatusBar = {
  /* Timeout for 'recently active' indicators */
  kActiveIndicatorTimeout: 60 * 1000,

  /* Whether or not status bar is actively updating or not */
  active: true,

  /* Some values that sync from mozSettings */
  settingValues: {},

  /* Keep the DOM element references here */
  icons: {},

  wifiConnected: false,

  geolocationActive: false,
  geolocationTimer: null,

  /* For other app to acquire */
  get height() {
    if (this.screen.classList.contains('active-statusbar'))
      return this.attentionBar.offsetHeight;
    else
      return this.element.offsetHeight;
  },

  init: function sb_init() {
    this.getAllElements();

    var settings = {
      'ril.radio.disabled': ['signal', 'data'],
      'ril.data.enabled': ['data'],
      'wifi.enabled': ['wifi'],
      'bluetooth.enabled': ['bluetooth'],
      'tethering.usb.enabled': ['tethering'],
      'tethering.wifi.enabled': ['tethering'],
      'tethering.wifi.connectedClients': ['tethering'],
      'tethering.usb.connectedClients': ['tethering'],
      'audio.volume.master': ['mute'],
      'alarm.enabled': ['alarm']
    };

    var self = this;
    for (var settingKey in settings) {
      (function sb_setSettingsListener(settingKey) {
        SettingsListener.observe(settingKey, false,
          function sb_settingUpdate(value) {
            self.settingValues[settingKey] = value;
            settings[settingKey].forEach(
              function sb_callUpdate(name) {
                self.update[name].call(self);
              }
            );
          }
        );
        self.settingValues[settingKey] = false;
      })(settingKey);
    }

    window.addEventListener('screenchange', this);
    window.addEventListener('mozChromeEvent', this);
    this.setActive(true);
  },

  handleEvent: function sb_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        this.setActive(evt.detail.screenEnabled);
        break;

      case 'chargingchange':
      case 'levelchange':
      case 'statuschange':
        this.update.battery.call(this);
        break;

      case 'voicechange':
        this.update.signal.call(this);
        break;

      case 'datachange':
        this.update.data.call(this);
        break;

      case 'mozChromeEvent':
        if (evt.detail.type !== 'geolocation-status')
          return;

        this.geolocationActive = evt.detail.active;
        this.update.geolocation.call(this);
        break;
    }
  },

  setActive: function sb_setActive(active) {
    this.active = active;
    if (active) {
      this.update.time.call(this);

      var battery = window.navigator.battery;
      if (battery) {
        battery.addEventListener('chargingchange', this);
        battery.addEventListener('levelchange', this);
        battery.addEventListener('statuschange', this);
        this.update.battery.call(this);
      }

      var conn = window.navigator.mozMobileConnection;
      if (conn) {
        conn.addEventListener('voicechange', this);
        conn.addEventListener('datachange', this);
        this.update.signal.call(this);
        this.update.data.call(this);
      }

      var wifiManager = window.navigator.mozWifiManager;
      if (wifiManager) {
        wifiManager.onstatuschange =
          wifiManager.connectionInfoUpdate = (this.update.wifi).bind(this);
        this.update.wifi.call(this);
      }

      var bluetooth = window.navigator.mozBluetooth;
      if (bluetooth) {
        // XXX need a reliable way to see if bluetooth is currently
        // connected or not here.
        this.update.bluetooth.call(this);
      }
    } else {
      clearTimeout(this._clockTimer);

      var battery = window.navigator.battery;
      if (battery) {
        battery.removeEventListener('chargingchange', this);
        battery.removeEventListener('levelchange', this);
        battery.removeEventListener('statuschange', this);
      }

      var conn = window.navigator.mozMobileConnection;
      if (conn) {
        conn.removeEventListener('voicechange', this);
        conn.removeEventListener('datachange', this);
      }
    }
  },

  update: {
    time: function sb_updateTime() {
      // Schedule another clock update when a new minute rolls around
      var now = new Date();
      var sec = now.getSeconds();
      this._clockTimer =
        window.setTimeout((this.update.time).bind(this), (59 - sec) * 1000);

      // XXX: respect clock format in Settings,
      // but drop the AM/PM part according to spec
      this.icons.time.textContent = now.toLocaleFormat('%R');
    },

    battery: function sb_updateBattery() {
      var battery = window.navigator.battery;
      if (!battery)
        return;

      var icon = this.icons.battery;

      icon.hidden = false;
      icon.dataset.charging = battery.charging;
      icon.dataset.level = Math.floor(battery.level * 10) * 10;
    },

    signal: function sb_updateSignal() {
      var conn = window.navigator.mozMobileConnection;
      if (!conn || !conn.voice)
        return;

      var voice = conn.voice;
      var icon = this.icons.signal;
      var flightModeIcon = this.icons.flightMode;
      var _ = navigator.mozL10n.get;

      if (this.settingValues['ril.radio.disabled']) {
        // "Airplane Mode"
        icon.hidden = true;
        flightModeIcon.hidden = false;
        return;
      }

      flightModeIcon.hidden = true;

      icon.dataset.roaming = voice.roaming;
      if (!voice.connected && !voice.emergencyCallsOnly) {
        // "No Network" / "Searching"
        // XXX: need differentiate the two
        // https://github.com/mozilla-b2g/gaia/issues/2763
        icon.hidden = true;
      } else {
        // "Emergency Calls Only (REASON)" / "Carrier" / "Carrier (Roaming)"
        icon.hidden = false;
        icon.dataset.level = Math.floor(voice.relSignalStrength / 20); // 0-5
      }
    },

    data: function sb_updateSignal() {
      var conn = window.navigator.mozMobileConnection;
      if (!conn || !conn.data)
        return;

      var data = conn.data;
      var icon = this.icons.data;

      if (this.settingValues['ril.radio.disabled'] ||
          !this.settingValues['ril.data.enabled'] ||
          this.wifiConnected || !data.connected) {
        icon.hidden = true;

        return;
      }

      icon.hidden = false;
      var type = '';

      switch (data.type) {
        case 'lte':
          type = 'LTE';
          break;

        // This icon is not used
        // type = '4G';
        //  break;

        // 3.5G, show them as 3G
        case 'hsdpa':
        case 'hsupa':
        case 'hspa+':

        // CDMA 3G
        case 'evdo0':
        case 'evdoa':
        case 'evdob':
        case '1xrtt':

        // 3G
        case 'umts':
          type = '3G';
          break;

        case 'edge':
          type = 'EDGE';
          break;

        // CDMA 2G
        case 'is95a':
        case 'is95b':

        // 2G
        case 'gprs':
        default:
          type = '2G';
      }

      icon.dataset.type = type;
    },


    wifi: function sb_updateWifi() {
      var wifiManager = window.navigator.mozWifiManager;
      if (!wifiManager)
        return;

      var icon = this.icons.wifi;

      if (!this.settingValues['wifi.enabled']) {
        icon.hidden = true;

        var updateData = this.wifiConnected;
        this.wifiConnected = false;
        if (updateData)
          this.update.data.call(this);

        return;
      }

      var connected = !!wifiManager.connection.network;
      var updateData = (this.wifiConnected !== connected);

      this.wifiConnected = connected;
      if (updateData)
        this.update.data.call(this);

      if (!this.wifiConnected) {
        icon.hidden = true;
        return;
      }

      icon.hidden = false;
      var relSignalStrength =
        wifiManager.connectionInformation.relSignalStrength;

      icon.dataset.level = Math.floor(relSignalStrength / 25);
    },

    tethering: function sb_updateTethering() {
      var icon = this.icons.tethering;
      icon.hidden = !(this.settingValues['tethering.usb.enabled'] ||
                      this.settingValues['tethering.wifi.enabled']);

      icon.dataset.active =
        (this.settingValues['tethering.wifi.connectedClients'] !== 0) ||
        (this.settingValues['tethering.usb.connectedClients'] !== 0);
    },

    bluetooth: function sb_updateBluetooth() {
      var icon = this.icons.bluetooth;

      icon.hidden = !this.settingValues['bluetooth.enabled'];

      // XXX no way to active state of BlueTooth for now,
      // make it always active
      icon.dataset.active = 'true';
    },

    alarm: function sb_updateAlarm() {
      this.icons.alarm.hidden = !this.settingValues['alarm.enabled'];
    },

    mute: function sb_updateMute() {
      this.icons.mute.hidden =
        (this.settingValues['audio.volume.master'] !== 0);
    },

    recording: function sb_updateRecording() {
      // XXX no way to probe active state of microphone and camera
      // this.icon.recording.hidden = ?
      // this.icon.recording.dataset.active = ?;
    },

    sms: function sb_updateSms() {
      // TBD
      // this.icon.sms.hidden = ?
      // this.icon.sms.dataset.num = ?;
    },

    geolocation: function sb_updateGeolocation() {
      window.clearTimeout(this.geolocationTimer);

      var icon = this.icons.geolocation;
      icon.dataset.active = this.geolocationActive;

      if (this.geolocationActive) {
        // Geolocation is currently active, show the active icon.
        icon.hidden = false;
        return;
      }

      // Geolocation is currently inactive.
      // Show the inactive icon and hide it after kActiveIndicatorTimeout
      this.geolocationTimer = window.setTimeout(function hideGeoIcon() {
        icon.hidden = true;
      }, this.kActiveIndicatorTimeout);
    },

    usb: function sb_updateUsb() {
      // XXX no way to probe active state of USB mess storage right now
      // this.icon.usb.hidden = ?
    }
  },

  updateNotification: function sb_updateNotification(count) {
    var icon = this.icons.notification;
    if (!count) {
      icon.hidden = true;
      return;
    }

    icon.hidden = false;
    icon.dataset.num = count;
  },

  updateNotificationUnread: function sb_updateNotificationUnread(unread) {
    this.icons.notification.dataset.unread = unread;
  },

  getAllElements: function sb_getAllElements() {
    // ID of elements to create references
    var elements = ['notification', 'time',
    'battery', 'wifi', 'data', 'flight-mode', 'signal',
    'tethering', 'alarm', 'bluetooth', 'mute',
    'recording', 'sms', 'geolocation', 'usb'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    }

    elements.forEach((function createElementRef(name) {
      this.icons[toCamelCase(name)] =
        document.getElementById('statusbar-' + name);
    }).bind(this));

    this.element = document.getElementById('statusbar');
    this.screen = document.getElementById('screen');
    this.attentionBar = document.getElementById('attention-bar');
  }
};

StatusBar.init();
