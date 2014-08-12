/**
  Copyright 2012, Mozilla Foundation

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

/*global Clock, SettingsListener */
/*global SimPinDialog, TouchForwarder */
/*global MobileOperator, SIMSlotManager, System */

'use strict';

(function(exports) {
  var StatusBar = function() {};
  StatusBar.IMPORTS = [
    'js/clock.js',
    'js/touch_forwarder.js'
  ];
  System.create(StatusBar, {
    height: {
      configurable: false,
      get: function() {
        if (this.screen.classList.contains('active-statusbar')) {
          return this.attentionBar.offsetHeight;
        } else if (System.fullscreenMode) {
          return 0;
        } else {
          return this._cacheHeight ||
                 (this._cacheHeight = this.element.getBoundingClientRect().height);
        }
      }
    }
  }, {
    /* all elements that are children nodes of the status bar */
    ELEMENTS: ['notification', 'emergency-cb-notification', 'time', 'connections',
      'battery', 'wifi', 'data', 'flight-mode', 'network-activity', 'tethering',
      'alarm', 'bluetooth', 'mute', 'headphones', 'bluetooth-headphones',
      'bluetooth-transferring', 'recording', 'sms', 'geolocation', 'usb', 'label',
      'system-downloads', 'call-forwardings', 'playing', 'nfc'],

    // The indices indicate icons priority (lower index = highest priority)
    // In each subarray:
    // * Index 0 is the icon id
    // * Index 1 is the icon element width or null if size is variable
    PRIORITIES: [
      ['emergency-cb-notification', 16 + 5],
      ['battery', 25 + 5],
      ['recording', 16 + 5],
      ['flight-mode', 16 + 5],
      ['wifi', 16 + 5],
      ['connections', null], // Width can change
      ['time', null], // Width can change
      ['geolocation', 16 + 5],
      ['network-activity', 16 + 5],
      ['tethering', 16 + 5],
      ['system-downloads', 16 + 5],
      ['bluetooth-transferring', 16 + 5],
      ['bluetooth', 16 + 5],
      ['nfc', 16 + 5],
      ['usb', 16 + 5],
      ['notification', 32 + 5],
      ['alarm', 16 + 5],
      ['bluetooth-headphones', 16 + 5],
      ['mute', 16 + 5],
      ['call-forwardings', null], // Width can change
      ['playing', 16 + 5],
      ['headphones', 16 + 5]
      //['sms' 16 + 5], // Not currently implemented.
      //['label' 16 + 5], // Only visible in the maximized status bar.
    ],

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

    nfcActive: false,

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
    clock: null,

    name: 'StatusBar',

    _start: function() {
      this.clock = new Clock();
      this._touchForwarder = new TouchForwarder();
      this.getAllElements();

      // cache height.
      this._cacheHeight = this.element.getBoundingClientRect().height;

      this.listeningCallschanged = false;

      // Refresh the time to reflect locale changes
      this.toggleTimeLabel(true);

      var settings = {
        'ril.radio.disabled': ['signal', 'data'],
        'airplaneMode.status': ['flightMode'],
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
        'ril.cf.enabled': ['callForwarding'],
        'operatorResources.data.icon': ['iconData']
      };

      var setSettingsListener = (settingKey) => {
        SettingsListener.observe(settingKey, false,
          (value) => {
            this.settingValues[settingKey] = value;
            settings[settingKey].forEach(
              (name) => this.update[name].call(this)
            );
          }
        );
        this.settingValues[settingKey] = false;
      };
      for (var key in settings) {
        setSettingsListener(key);
      }
      // Listen to 'attentionscreenshow/hide' from attention_screen.js
      window.addEventListener('attentionscreenshow', this);
      window.addEventListener('attentionscreenhide', this);

      // Listen to 'screenchange' from screen_manager.js
      window.addEventListener('screenchange', this);

      // for iac connection
      window.addEventListener('iac-change-appearance-statusbar', this);

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
      // Listen to Custom event send by 'media_recording.js'
      window.addEventListener('recordingEvent', this);
      // Listen to Custom event send by 'nfc_manager.js'
      window.addEventListener('nfc-state-changed', this);

      // 'bluetoothconnectionchange' fires when the overall bluetooth connection
      //  changes.
      // 'bluetoothprofileconnectionchange' fires when a bluetooth connection of
      //  a specific profile changes.
      window.addEventListener('bluetoothconnectionchange', this);
      window.addEventListener('bluetoothprofileconnectionchange', this);

      // Listen to 'moztimechange'
      window.addEventListener('moztimechange', this);

      // Listen to 'lockscreen-appopened', 'lockscreen-appclosed', and
      // 'lockpanelchange' in order to correctly set the visibility of
      // the statusbar clock depending on the active lockscreen panel
      window.addEventListener('lockscreen-appopened', this);
      window.addEventListener('lockscreen-appclosed', this);
      window.addEventListener('lockpanelchange', this);

      window.addEventListener('appopened', this);
      window.addEventListener('shadowstatusbarreleased', this);

      window.addEventListener('simpinshow', this);
      window.addEventListener('simpinclose', this);

      // Listen to orientation change.
      window.addEventListener('resize', this);

      // We need to preventDefault on mouse events until
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1005815 lands
      var events = ['touchstart', 'touchmove', 'touchend',
                    'mousedown', 'mousemove', 'mouseup'];
      events.forEach(function bindEvents(name) {
        this.topPanel.addEventListener(name, this.panelHandler.bind(this));
      }, this);

      this.statusbarIcons.addEventListener('wheel', this);

      this.systemDownloadsCount = 0;
      this.setActive(true);
    },

    handleEvent: function sb_handleEvent(evt) {
      var app;
      switch (evt.type) {
        case 'shadowstatusbarreleased':
          this._dontStopEvent = false;
          break;

        case 'appopened':
          this.setAppearance('opaque');
          app = evt.detail;
          break;

        case 'screenchange':
          this.setActive(evt.detail.screenEnabled);
          break;

        case 'lockscreen-appopened':
          // Hide the clock in the statusbar when screen is locked
          //
          // It seems no need to detect the locked value because
          // when the lockscreen lock itself, the value must be true,
          // or we have some bugs.
          this.toggleTimeLabel(false);
          break;

        case 'lockscreen-appclosed':
          // Display the clock in the statusbar when screen is unlocked
          this.toggleTimeLabel(true);
          break;

        case 'attentionscreenshow':
          this.toggleTimeLabel(true);
          break;

        case 'attentionscreenhide':
          // Hide the clock in the statusbar when screen is locked
          this.toggleTimeLabel(!this.isLocked());
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

            // But we still need to consider if we're locked. So may we need to
            // hide it again.
            this.toggleTimeLabel(!this.isLocked());
          }).bind(this));
          break;

        case 'recordingEvent':
          switch (evt.detail.type) {
            case 'recording-state-changed':
              this.recordingActive = evt.detail.active;
              this.update.recording.call(this);
              break;
          }
          break;

        case 'nfc-state-changed':
          this.nfcActive = evt.detail.active;
          this.update.nfc.call(this);
          break;

        case 'mozChromeEvent':
          switch (evt.detail.type) {
            case 'geolocation-status':
              this.geolocationActive = evt.detail.active;
              this.update.geolocation.call(this);
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

        case 'wheel':
          if (evt.deltaMode === evt.DOM_DELTA_PAGE && evt.deltaY &&
            evt.deltaY < 0 && !this.isLocked()) {
            window.dispatchEvent(new CustomEvent('statusbarwheel'));
          }
          break;

        case 'iac-change-appearance-statusbar':
          if (SimPinDialog.visible) {
            this.setAppearance('opaque');
          } else {
            this.setAppearance(evt.detail);
          }
          break;

        case 'simpinshow':
          this.setAppearance('opaque');
          break;

        case 'simpinclose':
          this.setAppearance('semi-transparent');
          break;

        case 'resize':
          // Reprioritize icons when orientation changes.
          this._updateIconVisibility();
          break;
      }
    },

    _startX: null,
    _startY: null,
    _touchStart: null,
    _touchForwarder: null,
    _shouldForwardTap: false,
    _dontStopEvent: false,

    _getMaximizedStatusBarWidth: function sb_getMaximizedStatusBarWidth() {
      // Let's consider the style of the status bar:
      // * padding-right: 0.8rem;
      return window.innerWidth - 8;
    },

    _getMinimizedStatusBarWidth: function sb_getMinimizedStatusBarWidth() {
      // The url bar takes approx. 50% of the total screen width in portrait.
      // This formula reflects the CSS styling applied to it when minimized:
      // * width: calc(100% - 8rem);
      // * transform: scaleX(0.6521);
      // * margin-left: 0.5rem;
      var urlBarWidth = ((window.innerWidth - 80) * 0.6521) - 5;
      // Then we consider the style of the status bar:
      // * padding-right: 0.8rem;
      return window.innerWidth - urlBarWidth - 8;
    },

    _updateIconVisibility: function sb_updateIconVisibility() {
      // Let's refresh the minimized clone.
      this.cloneStatusbar();

      var maximizedStatusBarWidth = this._getMaximizedStatusBarWidth();
      var minimizedStatusBarWidth = this._getMinimizedStatusBarWidth();

      this.PRIORITIES.forEach(function(iconObj) {
        var iconId = iconObj[0];
        var icon = this.icons[this.toCamelCase(iconId)];

        if (!icon || icon.hidden) {
          return;
        }

        var className = 'sb-hide-' + iconId;

        if (maximizedStatusBarWidth < 0) {
          this.statusbarIcons.classList.add(className);
          return;
        }

        this.statusbarIcons.classList.remove(className);
        this.statusbarIconsMin.classList.remove(className);

        var iconWidth = this._getIconWidth(iconObj);

        maximizedStatusBarWidth -= iconWidth;
        if (maximizedStatusBarWidth < 0) {
          // Add a class to the container so that both status bars inherit it.
          this.statusbarIcons.classList.add(className);
          return;
        }

        minimizedStatusBarWidth -= iconWidth;
        if (minimizedStatusBarWidth < 0) {
          // This icon needs to be hidden on the minimized status bar only.
          this.statusbarIconsMin.classList.add(className);
        }
      }.bind(this));
    },

    _getIconWidth: function(iconObj) {
      var iconWidth = iconObj[1];

      if (!iconWidth) {
        // The width of this icon is not static.
        var icon = this.icons[this.toCamelCase(iconObj[0])];
        var style = window.getComputedStyle(icon);
        iconWidth = icon.clientWidth +
          parseInt(style.marginLeft, 10) +
          parseInt(style.marginRight, 10);
      }

      return iconWidth;
    },

    panelHandler: function sb_panelHandler(evt) {
      // Do not forward events if FTU is running
      if (System.runningFTU) {
        return;
      }

      if (this._dontStopEvent) {
        return;
      }

      // If system is at fullscreen mode, let utility tray to handle the event.
      if (System.fullscreenMode) {
        return;
      }

      var app = System.topMostAppWindow;

      evt.stopImmediatePropagation();
      evt.preventDefault();

      var touch;
      var timeout = false;
      var transform = '';
      switch (evt.type) {
        case 'touchstart':
          var iframe = app.iframe;
          this._touchForwarder.destination = iframe;
          this._touchStart = evt;
          this._shouldForwardTap = true;


          touch = evt.changedTouches[0];
          this._startX = touch.clientX;
          this._startY = touch.clientY;
          break;

        case 'touchmove':
          touch = evt.touches[0];
          var height = this._cacheHeight;
          var deltaX = touch.clientX - this._startX;
          var deltaY = touch.clientY - this._startY;

          if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            this._shouldForwardTap = false;
          }

          var translate = Math.min(deltaY, height);
          transform = 'translateY(calc(' + translate + 'px - 100%)';

          if (translate == height) {
            if (this._touchStart) {
              this._touchForwarder.forward(this._touchStart);
              this._touchStart = null;
            }
            this._touchForwarder.forward(evt);
          }
          break;

        case 'touchend':
          if (this._touchStart) {
            if (this._shouldForwardTap) {
              this._touchForwarder.forward(this._touchStart);
              this._touchForwarder.forward(evt);
              this._touchStart = null;
            }
            this._dontStopEvent = false;
          } else {
            // If we already forwarded the touchstart it means the bar
            // if fully open, releasing after a timeout.
            this._dontStopEvent = true;
            this._touchForwarder.forward(evt);
            timeout = true;
          }

          break;
      }

      // XXX: We should broadcast here but we don't want the event delay.
      app && app.broadcast('shadow' + evt.type, {
        timeout: timeout,
        transform: transform
      });
    },

    setActive: function sb_setActive(active) {
      var self = this,
          battery,
          conns;
      this.active = active;
      if (active) {
        battery = window.navigator.battery;
        if (battery) {
          battery.addEventListener('chargingchange', this);
          battery.addEventListener('levelchange', this);
          battery.addEventListener('statuschange', this);
          this.update.battery.call(this);
        }

        conns = window.navigator.mozMobileConnections;
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
        this.toggleTimeLabel(!this.isLocked());
      } else {
        battery = window.navigator.battery;
        if (battery) {
          battery.removeEventListener('chargingchange', this);
          battery.removeEventListener('levelchange', this);
          battery.removeEventListener('statuschange', this);
        }

        conns = window.navigator.mozMobileConnections;
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
      iconData: function sb_updateIconData(aData) {
        var dataIconValues = this.settingValues['operatorResources.data.icon'];
        if (!dataIconValues) {
          return;
        }

        for (var key in dataIconValues) {
          //Change only dataIcon values that actually really know
          if (this.mobileDataIconTypes[key]) {
            this.mobileDataIconTypes[key] = dataIconValues[key];
          }
        }
      },

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

        var timeFormat = _('shortTimeFormat').replace('%p', '<span>%p</span>');
        var formatted = f.localeFormat(now, timeFormat);
        this.icons.time.innerHTML = formatted;

        var label = this.icons.label;
        var l10nArgs = JSON.parse(label.dataset.l10nArgs || '{}');
        l10nArgs.date = f.localeFormat(now, _('statusbarDateFormat'));
        label.dataset.l10nArgs = JSON.stringify(l10nArgs);
        this.update.label.call(this);

        this._updateIconVisibility();
      },

      battery: function sb_updateBattery() {
        var battery = window.navigator.battery;
        if (!battery) {
          return;
        }

        var icon = this.icons.battery;

        icon.dataset.charging = battery.charging;
        var level = Math.floor(battery.level * 10) * 10;
        icon.dataset.level = level;
        icon.setAttribute('aria-label', navigator.mozL10n.get(battery.charging ?
          'statusbarBatteryCharging' : 'statusbarBattery', {
            level: level
          }));
      },

      networkActivity: function sb_updateNetworkActivity() {
        // Each time we receive an update, make network activity indicator
        // show up for 500ms.

        var icon = this.icons.networkActivity;

        clearTimeout(this._networkActivityTimer);
        icon.hidden = false;

        this._networkActivityTimer = setTimeout(function hideNetActivityIcon() {
          icon.hidden = true;
          this._updateIconVisibility();
        }.bind(this), 500);

        this._updateIconVisibility();
      },

      flightMode: function sb_flightMode() {
        var flightModeIcon = this.icons.flightMode;
        var status = this.settingValues['airplaneMode.status'];

        if (status === 'enabled') {
          flightModeIcon.hidden = false;
        } else if (status === 'disabled') {
          flightModeIcon.hidden = true;
        }

        this._updateIconVisibility();
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

          if (!voice) {
            continue;
          }

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
            icon.setAttribute('aria-label', _('noSimCard'));
          } else if (data && data.connected && data.type.startsWith('evdo')) {
            // "Carrier" / "Carrier (Roaming)" (EVDO)
            // Show signal strength of data call as EVDO only supports data call.
            this.updateSignalIcon(icon, data);
          } else if (voice.connected || self.hasActiveCall() &&
              navigator.mozTelephony.active.serviceId === index) {
            // "Carrier" / "Carrier (Roaming)"
            // If voice.connected is false but there is an active call, we should
            // check whether the service id of that call equals the current index
            // of the target sim card. If yes, that means the user is making an
            // emergency call using the target sim card. In such case we should
            // also display the signal bar as the normal cases.
            this.updateSignalIcon(icon, voice);
          } else if (simslot.isLocked()) {
            // SIM locked
            // We check if the sim card is locked after checking hasActiveCall
            // because we still need to show the siganl bars in the case of
            // making emergency calls when the sim card is locked.
            icon.hidden = true;
          } else {
            // "No Network" / "Emergency Calls Only (REASON)" / trying to connect
            icon.dataset.level = -1;
            // emergencyCallsOnly is always true if voice.connected is false. Show
            // searching icon if the device is searching. Or show the signal bars
            // with a red "x", which stands for emergency calls only.
            icon.dataset.searching = (voice.state === 'searching');
            delete icon.dataset.roaming;
            icon.setAttribute('aria-label', _(icon.dataset.searching ?
              'statusbarSignalNoneSearching' : 'emergencyCallsOnly'));
          }
        }

        this.updateConnectionsVisibility();
        this.refreshCallListener();

        this._updateIconVisibility();
      },

      data: function sb_updateSignal() {
        var conns = window.navigator.mozMobileConnections;
        if (!conns) {
          this.updateConnectionsVisibility();
          return;
        }

        var self = this;
        for (var index = 0; index < conns.length; index++) {
          var conn = conns[index];
          var data = conn.data;
          var icon = self.icons.data[index];

          if (!data) {
            continue;
          }

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
          icon.setAttribute('aria-hidden', !!icon.textContent);
        }

        this.updateConnectionsVisibility();
        this.refreshCallListener();

        this._updateIconVisibility();
      },

      wifi: function sb_updateWifi() {
        var wifiManager = window.navigator.mozWifiManager;
        if (!wifiManager) {
          return;
        }

        var icon = this.icons.wifi;
        var wasHidden = icon.hidden;

        if (!this.settingValues['wifi.enabled']) {
          icon.hidden = true;
          if (!wasHidden) {
            this.update.data.call(this);
          }

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
            icon.setAttribute('aria-label', navigator.mozL10n.get(
              'statusbarWiFiConnecting'));

            break;

          case 'connected':
            icon.hidden = false;

            if (icon.dataset.connecting) {
              delete icon.dataset.connecting;
            }
            var level = Math.floor(
              wifiManager.connectionInformation.relSignalStrength / 25);
            icon.dataset.level = level;
            icon.setAttribute('aria-label', navigator.mozL10n.get(
              'statusbarWiFiConnected', {level: level}));

            break;
        }

        if (icon.hidden !== wasHidden) {
          this.update.data.call(this);
        }

        this._updateIconVisibility();
      },

      tethering: function sb_updateTethering() {
        var icon = this.icons.tethering;
        icon.hidden = !(this.settingValues['tethering.usb.enabled'] ||
                        this.settingValues['tethering.wifi.enabled']);

        icon.dataset.active =
          (this.settingValues['tethering.wifi.connectedClients'] !== 0) ||
          (this.settingValues['tethering.usb.connectedClients'] !== 0);

        this.updateIconLabel(icon, 'tethering', icon.dataset.active);

        this._updateIconVisibility();
      },

      bluetooth: function sb_updateBluetooth() {
        var icon = this.icons.bluetooth;

        icon.hidden = !this.settingValues['bluetooth.enabled'];
        icon.dataset.active = System.bluetoothConnected;
        this.updateIconLabel(icon, 'bluetooth', icon.dataset.active);

        this._updateIconVisibility();
      },

      bluetoothProfiles: function sv_updateBluetoothProfiles() {
        var bluetoothHeadphoneIcon = this.icons.bluetoothHeadphones;
        var bluetoothTransferringIcon = this.icons.bluetoothTransferring;

        bluetoothHeadphoneIcon.hidden =
          !System.isBTProfileConnected('a2dp');

        bluetoothTransferringIcon.hidden =
          !System.isBTProfileConnected('opp');

        this._updateIconVisibility();
      },

      alarm: function sb_updateAlarm() {
        this.icons.alarm.hidden = !this.settingValues['alarm.enabled'];

        this._updateIconVisibility();
      },

      mute: function sb_updateMute() {
        var icon = this.icons.mute;
        icon.hidden = (this.settingValues['audio.volume.notification'] !== 0);
        this.updateIconLabel(icon,
          (this.settingValues['vibration.enabled'] === true) ?
            'vibration' : 'mute');

        this._updateIconVisibility();
      },

      vibration: function sb_vibration() {
        var icon = this.icons.mute;
        var vibrate = (this.settingValues['vibration.enabled'] === true);
        if (vibrate) {
          icon.classList.add('vibration');
          this.updateIconLabel(icon, 'vibration');
        } else {
          icon.classList.remove('vibration');
          this.updateIconLabel(icon, 'mute');
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

        this._updateIconVisibility();
      },

      sms: function sb_updateSms() {
        // We are not going to show this for v1

        // this.icon.sms.hidden = ?
        // this.icon.sms.dataset.num = ?;

        //this._updateIconVisibility();
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

        this._updateIconVisibility();
      },

      usb: function sb_updateUsb() {
        var icon = this.icons.usb;
        icon.hidden = !this.umsActive;

        this._updateIconVisibility();
      },

      headphones: function sb_updateHeadphones() {
        var icon = this.icons.headphones;
        icon.hidden = !this.headphonesActive;

        this._updateIconVisibility();
      },

      systemDownloads: function sb_updatesystemDownloads() {
        var icon = this.icons.systemDownloads;
        icon.hidden = (this.systemDownloadsCount === 0);

        this._updateIconVisibility();
      },

      callForwarding: function sb_updateCallForwarding() {
        var icons = this.icons.callForwardingsElements;
        var states = this.settingValues['ril.cf.enabled'];
        if (states) {
          states.forEach(function(state, index) {
            icons[index].hidden = !state;
          });
        }
        this.updateCallForwardingsVisibility();

        this._updateIconVisibility();
      },

      playing: function sb_updatePlaying() {
        var icon = this.icons.playing;
        icon.hidden = !this.playingActive;

        this._updateIconVisibility();
      },

      nfc: function sb_updateNfc() {
        var icon = this.icons.nfc;
        icon.hidden = !this.nfcActive;

        this._updateIconVisibility();
      }
    },

    updateConnectionsVisibility: function sb_updateConnectionsVisibility() {
      // Iterate through connections children and show the container if at least
      // one of them is visible.
      var conns = window.navigator.mozMobileConnections;

      if (!conns) {
        return;
      }

      var icons = this.icons;
      for (var index = 0; index < conns.length; index++) {
        if (!icons.signals[index].hidden || !icons.data[index].hidden) {
          icons.connections.hidden = false;
          return;
        }
      }
      icons.connections.hidden = true;
    },

    updateCallForwardingsVisibility: function sb_updateCallFwdingsVisibility() {
      // Iterate through connections children and show the container if at least
      // one of them is visible.
      var conns = window.navigator.mozMobileConnections;

      if (!conns) {
        return;
      }

      var icons = this.icons;
      for (var index = 0; index < conns.length; index++) {
        if (!icons.callForwardingsElements[index].hidden) {
          icons.callForwardings.hidden = false;
          return;
        }
      }
      icons.callForwardings.hidden = true;
    },

    hasActiveCall: function sb_hasActiveCall() {
      var telephony = navigator.mozTelephony;
      // will return true as soon as we begin dialing
      return !!(telephony && telephony.active);
    },

    updateIconLabel: function sb_updateIconLabel(icon, type, active) {
      if (icon.hidden) {
        return;
      }
      icon.setAttribute('aria-label', navigator.mozL10n.get((active ?
        'statusbarIconOnActive-' : 'statusbarIconOn-') + type));
    },

    updateSignalIcon: function sb_updateSignalIcon(icon, connInfo) {
      icon.dataset.level = Math.ceil(connInfo.relSignalStrength / 20); // 0-5
      icon.dataset.roaming = connInfo.roaming;

      delete icon.dataset.searching;

      icon.setAttribute('aria-label', navigator.mozL10n.get(connInfo.roaming ?
        'statusbarSignalRoaming' : 'statusbarSignal', {
          level: icon.dataset.level,
          operator: connInfo.network && connInfo.network.shortName
        }
      ));
    },

    refreshCallListener: function sb_refreshCallListener() {
      // Listen to callschanged only when connected to CDMA networks and emergency
      // calls.
      var conns = window.navigator.mozMobileConnections;
      if (!conns) {
        return;
      }

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

    /*
     * It changes the appearance of the status bar. The values supported are
     * "opaque" and "semi-transparent"
     */
    setAppearance: function sb_setAppearance(value) {
      switch (value) {
        case 'opaque':
          this.background.classList.add('opaque');
          break;

        case 'semi-transparent':
          this.background.classList.remove('opaque');
          break;
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
      this.updateNotificationLabel(icon);
    },

    updateNotificationUnread: function sb_updateNotificationUnread(unread) {
      var icon = this.icons.notification;
      icon.dataset.unread = unread;
      this.updateNotificationLabel(icon);
    },

    updateNotificationLabel: function sb_updateNotificationLabel(icon) {
      icon.setAttribute('aria-label', navigator.mozL10n.get(icon.dataset.unread ?
        'statusbarNotifications-unread' : 'statusbarNotifications', {
        n: icon.dataset.num
      }));
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
      this.ELEMENTS.forEach((function createElementRef(name) {
        this.icons[this.toCamelCase(name)] =
          document.getElementById('statusbar-' + name);
      }).bind(this));

      var conns = window.navigator.mozMobileConnections;
      if (conns) {
        var multipleSims = SIMSlotManager.isMultiSIM();

        // Create signal elements based on the number of SIM slots.
        this.icons.connections.dataset.multiple = multipleSims;
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
          signal.setAttribute('role', 'listitem');
          data.setAttribute('role', 'listitem');
          data.className = 'sb-icon statusbar-data';
          data.hidden = true;

          this.icons.connections.appendChild(signal);
          this.icons.connections.appendChild(data);
          this.icons.signals[i] = signal;
          this.icons.data[i] = data;
        }

        // Create call forwarding icons.
        this.icons.callForwardings.dataset.multiple = multipleSims;
        this.icons.callForwardingsElements = {};
        for (i = conns.length - 1; i >= 0; i--) {
          var callForwarding = document.createElement('div');
          callForwarding.className = 'sb-icon sb-icon-call-forwarding';
          if (multipleSims) {
            callForwarding.dataset.index = i + 1;
          }
          callForwarding.setAttribute('role', 'listitem');
          callForwarding.setAttribute('aria-label', 'statusbarForwarding');
          this.icons.callForwardings.appendChild(callForwarding);
          this.icons.callForwardingsElements[i] = callForwarding;
        }

        this.updateConnectionsVisibility();
        this.updateCallForwardingsVisibility();
      }

      this.element = document.getElementById('statusbar');
      this.background = document.getElementById('statusbar-background');
      this.statusbarIcons = document.getElementById('statusbar-icons');
      this.statusbarIconsMax = document.getElementById('statusbar-maximized');
      this.screen = document.getElementById('screen');
      this.attentionBar = document.getElementById('attention-bar');
      this.topPanel = document.getElementById('top-panel');

      // Dummy element used at initialization.
      this.statusbarIconsMin = document.createElement('div');
      this.statusbarIcons.appendChild(this.statusbarIconsMin);

      this.cloneStatusbar();
    },

    cloneStatusbar: function() {
      this.statusbarIcons.removeChild(this.statusbarIconsMin);
      this.statusbarIconsMin = this.statusbarIconsMax.cloneNode(true);
      this.statusbarIconsMin.setAttribute('id', 'statusbar-minimized');
      this.statusbarIcons.appendChild(this.statusbarIconsMin);
    },

    // To reduce the duplicated code
    isLocked: function() {
      return System.locked;
    },

    toCamelCase: function sb_toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    },

    containerElement: document.getElementById('screen'),
    view: function() {
      return
        '<div id="statusbar-background" data-z-index-level="statusbar"></div>' +
        '<div id="statusbar" data-z-index-level="statusbar">' +
          '<!-- Rocketbar-->' +
          '<div id="rocketbar">' +
            '<form id="rocketbar-form" class="hidden">' +
              '<input id="rocketbar-input" type="text" x-inputmode="verbatim" dir="auto" ' +
               ' placeholder="Search or enter address" data-l10n-id="search-or-enter-address" value="">' +
              '</input>' +
              '<button type="button" id="rocketbar-clear" data-l10n-id="clear" aria-label="Clear"></button>' +
              '<button type="button" id="rocketbar-cancel" ' +
                ' data-l10n-id="close">Close</button>' +
            '</form>' +
          '</div>' +
          '<!-- Statusbar icons -->' +
          '<div id="statusbar-icons" role="group" data-l10n-id="statusbar">' +
            '<div id="statusbar-maximized" class="statusbar">' +
              '<!-- General -->' +
              '<div id="statusbar-time" class="sb-icon-time" role="listitem"></div>' +
              '<div id="statusbar-battery" class="sb-icon sb-icon-battery" role="listitem"></div>' +

              '<!-- Connectivity -->' +
              '<div id="statusbar-flight-mode" class="sb-icon sb-icon-flight-mode" hidden role="listitem" data-l10n-id="statusbarFlightMode"></div>' +
              '<div id="statusbar-wifi" class="sb-icon sb-icon-wifi" data-level="4" hidden role="listitem"></div>' +
              '<div id="statusbar-connections" class="sb-icon-connections" hidden role="presentation"></div>' +
              '<!-- HACK: We use images instead of divs to enforce allocation of a' +
              '     dedicated layer just for this animated icons, remove after' +
              '     https://bugzil.la/717872 gets fixed -->' +
              '<img id="statusbar-network-activity" src="style/statusbar/images/network-activity.png" class="sb-icon-network-activity" hidden role="listitem" data-l10n-id="statusbarNetworkActivity">' +
              '<div id="statusbar-tethering" class="sb-icon sb-icon-tethering" hidden role="listitem"></div>' +
              '<div id="statusbar-bluetooth" class="sb-icon sb-icon-bluetooth" hidden role="listitem"></div>' +
              '<div id="statusbar-bluetooth-transferring" class="sb-icon sb-icon-bluetooth-transferring" role="listitem" hidden data-l10n-id="statusbarBluetoothTransferring"></div>' +
              '<div id="statusbar-nfc" class="sb-icon sb-icon-nfc" hidden role="listitem" data-l10n-id="statusbarNfc"></div>' +

              '<!-- System -->' +
              '<div id="statusbar-emergency-cb-notification" class="sb-icon sb-icon-emergency-cb-notification" hidden role="listitem" data-l10n-id="statusbarEmergencyCBNotification"></div>' +
              '<!-- See note on <img> above. -->' +
              '<img id="statusbar-system-downloads" src="style/statusbar/images/system-downloads.png" class="sb-icon-system-downloads" hidden role="listitem" data-l10n-id="statusbarDownloads">' +
              '<div id="statusbar-usb" class="sb-icon sb-icon-usb" hidden role="listitem" data-l10n-id="statusbarUsb"></div>' +
              '<div id="statusbar-mute" class="sb-icon sb-icon-mute" hidden role="listitem"></div>' +
              '<div id="statusbar-recording" class="sb-icon sb-icon-recording" hidden role="listitem" data-l10n-id="statusbarRecording"></div>' +
              '<div id="statusbar-geolocation" class="sb-icon sb-icon-geolocation" hidden role="listitem" data-l10n-id="statusbarGeolocation"></div>' +
              '<div id="statusbar-call-forwardings" class="sb-icon-call-forwardings" hidden role="presentation"></div>' +
              '<div id="statusbar-bluetooth-headphones" class="sb-icon sb-icon-bluetooth-headphones" role="listitem" hidden data-l10n-id="statusbarBluetoothHeadphones"></div>' +
              '<div id="statusbar-headphones" class="sb-icon sb-icon-headphones" hidden role="listitem" data-l10n-id="statusbarHeadphones"></div>' +
              '<div id="statusbar-playing" class="sb-icon sb-icon-playing" hidden role="listitem" data-l10n-id="statusbarPlaying"></div>' +
              '<div id="statusbar-alarm" class="sb-icon sb-icon-alarm" hidden role="listitem" data-l10n-id="statusbarAlarm"></div>' +

              '<!-- Notifications -->' +
              '<div id="statusbar-notification" class="sb-start sb-icon sb-icon-notification" data-num="" hidden role="listitem"></div>' +

              '<!-- Unused -->' +
              '<div id="statusbar-sms" class="sb-icon sb-icon-sms" hidden role="listitem"></div>' +

              '<!-- Carrier & date label -->' +
              '<div id="statusbar-label" class="sb-start-upper sb-icon-label" role="listitem"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
              '<div id="top-panel" class="gesture-panel" data-z-index-level="statusbar">' +
              '</div>';
    }
  });
  exports.StatusBar = StatusBar;
}(window));
