/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Create an animated icon by using a canvas element coupled with a flat image
 * containing all the animation frames arranged as a vertical row. The delay
 * between each frame is fixed.
 */

function AnimatedIcon(element, path, frames, delay) {
  var context = element.getContext('2d');

  this.frame = 1;
  this.frames = frames;
  this.timerId = null;
  this._started = false;
  var image;

  // Load the image and paint the first frame
  function init() {
    image = new Image();
    image.src = path;
    image.onload = function() {
      var w = image.width;
      var h = image.height / frames;
      context.drawImage(image, 0, 0, w, h, 0, 0, w, h);
    };
  }

  this.start = function() {
    var self = this;
    // XXX: If we draw canvas during device start up,
    // it will face following issue.
    // https://bugzilla.mozilla.org/show_bug.cgi?id=849736
    if (!self._started) {
      self._started = true;
      init();
    }

    if (this.timerId == null) {
      this.timerId = setInterval(function() {
          var w = image.width;
          var h = image.height / frames;

          context.drawImage(image, 0, self.frame * h, w, h, 0, 0, w, h);
          self.frame++;

          if (self.frame == self.frames) {
            self.frame = 0;
          }
      }, delay);
    }
  };

  this.stop = function() {
    if (this.timerId != null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  };
}

var StatusBar = {
  /* all elements that are children nodes of the status bar */
  ELEMENTS: ['notification', 'time',
    'battery', 'wifi', 'data', 'flight-mode', 'signal', 'network-activity',
    'tethering', 'alarm', 'bluetooth', 'mute', 'headphones',
    'recording', 'sms', 'geolocation', 'usb', 'label', 'system-downloads',
    'call-forwarding'],

  /* Timeout for 'recently active' indicators */
  kActiveIndicatorTimeout: 60 * 1000,

  /* Whether or not status bar is actively updating or not */
  active: true,

  /* Some values that sync from mozSettings */
  settingValues: {},

  /* Keep the DOM element references here */
  icons: {},

  /* A mapping table between technology names
     we would get from API v.s. the icon we want to show. */
  mobileDataIconTypes: {
    'lte': '4G', // 4G LTE
    'ehrpd': '4G', // 4G CDMA
    'hspa+': 'H+', // 3.5G HSPA+
    'hsdpa': 'H', 'hsupa': 'H', 'hspa': 'H', // 3.5G HSDPA
    'evdo0': '3G', 'evdoa': '3G', 'evdob': '3G', '1xrtt': '3G', // 3G CDMA
    'umts': '3G', // 3G
    'edge': 'E', // EDGE
    'is95a': '2G', 'is95b': '2G', // 2G CDMA
    'gprs': '2G'
  },

  geolocationActive: false,
  geolocationTimer: null,

  recordingActive: false,
  recordingTimer: null,

  umsActive: false,

  headphonesActive: false,

  /**
   * this keeps how many current installs/updates we do
   * it triggers the icon "systemDownloads"
   */
  systemDownloadsCount: 0,

  /**
   * Objects used to animate the system downloads and
   * network activity canvas elements
   */
  networkActivityAnimation: null,
  systemDownloadsAnimation: null,

  /* For other modules to acquire */
  get height() {
    if (this.screen.classList.contains('fullscreen-app') ||
        document.mozFullScreen) {
      return 0;
    } else if (this.screen.classList.contains('active-statusbar')) {
      return this.attentionBar.offsetHeight;
    } else {
      return this._cacheHeight ||
             (this._cacheHeight = this.element.getBoundingClientRect().height);
    }
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
      'ring.enabled': ['mute'],
      'alarm.enabled': ['alarm'],
      'vibration.enabled': ['vibration'],
      'ril.cf.enabled': ['callForwarding']
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

    // Listen to 'screenchange' from screen_manager.js
    window.addEventListener('screenchange', this);

    // Listen to 'geolocation-status' and 'recording-status' mozChromeEvent
    window.addEventListener('mozChromeEvent', this);

    // Listen to 'bluetoothconnectionchange' from bluetooth.js
    window.addEventListener('bluetoothconnectionchange', this);

    // Listen to 'moztimechange'
    window.addEventListener('moztimechange', this);

    this.systemDownloadsCount = 0;

    // Create the objects used to animate the statusbar-network-activity and
    // statusbar-system-downloads canvas elements
    this.networkActivityAnimation = new AnimatedIcon(this.icons.networkActivity,
      '/style/statusbar/images/network-activity-flat.png', 6, 200);
    this.systemDownloadsAnimation = new AnimatedIcon(this.icons.systemDownloads,
      '/style/statusbar/images/system-downloads-flat.png', 8, 130);

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
        this.update.label.call(this);
        break;

      case 'cardstatechange':
        this.update.signal.call(this);
        this.update.label.call(this);
        this.update.data.call(this);
        break;

      case 'callschanged':
        this.update.signal.call(this);
        break;

      case 'iccinfochange':
        this.update.label.call(this);
        break;

      case 'datachange':
        this.update.data.call(this);
        break;

      case 'bluetoothconnectionchange':
        this.update.bluetooth.call(this);
        break;

      case 'moztimechange':
        this.update.time.call(this);
        break;

      case 'mozChromeEvent':
        switch (evt.detail.type) {
          case 'geolocation-status':
            this.geolocationActive = evt.detail.active;
            this.update.geolocation.call(this);
            break;

          case 'recording-status':
            this.recordingActive = evt.detail.active;
            this.update.recording.call(this);
            break;

          case 'volume-state-changed':
            this.umsActive = evt.detail.active;
            this.update.usb.call(this);
            break;

          case 'headphones-status-changed':
            this.headphonesActive = (evt.detail.state != 'off');
            this.update.headphones.call(this);
            break;
        }

        break;

      case 'moznetworkupload':
      case 'moznetworkdownload':
        this.update.networkActivity.call(this);
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
        conn.addEventListener('iccinfochange', this);
        conn.addEventListener('datachange', this);
        this.update.signal.call(this);
        this.update.data.call(this);
      }

      window.addEventListener('wifi-statuschange',
                              this.update.wifi.bind(this));
      this.update.wifi.call(this);

      window.addEventListener('moznetworkupload', this);
      window.addEventListener('moznetworkdownload', this);
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
        conn.removeEventListener('iccinfochange', this);
        conn.removeEventListener('datachange', this);
      }

      window.removeEventListener('moznetworkupload', this);
      window.removeEventListener('moznetworkdownload', this);
    }
  },

  update: {
    label: function sb_updateLabel() {
      var conn = window.navigator.mozMobileConnection;
      var label = this.icons.label;
      var l10nArgs = JSON.parse(label.dataset.l10nArgs || '{}');

      if (!conn || !conn.voice || !conn.voice.connected ||
          conn.voice.emergencyCallsOnly) {
        delete l10nArgs.operator;
        label.dataset.l10nArgs = JSON.stringify(l10nArgs);

        label.dataset.l10nId = '';
        label.textContent = l10nArgs.date;

        return;
      }

      var operatorInfos = MobileOperator.userFacingInfo(conn);
      l10nArgs.operator = operatorInfos.operator;

      if (operatorInfos.region) {
        l10nArgs.operator += ' ' + operatorInfos.region;
      }

      label.dataset.l10nArgs = JSON.stringify(l10nArgs);

      label.dataset.l10nId = 'statusbarLabel';
      label.textContent = navigator.mozL10n.get('statusbarLabel', l10nArgs);
    },

    time: function sb_updateTime() {
      // Schedule another clock update when a new minute rolls around
      var _ = navigator.mozL10n.get;
      var f = new navigator.mozL10n.DateTimeFormat();
      var now = new Date();
      var sec = now.getSeconds();
      if (this._clockTimer)
        window.clearTimeout(this._clockTimer);
      this._clockTimer =
        window.setTimeout((this.update.time).bind(this), (59 - sec) * 1000);

      var formated = f.localeFormat(now, _('shortTimeFormat'));
      formated = formated.replace(/\s?(AM|PM)\s?/i, '<span>$1</span>');
      this.icons.time.innerHTML = formated;

      var label = this.icons.label;
      var l10nArgs = JSON.parse(label.dataset.l10nArgs || '{}');
      l10nArgs.date = f.localeFormat(now, _('statusbarDateFormat'));
      label.dataset.l10nArgs = JSON.stringify(l10nArgs);
      this.update.label.call(this);
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

    networkActivity: function sb_updateNetworkActivity() {
      // Each time we receive an update, make network activity indicator
      // show up for 500ms.

      var icon = this.icons.networkActivity;
      var animation = this.networkActivityAnimation;

      clearTimeout(this._networkActivityTimer);
      icon.hidden = false;
      animation.start();

      this._networkActivityTimer = setTimeout(function hideNetActivityIcon() {
        animation.stop();
        icon.hidden = true;
      }, 500);
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
      icon.hidden = false;

      if (conn.cardState === 'absent') {
        // no SIM
        delete icon.dataset.level;
        delete icon.dataset.emergency;
        delete icon.dataset.searching;
        delete icon.dataset.roaming;
      } else if (voice.connected || this.hasActiveCall()) {
        // "Carrier" / "Carrier (Roaming)"
        icon.dataset.level = Math.ceil(voice.relSignalStrength / 20); // 0-5
        icon.dataset.roaming = voice.roaming;

        delete icon.dataset.emergency;
        delete icon.dataset.searching;
      } else {
        // "No Network" / "Emergency Calls Only (REASON)" / trying to connect
        icon.dataset.level = -1;
        // logically, we should have "&& !voice.connected" as well but we
        // already know this.
        icon.dataset.searching = (!voice.emergencyCallsOnly &&
                                  voice.state !== 'notSearching');
        icon.dataset.emergency = (voice.emergencyCallsOnly);
        delete icon.dataset.roaming;
      }

      if (voice.emergencyCallsOnly) {
        this.addCallListener();
      } else {
        this.removeCallListener();
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
          !this.icons.wifi.hidden || !data.connected) {
        icon.hidden = true;

        return;
      }

      icon.hidden = false;
      icon.dataset.type =
        this.mobileDataIconTypes[data.type] || 'circle';
    },


    wifi: function sb_updateWifi() {
      var wifiManager = window.navigator.mozWifiManager;
      if (!wifiManager)
        return;

      var icon = this.icons.wifi;
      var wasHidden = icon.hidden;

      if (!this.settingValues['wifi.enabled']) {
        icon.hidden = true;
        if (!wasHidden)
          this.update.data.call(this);

        return;
      }

      switch (wifiManager.connection.status) {
        case 'disconnected':
          icon.hidden = true;

          break;

        case 'connecting':
        case 'associated':
          icon.hidden = false;
          icon.dataset.connecting = true;
          icon.dataset.level = 0;

          break;

        case 'connected':
          icon.hidden = false;

          var relSignalStrength =
            wifiManager.connectionInformation.relSignalStrength;
          icon.dataset.level = Math.floor(relSignalStrength / 25);

          break;
      }

      if (icon.hidden !== wasHidden)
        this.update.data.call(this);
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
      icon.dataset.active = Bluetooth.connected;
    },

    alarm: function sb_updateAlarm() {
      this.icons.alarm.hidden = !this.settingValues['alarm.enabled'];
    },

    mute: function sb_updateMute() {
      this.icons.mute.hidden =
        (this.settingValues['ring.enabled'] == true);
    },

    vibration: function sb_vibration() {
      var vibrate = (this.settingValues['vibration.enabled'] == true);
      if (vibrate) {
        this.icons.mute.classList.add('vibration');
      } else {
        this.icons.mute.classList.remove('vibration');
      }
    },

    recording: function sb_updateRecording() {
      window.clearTimeout(this.recordingTimer);

      var icon = this.icons.recording;
      icon.dataset.active = this.recordingActive;

      if (this.recordingActive) {
        // Geolocation is currently active, show the active icon.
        icon.hidden = false;
        return;
      }

      // Geolocation is currently inactive.
      // Show the inactive icon and hide it after kActiveIndicatorTimeout
      this.recordingTimer = window.setTimeout(function hideGeoIcon() {
        icon.hidden = true;
      }, this.kActiveIndicatorTimeout);
    },

    sms: function sb_updateSms() {
      // We are not going to show this for v1

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
      var icon = this.icons.usb;
      icon.hidden = !this.umsActive;
    },

    headphones: function sb_updateHeadphones() {
      var icon = this.icons.headphones;
      icon.hidden = !this.headphonesActive;
    },

    systemDownloads: function sb_updatesystemDownloads() {
      var icon = this.icons.systemDownloads;
      var animation = this.systemDownloadsAnimation;

      if (this.systemDownloadsCount > 0) {
        icon.hidden = false;
        animation.start();
      } else {
        animation.stop();
        icon.hidden = true;
      }
    },

    callForwarding: function sb_updateCallForwarding() {
      var icon = this.icons.callForwarding;
      icon.hidden = !this.settingValues['ril.cf.enabled'];
    }
  },

  hasActiveCall: function sb_hasActiveCall() {
    var telephony = navigator.mozTelephony;

    // will return true as soon as we begin dialing
    return !!(telephony && telephony.active);
  },

  addCallListener: function sb_addCallListener() {
    var telephony = navigator.mozTelephony;
    if (telephony) {
      telephony.addEventListener('callschanged', this);
    }
  },

  removeCallListener: function sb_addCallListener() {
    var telephony = navigator.mozTelephony;
    if (telephony) {
      telephony.removeEventListener('callschanged', this);
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

  incSystemDownloads: function sb_incSystemDownloads() {
    this.systemDownloadsCount++;
    this.update.systemDownloads.call(this);
  },

  decSystemDownloads: function sb_decSystemDownloads() {
    if (--this.systemDownloadsCount < 0) {
      this.systemDownloadsCount = 0;
    }

    this.update.systemDownloads.call(this);
  },

  getAllElements: function sb_getAllElements() {
    // ID of elements to create references

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    this.ELEMENTS.forEach((function createElementRef(name) {
      this.icons[toCamelCase(name)] =
        document.getElementById('statusbar-' + name);
    }).bind(this));

    this.element = document.getElementById('statusbar');
    this.screen = document.getElementById('screen');
    this.attentionBar = document.getElementById('attention-bar');
  }
};

if (navigator.mozL10n.readyState == 'complete' ||
    navigator.mozL10n.readyState == 'interactive') {
  StatusBar.init();
} else {
  window.addEventListener('localized', StatusBar.init.bind(StatusBar));
}


