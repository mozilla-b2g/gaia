/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Creates an object used for refreshing the clock UI element. Handles all
 * related timer manipulation (start/stop/cancel).
 */
function Clock() {
  /** One-shot timer used to refresh the clock at a minute's turn */
  this.timeoutID = null;

  /** Timer used to refresh the clock every minute */
  this.timerID = null;

  /**
   * Start the timer used to refresh the clock, will call the specified
   * callback at every timer tick to refresh the UI. The callback used to
   * refresh the UI will also be called immediately to ensure the UI is
   * consistent.
   *
   * @param {Function} refresh Function used to refresh the UI at every timer
   *        tick, should accept a date object as its only argument.
   */
  this.start = function cl_start(refresh) {
    var date = new Date();
    var self = this;

    refresh(date);

    if (this.timeoutID == null) {
      this.timeoutID = window.setTimeout(function cl_setClockInterval() {
        refresh(new Date());

        if (self.timerID == null) {
          self.timerID = window.setInterval(function cl_clockInterval() {
            refresh(new Date());
          }, 60000);
        }
      }, (60 - date.getSeconds()) * 1000);
    }
  };

  /**
   * Stops the timer used to refresh the clock
   */
  this.stop = function cl_stop() {
    if (this.timeoutID != null) {
      window.clearTimeout(this.timeoutID);
      this.timeoutID = null;
    }

    if (this.timerID != null) {
      window.clearInterval(this.timerID);
      this.timerID = null;
    }
  };
}

var StatusBar = {
  /* all elements that are children nodes of the status bar */
  ELEMENTS: ['notification', 'emergency-cb-notification', 'time', 'connections',
    'battery', 'wifi', 'data', 'flight-mode', 'network-activity', 'tethering',
    'alarm', 'bluetooth', 'mute', 'headphones', 'bluetooth-headphones',
    'bluetooth-transferring', 'recording', 'sms', 'geolocation', 'usb', 'label',
    'system-downloads', 'call-forwarding', 'playing'],

  /* Timeout for 'recently active' indicators */
  kActiveIndicatorTimeout: 5 * 1000,

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
    'evdo0': 'Ev', 'evdoa': 'Ev', 'evdob': 'Ev', // 3G CDMA
    'umts': '3G', // 3G
    'edge': 'E', // EDGE
    'gprs': '2G',
    '1xrtt': '1x', 'is95a': '1x', 'is95b': '1x' // 2G CDMA
  },

  // CDMA types that can support either data call or voice call simultaneously.
  dataExclusiveCDMATypes: {
    'evdo0': true, 'evdoa': true, 'evdob': true, // data call only
    '1xrtt': true, 'is95a': true, 'is95b': true  // data call or voice call
  },

  geolocationActive: false,
  geolocationTimer: null,

  recordingActive: false,
  recordingTimer: null,

  umsActive: false,

  headphonesActive: false,

  listeningCallschanged: false,

  playingActive: false,

  /**
   * this keeps how many current installs/updates we do
   * it triggers the icon "systemDownloads"
   */
  systemDownloadsCount: 0,

  /**
   * Object used for handling the clock UI element, wraps all related timers
   */
  clock: new Clock(),

  /* For other modules to acquire */
  get height() {
    if (this.screen.classList.contains('active-statusbar')) {
      return this.attentionBar.offsetHeight;
    } else if (this.screen.classList.contains('fullscreen-app') ||
        document.mozFullScreen) {
      return 0;
    } else {
      return this._cacheHeight ||
             (this._cacheHeight = this.element.getBoundingClientRect().height);
    }
  },

  init: function sb_init() {
    this.getAllElements();

    this.listeningCallschanged = false;

    // Refresh the time to reflect locale changes
    this.toggleTimeLabel(true);

    var settings = {
      'ril.radio.disabled': ['signal', 'data'],
      'airplaneMode.enabled': ['flightMode'],
      'ril.data.enabled': ['data'],
      'wifi.enabled': ['wifi'],
      'bluetooth.enabled': ['bluetooth'],
      'tethering.usb.enabled': ['tethering'],
      'tethering.wifi.enabled': ['tethering'],
      'tethering.wifi.connectedClients': ['tethering'],
      'tethering.usb.connectedClients': ['tethering'],
      'audio.volume.notification': ['mute'],
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
    // Listen to 'attentionscreenshow/hide' from attention_screen.js
    window.addEventListener('attentionscreenshow', this);
    window.addEventListener('attentionscreenhide', this);
    // Listen to 'screenchange' from screen_manager.js
    window.addEventListener('screenchange', this);

    // mozChromeEvent fired from Gecko is earlier been loaded,
    // so we use mozAudioChannelManager to
    // check the headphone plugged or not when booting up
    var acm = navigator.mozAudioChannelManager;
    if (acm) {
      this.headphonesActive = acm.headphones;
      this.update.headphones.call(this);
    }

    // Listen to 'geolocation-status' and 'recording-status' mozChromeEvent
    window.addEventListener('mozChromeEvent', this);

    // 'bluetoothconnectionchange' fires when the overall bluetooth connection
    //  changes.
    // 'bluetoothprofileconnectionchange' fires when a bluetooth connection of
    //  a specific profile changes.
    window.addEventListener('bluetoothconnectionchange', this);
    window.addEventListener('bluetoothprofileconnectionchange', this);

    // Listen to 'moztimechange'
    window.addEventListener('moztimechange', this);

    // Listen to 'lock', 'unlock', and 'lockpanelchange' from lockscreen.js in
    // order to correctly set the visibility of the statusbar clock depending
    // on the active lockscreen panel
    window.addEventListener('lock', this);
    window.addEventListener('unlock', this);
    window.addEventListener('lockpanelchange', this);

    this.systemDownloadsCount = 0;
    this.setActive(true);
  },

  handleEvent: function sb_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        this.setActive(evt.detail.screenEnabled);
        break;
      case 'attentionscreenhide':
      case 'lock':
        // Hide the clock in the statusbar when screen is locked
        this.toggleTimeLabel(!LockScreen.locked);
        break;
      case 'attentionscreenshow':
      case 'unlock':
        // Display the clock in the statusbar when screen is unlocked
        this.toggleTimeLabel(true);
        break;

      case 'lockpanelchange':
        if (this.screen.classList.contains('locked')) {
          // Display the clock in the statusbar if on Emergency Call screen
          var isHidden = (evt.detail.panel == 'emergency-call') ? false : true;
          this.toggleTimeLabel(!isHidden);
        }
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
        this.update.data.call(this);
        break;

      case 'simslot-iccinfochange':
        this.update.label.call(this);
        break;

      case 'wifi-statuschange':
        this.update.wifi.call(this);
        break;

      case 'datachange':
        this.update.data.call(this);
        break;

      case 'bluetoothconnectionchange':
        this.update.bluetooth.call(this);
        break;

      case 'bluetoothprofileconnectionchange':
        this.update.bluetoothProfiles.call(this);
        break;

      case 'moztimechange':
        navigator.mozL10n.ready((function _updateTime() {
          // To stop clock for reseting the clock interval which runs every 60
          // seconds. The reason to do this is that the time updated will be
          // exactly aligned to minutes which means always getting 0 on seconds
          // part.
          this.toggleTimeLabel(false);
          this.toggleTimeLabel(true);
        }).bind(this));
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

          case 'audio-channel-changed':
            this.playingActive = (evt.detail.channel === 'content');
            this.update.playing.call(this);
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
    var self = this;
    this.active = active;
    if (active) {
      var battery = window.navigator.battery;
      if (battery) {
        battery.addEventListener('chargingchange', this);
        battery.addEventListener('levelchange', this);
        battery.addEventListener('statuschange', this);
        this.update.battery.call(this);
      }

      var conns = window.navigator.mozMobileConnections;
      if (conns) {
        Array.prototype.slice.call(conns).forEach(function(conn) {
          conn.addEventListener('voicechange', self);
          conn.addEventListener('datachange', self);
          self.update.signal.call(self);
          self.update.data.call(self);
        });
      }

      window.addEventListener('simslot-iccinfochange', this);

      window.addEventListener('wifi-statuschange', this);

      var wifiManager = window.navigator.mozWifiManager;
      if (wifiManager) {
        wifiManager.connectionInfoUpdate = this.update.wifi.bind(this);
      }

      this.update.wifi.call(this);

      window.addEventListener('moznetworkupload', this);
      window.addEventListener('moznetworkdownload', this);

      this.refreshCallListener();

      this.toggleTimeLabel(!LockScreen.locked);
    } else {
      var battery = window.navigator.battery;
      if (battery) {
        battery.removeEventListener('chargingchange', this);
        battery.removeEventListener('levelchange', this);
        battery.removeEventListener('statuschange', this);
      }

      var conns = window.navigator.mozMobileConnections;
      if (conns) {
        Array.prototype.slice.call(conns).forEach(function(conn) {
          conn.removeEventListener('voicechange', self);
          conn.removeEventListener('datachange', self);
        });
      }

      window.removeEventListener('simslot-iccinfochange', this);

      window.removeEventListener('wifi-statuschange', this);

      window.removeEventListener('moznetworkupload', this);
      window.removeEventListener('moznetworkdownload', this);

      this.removeCallListener();

      // Always prevent the clock from refreshing itself when the screen is off
      this.toggleTimeLabel(false);
    }
  },

  update: {
    label: function sb_updateLabel() {
      var conns = window.navigator.mozMobileConnections;
      var conn;

      // Do not show carrier's name if there are multiple sim cards.
      if (conns && conns.length == 1) {
        conn = conns[0];
      }

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

    time: function sb_updateTime(now) {
      var _ = navigator.mozL10n.get;
      var f = new navigator.mozL10n.DateTimeFormat();
      var sec = now.getSeconds();

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

      clearTimeout(this._networkActivityTimer);
      icon.hidden = false;

      this._networkActivityTimer = setTimeout(function hideNetActivityIcon() {
        icon.hidden = true;
      }, 500);
    },

    flightMode: function sb_flightMode() {
      var self = this;
      var flightModeIcon = self.icons.flightMode;
      if (self.settingValues['airplaneMode.enabled']) {
        // "Airplane Mode"
        flightModeIcon.hidden = false;
        return;
      }
      flightModeIcon.hidden = true;
    },

    signal: function sb_updateSignal() {
      var self = this;
      var simSlots = SIMSlotManager.getSlots();
      for (var index = 0; index < simSlots.length; index++) {
        var simslot = simSlots[index];
        var conn = simslot.conn;
        var voice = conn.voice;
        var data = conn.data;
        var icon = self.icons.signals[index];

        var _ = navigator.mozL10n.get;

        if (!voice)
          continue;

        if (self.settingValues['ril.radio.disabled']) {
          icon.hidden = true;
          continue;
        }

        icon.hidden = false;

        if (simslot.isAbsent()) {
          // no SIM
          delete icon.dataset.level;
          delete icon.dataset.searching;
          delete icon.dataset.roaming;
        } else if (data && data.connected && data.type.startsWith('evdo')) {
          // "Carrier" / "Carrier (Roaming)" (EVDO)
          // Show signal strength of data call as EVDO only supports data call.
          icon.dataset.level = Math.ceil(data.relSignalStrength / 20); // 0-5
          icon.dataset.roaming = data.roaming;

          delete icon.dataset.searching;
        } else if (voice.connected || self.hasActiveCall()) {
          // "Carrier" / "Carrier (Roaming)"
          icon.dataset.level = Math.ceil(voice.relSignalStrength / 20); // 0-5
          icon.dataset.roaming = voice.roaming;

          delete icon.dataset.searching;
        } else if (simslot.isLocked()) {
          // SIM locked
          // We check if the sim card is locked after checking hasActiveCall
          // because we still need to show the siganl bars in this case even
          // the sim card is locked.
          icon.hidden = true;
        } else {
          // "No Network" / "Emergency Calls Only (REASON)" / trying to connect
          icon.dataset.level = -1;
          // emergencyCallsOnly is always true if voice.connected is false. Show
          // searching icon if the device is searching. Or show the signal bars
          // with a red "x", which stands for emergency calls only.
          icon.dataset.searching = (voice.state === 'searching');
          delete icon.dataset.roaming;
        }
      }

      this.refreshCallListener();
    },

    data: function sb_updateSignal() {
      var conns = window.navigator.mozMobileConnections;
      if (!conns)
        return;

      var self = this;
      for (var index = 0; index < conns.length; index++) {
        var conn = conns[index];
        var data = conn.data;
        var icon = self.icons.data[index];

        if (!data)
          continue;

        if (self.settingValues['ril.radio.disabled'] ||
            !self.settingValues['ril.data.enabled'] ||
            !self.icons.wifi.hidden || !data.connected) {
          icon.hidden = true;
          continue;
        }

        var type = self.mobileDataIconTypes[data.type];
        icon.hidden = false;
        icon.textContent = '';
        icon.classList.remove('sb-icon-data-circle');
        if (type) {
          if (self.dataExclusiveCDMATypes[data.type]) {
            // If the current data connection is CDMA types, we need to check
            // if there exist any calls. If yes, we have to set the status
            // text to empty.
            var telephony = window.navigator.mozTelephony;
            if (telephony.calls && telephony.calls.length > 0) {
              icon.textContent = '';
            } else {
              icon.textContent = type;
            }
          } else {
            icon.textContent = type;
          }
        } else {
          icon.classList.add('sb-icon-data-circle');
        }
      }

      this.refreshCallListener();
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

          if (icon.dataset.connecting) {
            delete icon.dataset.connecting;
          }
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

    bluetoothProfiles: function sv_updateBluetoothProfiles() {
      var bluetoothHeadphoneIcon = this.icons.bluetoothHeadphones;
      var bluetoothTransferringIcon = this.icons.bluetoothTransferring;

      bluetoothHeadphoneIcon.hidden =
        !Bluetooth.isProfileConnected(Bluetooth.Profiles.A2DP);

      bluetoothTransferringIcon.hidden =
        !Bluetooth.isProfileConnected(Bluetooth.Profiles.OPP);
    },

    alarm: function sb_updateAlarm() {
      this.icons.alarm.hidden = !this.settingValues['alarm.enabled'];
    },

    mute: function sb_updateMute() {
      this.icons.mute.hidden =
        (this.settingValues['audio.volume.notification'] != 0);
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
      icon.hidden = (this.systemDownloadsCount === 0);
    },

    callForwarding: function sb_updateCallForwarding() {
      var icon = this.icons.callForwarding;
      icon.hidden = !this.settingValues['ril.cf.enabled'];
    },

    playing: function sb_updatePlaying() {
      var icon = this.icons.playing;
      icon.hidden = !this.playingActive;
    }
  },

  hasActiveCall: function sb_hasActiveCall() {
    var telephony = navigator.mozTelephony;
    // will return true as soon as we begin dialing
    return !!(telephony && telephony.active);
  },

  refreshCallListener: function sb_refreshCallListener() {
    // Listen to callschanged only when connected to CDMA networks and emergency
    // calls.
    var conns = window.navigator.mozMobileConnections;
    if (!conns)
      return;

    var emergencyCallsOnly = false;
    var cdmaConnection = false;
    var self = this;
    Array.prototype.slice.call(conns).forEach(function(conn) {
      emergencyCallsOnly = emergencyCallsOnly ||
        (conn && conn.voice && conn.voice.emergencyCallsOnly);
      cdmaConnection = cdmaConnection ||
        (conn && conn.data && !!self.dataExclusiveCDMATypes[conn.data.type]);
    });

    if (emergencyCallsOnly || cdmaConnection) {
      this.addCallListener();
    } else {
      this.removeCallListener();
    }
  },

  addCallListener: function sb_addCallListener() {
    var telephony = navigator.mozTelephony;
    if (telephony && !this.listeningCallschanged) {
      this.listeningCallschanged = true;
      telephony.addEventListener('callschanged', this);
    }
  },

  removeCallListener: function sb_addCallListener() {
    var telephony = navigator.mozTelephony;
    if (telephony) {
      this.listeningCallschanged = false;
      telephony.removeEventListener('callschanged', this);
    }
  },

  toggleTimeLabel: function sb_toggleTimeLabel(enable) {
    var icon = this.icons.time;
    if (enable) {
      this.clock.start(this.update.time.bind(this));
    } else {
      this.clock.stop();
    }
    icon.hidden = !enable;
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

  updateEmergencyCbNotification:
    function sb_updateEmergencyCbNotification(show) {
    var icon = this.icons.emergencyCbNotification;
    if (!show) {
      icon.hidden = true;
      return;
    }

    icon.hidden = false;
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

    // Create signal elements based on the number of SIM slots.
    var conns = window.navigator.mozMobileConnections;
    if (conns) {
      var sbConnections = document.getElementById('statusbar-connections');
      var multipleSims = (conns.length > 1);
      sbConnections.dataset.multiple = multipleSims;
      this.icons.signals = {};
      this.icons.data = {};
      for (var i = conns.length - 1; i >= 0; i--) {
        var signal = document.createElement('div');
        var data = document.createElement('div');
        signal.className = 'sb-icon sb-icon-signal statusbar-signal';
        signal.dataset.level = '5';
        if (multipleSims) {
          signal.dataset.index = i + 1;
        }
        data.className = 'sb-icon statusbar-data';
        data.hidden = true;

        sbConnections.appendChild(signal);
        sbConnections.appendChild(data);
        this.icons.signals[i] = signal;
        this.icons.data[i] = data;
      }
    }

    this.element = document.getElementById('statusbar');
    this.screen = document.getElementById('screen');
    this.attentionBar = document.getElementById('attention-bar');
  }
};

if (navigator.mozL10n.readyState == 'complete' ||
    navigator.mozL10n.readyState == 'interactive') {
  StatusBar.init();
} else {
  window.addEventListener('localized', function statusbar_init() {
    window.removeEventListener('localized', statusbar_init);
    StatusBar.init();
  });
}
