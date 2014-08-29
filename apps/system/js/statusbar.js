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

/*global Clock, AppWindowManager, SettingsListener */
/*global TouchForwarder, FtuLauncher */
/*global MobileOperator, SIMSlotManager, System */
/*global Bluetooth */
/*global UtilityTray */

'use strict';

var StatusBar = {
  /* all elements that are children nodes of the status bar */
  ELEMENTS: ['emergency-cb-notification', 'time', 'connections',
    'battery', 'wifi', 'data', 'flight-mode', 'network-activity', 'tethering',
    'alarm', 'bluetooth', 'mute', 'headphones', 'bluetooth-headphones',
    'bluetooth-transferring', 'recording', 'sms', 'geolocation', 'usb', 'label',
    'system-downloads', 'call-forwardings', 'playing', 'nfc'],

  // The indices indicate icons priority (lower index = highest priority)
  // In each subarray:
  // * Index 0 is the icon id
  // * Index 1 is the icon element width or null if size is variable
  PRIORITIES: [
    ['emergency-cb-notification', 16 + 4],
    ['battery', 25 + 4],
    ['recording', 16 + 4],
    ['flight-mode', 16 + 4],
    ['wifi', 16 + 4],
    ['connections', null], // Width can change
    ['time', null], // Width can change
    ['geolocation', 16 + 4],
    ['network-activity', 16 + 4],
    ['tethering', 16 + 4],
    ['system-downloads', 16 + 4],
    ['bluetooth-transferring', 16 + 4],
    ['bluetooth', 16 + 4],
    ['nfc', 16 + 4],
    ['usb', 16 + 4],
    ['alarm', 16 + 4],
    ['bluetooth-headphones', 16 + 4],
    ['mute', 16 + 4],
    ['call-forwardings', null], // Width can change
    ['playing', 16 + 4],
    ['headphones', 16 + 4]
    //['sms' 16 + 4], // Not currently implemented.
    //['label' 16 + 4], // Only visible in the maximized status bar.
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
  clock: new Clock(),

  /* For other modules to acquire */
  get height() {
    if (document.mozFullScreen ||
               (AppWindowManager.getActiveApp() &&
                AppWindowManager.getActiveApp().isFullScreen())) {
      return 0;
    } else {
      return this._cacheHeight ||
             (this._cacheHeight = this.element.getBoundingClientRect().height);
    }
  },

  init: function sb_init() {
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
      'operatorResources.data.icon': ['iconData'],
      'statusbar.network-activity.disabled': ['networkActivity']
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
    // Listen to events from attention_window
    window.addEventListener('attentionopened', this);
    window.addEventListener('attentionclosed', this);

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
    // Listen to 'timeformatchange'
    window.addEventListener('timeformatchange', this);

    // Listen to 'lockscreen-appopened', 'lockscreen-appclosed', and
    // 'lockpanelchange' in order to correctly set the visibility of
    // the statusbar clock depending on the active lockscreen panel
    window.addEventListener('lockscreen-appopened', this);
    window.addEventListener('lockscreen-appclosed', this);
    window.addEventListener('lockpanelchange', this);

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
    switch (evt.type) {
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
        this._updateIconVisibility();
        break;

      case 'lockscreen-appclosed':
        // Display the clock in the statusbar when screen is unlocked
        this.toggleTimeLabel(true);
        this._updateIconVisibility();
        break;

      case 'attentionopened':
        this.toggleTimeLabel(true);
        break;

      case 'attentionclosed':
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

      case 'timeformatchange':
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

      case 'resize':
        // Reprioritize icons when orientation changes.
        this._updateIconVisibility();
        break;
    }
  },

  _startX: null,
  _startY: null,
  _releaseTimeout: null,
  _touchStart: null,
  _touchForwarder: new TouchForwarder(),
  _shouldForwardTap: false,
  _dontStopEvent: false,

  _getMaximizedStatusBarWidth: function sb_getMaximizedStatusBarWidth() {
    // Let's consider the style of the status bar:
    // * padding: 0 0.3rem;
    return window.innerWidth - (3 * 2);
  },

  _getMinimizedStatusBarWidth: function sb_getMinimizedStatusBarWidth() {
    // The url bar takes approx. 50% of the total screen width in portrait.
    // This formula reflects the CSS styling applied to it when minimized:
    // * width: calc(100% - 8rem);
    // * transform: scaleX(0.6521);
    // * margin-left: 0.5rem;
    var urlBarWidth = ((window.innerWidth - 80) * 0.6521) - 5;
    // Then we consider the style of the status bar:
    // * padding: 0 0.3rem 0 0;
    return window.innerWidth - urlBarWidth - 3;
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
    var app = AppWindowManager.getActiveApp().getTopMostWindow();
    var chromeBar = app.element.querySelector('.chrome');
    var titleBar = app.element.querySelector('.titlebar');

    // Do not forward events if FTU is running
    if (FtuLauncher.isFtuRunning()) {
      return;
    }

    if (this._dontStopEvent) {
      return;
    }

    // If the app is not a fullscreen app, let utility_tray.js handle
    // this instead.
    if (!document.mozFullScreen && !app.isFullScreen()) {
      return;
    }

    evt.stopImmediatePropagation();
    evt.preventDefault();

    var touch;
    switch (evt.type) {
      case 'touchstart':
        clearTimeout(this._releaseTimeout);

        var iframe = app.iframe;
        this._touchForwarder.destination = iframe;
        this._touchStart = evt;
        this._shouldForwardTap = true;


        touch = evt.changedTouches[0];
        this._startX = touch.clientX;
        this._startY = touch.clientY;

        chromeBar.style.transition = 'transform';
        titleBar.style.transition = 'transform';
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
        var heightThreshold = height;

        if (app && app.isFullScreen() && app.config.chrome.navigation) {
          translate = Math.min(deltaY, app.appChrome.height);
          heightThreshold = app.appChrome.height;

          titleBar.style.transform = 'translateY(calc(' +
            (translate - app.appChrome.height) + 'px)';
        } else {
          titleBar.style.transform =
            'translateY(calc(' + translate + 'px - 100%)';
        }
        chromeBar.style.transform =
          'translateY(calc(' + translate + 'px - 100%)';

        if (translate >= heightThreshold) {
          if (this._touchStart) {
            this._touchForwarder.forward(this._touchStart);
            this._touchStart = null;
          }
          this._touchForwarder.forward(evt);
        }
        break;

      case 'touchend':
        clearTimeout(this._releaseTimeout);

        if (this._touchStart) {
          if (this._shouldForwardTap) {
            this._touchForwarder.forward(this._touchStart);
            this._touchForwarder.forward(evt);
            this._touchStart = null;
          }
          this._releaseBar(titleBar);
        } else {
          // If we already forwarded the touchstart it means the bar
          // if fully open, releasing after a timeout.
          this._dontStopEvent = true;
          this._touchForwarder.forward(evt);
          this._releaseAfterTimeout(titleBar);
        }

        break;
    }
  },

  _releaseBar: function sb_releaseBar(titleBar) {
    this._dontStopEvent = false;
    var chromeBar = titleBar.parentNode.querySelector('.chrome');

    chromeBar.classList.remove('dragged');
    chromeBar.style.transform = '';
    chromeBar.style.transition = '';

    titleBar.classList.remove('dragged');
    titleBar.style.transform = '';
    titleBar.style.transition = '';

    clearTimeout(this._releaseTimeout);
    this._releaseTimeout = null;
  },

  _releaseAfterTimeout: function sb_releaseAfterTimeout(titleBar) {
    var chromeBar = titleBar.parentNode.querySelector('.chrome');

    var self = this;
    titleBar.style.transform = '';
    titleBar.style.transition = '';
    titleBar.classList.add('dragged');

    chromeBar.style.transform = '';
    chromeBar.style.transition = '';
    chromeBar.classList.add('dragged');

    self._releaseTimeout = setTimeout(function() {
      self._releaseBar(titleBar);
      window.removeEventListener('touchstart', closeOnTap);
    }, 5000);

    function closeOnTap(evt) {
      if (evt.target != self._touchForwarder.destination) {
        return;
      }

      window.removeEventListener('touchstart', closeOnTap);
      self._releaseBar(titleBar);
    }
    window.addEventListener('touchstart', closeOnTap);
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

      var timeFormat = window.navigator.mozHour12 ?
        _('shortTimeFormat12') : _('shortTimeFormat24');
      timeFormat = timeFormat.replace('%p', '<span>%p</span>');
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
      // XXX: Allow network activity icon to be disabled through a setting.
      // This should be removed once bug 1054220 is fixed.
      if (this.settingValues['statusbar.network-activity.disabled']) {
        return;
      }
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
      icon.dataset.active = Bluetooth.connected;
      this.updateIconLabel(icon, 'bluetooth', icon.dataset.active);

      this._updateIconVisibility();
    },

    bluetoothProfiles: function sv_updateBluetoothProfiles() {
      var bluetoothHeadphoneIcon = this.icons.bluetoothHeadphones;
      var bluetoothTransferringIcon = this.icons.bluetoothTransferring;

      bluetoothHeadphoneIcon.hidden =
        !Bluetooth.isProfileConnected(Bluetooth.Profiles.A2DP);

      bluetoothTransferringIcon.hidden =
        !Bluetooth.isProfileConnected(Bluetooth.Profiles.OPP);

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
  }
};

// unit tests call init() manually
if (navigator.mozL10n) {
  navigator.mozL10n.once(function() {
    // The utility tray and the status bar share event handling
    // for the top-panel, initialization order matters.
    StatusBar.init();
    UtilityTray.init();
  });
}
