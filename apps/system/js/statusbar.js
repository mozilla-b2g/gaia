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

/*global Clock, SettingsListener, FtuLauncher, MobileOperator,
         SIMSlotManager, Service, Bluetooth, UtilityTray, nfcManager,
         layoutManager */

'use strict';

var StatusBar = {
  /* all elements that are children nodes of the status bar */
  ELEMENTS: ['emergency-cb-notification', 'time', 'connections', 'battery',
    'wifi', 'data', 'flight-mode', 'network-activity', 'tethering', 'alarm',
    'debugging', 'bluetooth', 'mute', 'headphones', 'bluetooth-headphones',
    'bluetooth-transferring', 'recording', 'sms', 'geolocation', 'usb',
    'label', 'system-downloads', 'call-forwardings', 'playing', 'nfc'],

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
    ['debugging', 16 + 4],
    ['system-downloads', 16 + 4],
    ['geolocation', 16 + 4],
    ['network-activity', 16 + 4],
    ['tethering', 16 + 4],
    ['bluetooth-transferring', 16 + 4],
    ['bluetooth', 16 + 4],
    ['nfc', 16 + 4],
    ['usb', 16 + 4],
    ['alarm', 16 + 4],
    ['bluetooth-headphones', 16 + 4],
    ['mute', 16 + 4],
    ['call-forwardings', null], // Width can change
    ['playing', 16 + 4],
    ['headphones', 16 + 4],
    //['sms', 16 + 4], // Not currently implemented.
    ['label', null] // Only visible in the maximized status bar.
  ],

  /* Timeout for 'recently active' indicators */
  kActiveIndicatorTimeout: 5 * 1000,

  /* Whether or not status bar is actively updating or not */
  active: true,

  /* Whether or not the lockscreen is displayed */
  _inLockScreenMode: false,

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

  /* Settings to listen on for changes to statusbar icons. */
  settings: {
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
    'statusbar.network-activity.disabled': ['networkActivity'],
    'statusbar.show-am-pm': ['time'],
    'debugger.remote-mode': ['debugging']
  },

  /* Track which settings are observed, so we don't add multiple listeners. */
  observedSettings: {},

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
  systemDownloads: {},

  _minimizedStatusBarWidth: window.innerWidth,

  /**
   * Object used for handling the clock UI element, wraps all related timers
   */
  clock: new Clock(),

  /* For other modules to acquire */
  get height() {
    if (document.mozFullScreen ||
               (Service.currentApp &&
                Service.currentApp.isFullScreen())) {
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

    window.addEventListener('ftudone', this);
    window.addEventListener('ftuskip', this);
    window.addEventListener('ftuopen', this);
    window.addEventListener('apptitlestatechanged', this);
    window.addEventListener('activitytitlestatechanged', this);
    window.addEventListener('appchromecollapsed', this);
    window.addEventListener('appchromeexpanded', this);
    window.addEventListener('emergencycallbackstatechanged', this);
  },

  addSettingsListener: function sb_addSettingsListener(settingKey) {
    // Don't add observer if setting is already observered.
    if (this.observedSettings[settingKey]) {
      return;
    }
    this.observedSettings[settingKey] = true;

    SettingsListener.observe(settingKey, false,
      (value) => {
        this.settingValues[settingKey] = value;
        this.settings[settingKey].forEach(
          (name) => this.update[name].call(this)
        );
      }
    );
    this.settingValues[settingKey] = false;
  },

  /**
   * Add event listeners associated with mobile connection state.
   */
  addConnectionsListeners: function() {
    var conns = window.navigator.mozMobileConnections;
    if (conns) {
      Array.from(conns).forEach(
        (conn) => {
          conn.addEventListener('voicechange', this);
          conn.addEventListener('datachange', this);
          this.update.signal.call(this);
          this.update.data.call(this);
        }
      );
    }
  },

  /**
   * Remove event listeners associated with mobile connection state.
   */
  removeConnectionsListeners: function() {
    var conns = window.navigator.mozMobileConnections;
    if (conns) {
      Array.from(conns).forEach(
        (conn) => {
          conn.removeEventListener('voicechange', this);
          conn.removeEventListener('datachange', this);
        }
      );
    }
  },

  /**
   * Finish all initializing statusbar event handlers
   */
  finishInit: function() {
    this.createConnectionsElements();
    this.createCallForwardingsElements();

    // Refresh the time to reflect locale changes
    this.toggleTimeLabel(true);

    for (var key in this.settings) {
      this.addSettingsListener(key);
    }
    // Listen to events from attention_window
    window.addEventListener('attentionopened', this);
    window.addEventListener('attentionclosed', this);

    window.addEventListener('sheets-gesture-begin', this);
    window.addEventListener('sheets-gesture-end', this);
    window.addEventListener('utilitytraywillshow', this);
    window.addEventListener('utilitytraywillhide', this);
    window.addEventListener('utility-tray-overlayopened', this);
    window.addEventListener('utility-tray-overlayclosed', this);
    window.addEventListener('utility-tray-abortopen', this);
    window.addEventListener('utility-tray-abortclose', this);
    window.addEventListener('cardviewshown', this);
    window.addEventListener('cardviewclosed', this);
    window.addEventListener('rocketbar-deactivated', this);

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

    // Listen to 'lockscreen-appopened', 'lockscreen-appclosing', and
    // 'lockpanelchange' in order to correctly set the visibility of
    // the statusbar clock depending on the active lockscreen panel
    window.addEventListener('lockscreen-appopened', this);
    window.addEventListener('lockscreen-appclosing', this);
    window.addEventListener('lockpanelchange', this);

    // Listen to orientation change and SHB activation/deactivation.
    window.addEventListener('system-resize', this);

    window.addEventListener('attentionopened', this);
    window.addEventListener('appopening', this);
    window.addEventListener('appopened', this);
    window.addEventListener('hierarchytopmostwindowchanged', this);
    window.addEventListener('activityopened', this);
    window.addEventListener('activitydestroyed', this);
    window.addEventListener('homescreenopening', this);
    window.addEventListener('homescreenopened', this);
    window.addEventListener('stackchanged', this);

    // Listen to updates dialog
    window.addEventListener('updatepromptshown', this);
    window.addEventListener('updateprompthidden', this);

    // Track Downloads via the Downloads API.
    var mozDownloadManager = navigator.mozDownloadManager;
    if (mozDownloadManager) {
      mozDownloadManager.addEventListener('downloadstart', this);
    }

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

    UtilityTray.init();
  },

  handleEvent: function sb_handleEvent(evt) {
    switch (evt.type) {
      case 'emergencycallbackstatechanged':
        this.updateEmergencyCbNotification(evt.detail);
        break;

      case 'screenchange':
        this.setActive(evt.detail.screenEnabled);
        this._updateIconVisibility();
        break;

      case 'lockscreen-appopened':
        // Hide the clock in the statusbar when screen is locked
        //
        // It seems no need to detect the locked value because
        // when the lockscreen lock itself, the value must be true,
        // or we have some bugs.
        this.toggleTimeLabel(false);
        this._updateIconVisibility();
        this._inLockScreenMode = true;
        this.setAppearance();
        break;

      case 'lockscreen-appclosing':
        // Display the clock in the statusbar when screen is unlocked
        this.toggleTimeLabel(true);
        this._updateIconVisibility();
        this._inLockScreenMode = false;
        this.setAppearance();
        break;

      case 'attentionopened':
        this.toggleTimeLabel(true);
        this.element.classList.add('maximized');
        this.element.classList.remove('light');
        break;

      case 'attentionclosed':
        // Hide the clock in the statusbar when screen is locked
        this.toggleTimeLabel(!this.isLocked());
        break;

      case 'sheets-gesture-begin':
        this.element.classList.add('hidden');
        this.pauseUpdate(evt.type);
        break;

      case 'utilitytraywillshow':
      case 'utilitytraywillhide':
      case 'cardviewshown':
        this.pauseUpdate(evt.type);
        break;

      case 'utility-tray-overlayopened':
      case 'utility-tray-overlayclosed':
      case 'utility-tray-abortopen':
      case 'utility-tray-abortclose':
      case 'cardviewclosed':
        this.resumeUpdate(evt.type);
        break;

      case 'lockpanelchange':
        if (this.screen.classList.contains('locked')) {
          // Display the clock in the statusbar if on Emergency Call screen
          var isHidden = (evt.detail.panel !== 'emergency-call');
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
        this.setActiveNfc(evt.detail.active);
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
            // The camera recording fires a audio-channel-changed event to kill
            // existing "content" audio channels, in this case we don't show the
            // playing icon.
            var active = evt.detail.channel === 'content' &&
              !this.recordingActive;
            if (this.playingActive === active) {
              break;
            }
            this.playingActive = active;
            this.update.playing.call(this);
            break;
        }

        break;

      case 'moznetworkupload':
      case 'moznetworkdownload':
        this.update.networkActivity.call(this);
        break;

      case 'ftuopen':
        // If we are upgrading, we can show all the icons.
        if (FtuLauncher.isFtuUpgrading()) {
          this.finishInit();
        } else {
          // When first launching FTU, only show battery icon
          // and listen for iac step events to show more icons.
          this.setActiveBattery(true);
          this._updateIconVisibility();
          window.addEventListener('iac-ftucomms', this);
        }
        break;

      case 'ftudone':
        window.removeEventListener('iac-ftucomms', this);
        this.finishInit();
        break;

      case 'ftuskip':
        this.finishInit();
        break;

      case 'iac-ftucomms':
        if (evt.detail.type === 'step') {
          this.handleFtuStep(evt.detail.hash);
        }
        break;

      case 'wheel':
        if (evt.deltaMode === evt.DOM_DELTA_PAGE && evt.deltaY &&
          evt.deltaY < 0 && !this.isLocked()) {
          window.dispatchEvent(new CustomEvent('statusbarwheel'));
        }
        break;

      case 'system-resize':
        // Reprioritize icons when:
        // * Screen orientation changes
        // * Software home button is enabled/disabled
        this._updateMinimizedStatusBarWidth();
        break;

      case 'homescreenopening':
      case 'appopening':
        this.element.classList.add('hidden');
        break;

      case 'sheets-gesture-end':
        this.element.classList.remove('hidden');
        this.resumeUpdate(evt.type);
        break;

      case 'stackchanged':
      case 'rocketbar-deactivated':
        this.setAppearance();
        this.element.classList.remove('hidden');
        break;

      case 'appchromecollapsed':
        this.setAppearance();
        this._updateMinimizedStatusBarWidth();
        break;

      case 'appopened':
      case 'hierarchytopmostwindowchanged':
      case 'appchromeexpanded':
        this.setAppearance();
        this.element.classList.remove('hidden');
        this._updateMinimizedStatusBarWidth();
        break;

      case 'activityopened':
        this._updateMinimizedStatusBarWidth();
        /* falls through */
      case 'apptitlestatechanged':
      case 'activitytitlestatechanged':
        this.setAppearance();
        if (!this.isPaused()) {
          this.element.classList.remove('hidden');
        }
        break;
      case 'homescreenopened':
        // In some cases, if the user has been switching apps so fast and
        // quickly he press the home button, we might miss the
        // |sheets-gesture-end| event so we must resume the statusbar
        // if needed
        this.setAppearance();
        this.resumeUpdate(evt.type);
        this.element.classList.remove('hidden');
        this.element.classList.remove('fullscreen');
        this.element.classList.remove('fullscreen-layout');
        break;
      case 'activitydestroyed':
        this._updateMinimizedStatusBarWidth();
        break;
      case 'downloadstart':
        // New download, track it so we can show or hide the active downloads
        // indicator. If you think this logic needs to change, think really hard
        // about it and then come and ask @nullaus
        this.addSystemDownloadListeners(evt.download);
        break;
       case 'updatepromptshown':
          this.element.classList.remove('light');
          break;
        case 'updateprompthidden':
          this.setAppearance(Service.currentApp);
          break;
    }
  },

  addSystemDownloadListeners: function(download) {
    var handler = function handleDownloadStateChange(downloadEvent) {
      var download = downloadEvent.download;
      switch(download.state) {
        case 'downloading':
          // If this download has not already been tracked as actively
          // downloading we'll add it to our list and increment the
          // downloads counter.
          if (!this.systemDownloads[download.id]) {
            this.incSystemDownloads();
            this.systemDownloads[download.id] = true;
          }
          break;
        // Once the download is finalized, and only then, is it safe to
        // remove our state change listener. If we remove it before then
        // we are likely to miss paused or errored downloads being restarted
        case 'finalized':
          download.removeEventListener('statechange', handler);
          break;
        // All other state changes indicate the download is no longer
        // active, if we were previously tracking the download as active
        // we'll decrement the counter now and remove it from active
        // download status.
        case 'stopped':
        case 'succeeded':
          if (this.systemDownloads[download.id]) {
            this.decSystemDownloads();
            delete this.systemDownloads[download.id];
          }
          break;
        default:
          console.warn('Unexpected download state = ', download.state);
      }
    }.bind(this);

    download.addEventListener('statechange', handler);
  },

  setAppearance: function() {
    // The statusbar is always maximised when the phone is locked.
    if (this._inLockScreenMode) {
      this.element.classList.add('maximized');
      return;
    }

    var app = Service.query('getTopMostWindow');
    // In some cases, like when opening an app from the task manager, there
    // temporarily is no top most window, so we cannot set an appearance.
    if (!app) {
      return;
    }

    // Fetch top-most window to figure out color theming.
    var topWindow = app.getTopMostWindow();
    if (topWindow) {
      this.element.classList.toggle('light',
        !!(topWindow.appChrome && topWindow.appChrome.useLightTheming())
      );

      this.element.classList.toggle('fullscreen',
        topWindow.isFullScreen()
      );

      this.element.classList.toggle('fullscreen-layout',
        topWindow.isFullScreenLayout()
      );
    }

    this.element.classList.toggle('maximized',
      app.isHomescreen || app.isAttentionWindow ||
      !!(app.appChrome && app.appChrome.isMaximized()));
  },

  _getMaximizedStatusBarWidth: function sb_getMaximizedStatusBarWidth() {
    // Let's consider the style of the status bar:
    // * padding: 0 0.3rem;
    return Math.round(layoutManager.width - (3 * 2));
  },

  _updateMinimizedStatusBarWidth: function sb_updateMinimizedStatusBarWidth() {
    var app = Service.currentApp;
    app = app && app.getTopMostWindow();
    var appChrome = app && app.appChrome;

    // Only calculate the search input width when the chrome is minimized
    // Bug 1118025 for more info
    if (appChrome && appChrome.isMaximized()) {
      this._updateIconVisibility();
      return;
    }

    // Get the actual width of the rocketbar, and determine the remaining
    // width for the minimized statusbar.
    var element = appChrome && appChrome.element &&
      appChrome.element.querySelector('.urlbar .chrome-title-container');

    if (element) {
      this._minimizedStatusBarWidth = Math.round(
          layoutManager.width -
          element.getBoundingClientRect().width -
          // Remove padding and margin
          5 - 3);
    } else {
      this._minimizedStatusBarWidth = this._getMaximizedStatusBarWidth();
    }

    this._updateIconVisibility();
  },

  _paused: 0,

  _eventGroupStates: {
    utilitytrayopening: false,
    utilitytrayclosing: false,
    cardview: false,
    sheetsgesture: false,
    marionette: false
  },

  pauseUpdate: function sb_pauseUpdate(evtType) {
    var eventGroup = this._eventTypeToEventGroup(evtType);
    if (this._eventGroupStates[eventGroup]) {
      return;
    }
    this._eventGroupStates[eventGroup] = true;

    this._paused++;
  },

  resumeUpdate: function sb_resumeUpdate(evtType) {
    var eventGroup = this._eventTypeToEventGroup(evtType);
    if (!this._eventGroupStates[eventGroup]) {
      return;
    }
    this._eventGroupStates[eventGroup] = false;

    this._paused--;
    if (!this.isPaused()) {
      this._updateIconVisibility();
    }
  },

  /**
   * Map event types to event groups.
   *
   * @param {string} evtType
   * @returns {string}
   */
  _eventTypeToEventGroup: function sb_eventTypeToEventGroup(evtType) {
    switch (evtType) {
      case 'utilitytraywillshow':
      case 'utility-tray-overlayopened':
      case 'utility-tray-abortclose':
        return 'utilitytrayopening';
      case 'utilitytraywillhide':
      case 'utility-tray-overlayclosed':
      case 'utility-tray-abortopen':
        return 'utilitytrayclosing';
      case 'cardviewshown':
      case 'cardviewclosed':
        return 'cardview';
      case 'sheets-gesture-begin':
      case 'sheets-gesture-end':
      case 'homescreenopened':
        return 'sheetsgesture';
    }

    return evtType;
  },

  isPaused: function sb_isPaused() {
    return this._paused > 0;
  },

  _updateIconVisibility: function sb_updateIconVisibility() {
    if (this.isPaused()) {
      return;
    }

    // Let's refresh the minimized clone.
    this.cloneStatusbar();

    var maximizedStatusBarWidth = this._getMaximizedStatusBarWidth();
    var minimizedStatusBarWidth = this._minimizedStatusBarWidth;

    this.PRIORITIES.forEach(function sb_updateIconVisibilityForEach(iconObj) {
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

  _getIconWidth: function sb_getIconWidth(iconObj) {
    var iconWidth = iconObj[1];

    if (!iconWidth) {
      // The width of this icon is not static.
      var icon = this.icons[this.toCamelCase(iconObj[0])];
      iconWidth = this._getWidthFromDomElementWidth(icon);
    }

    return iconWidth;
  },

  _getWidthFromDomElementWidth: function sb_getWidthFromDomElementWidth(icon) {
    var style = window.getComputedStyle(icon);
    var iconWidth = icon.clientWidth +
      parseInt(style.marginLeft, 10) +
      parseInt(style.marginRight, 10);

    return iconWidth;
  },

  _getTimeFormat: function sb_getTimeFormat(timeFormat) {
    if (this.settingValues['statusbar.show-am-pm']) {
      timeFormat = timeFormat.replace('%p', '<span>%p</span>');
    } else {
      timeFormat = timeFormat.replace('%p', '').trim();
    }

    return timeFormat;
  },

  panelHandler: function sb_panelHandler(evt) {
    // Do not forward events if FTU is running
    if (FtuLauncher.isFtuRunning()) {
      return;
    }

    // Do not forward events is utility-tray is active
    if (UtilityTray.active) {
      return;
    }

    var app = Service.query('getTopMostWindow');
    app && app.handleStatusbarTouch(evt, this._cacheHeight);
  },

  /**
   * Show pertinent statusbar icons as we recieve FTU step events.
   */
  handleFtuStep: function sb_handleFtuStep(stepHash) {
    switch (stepHash) {
      case '#languages':
        this.createConnectionsElements();
        this._updateIconVisibility();
        this.addConnectionsListeners();
        this.addSettingsListener('ril.data.enabled');
        break;

      case '#wifi':
        this.setActiveWifi(true);
        this.addSettingsListener('wifi.enabled');
        this._updateIconVisibility();
        break;

      case '#date_and_time':
        this.toggleTimeLabel(true);
        this._updateIconVisibility();
        break;
    }
  },

  setActive: function sb_setActive(active) {
    this.active = active;

    this.setActiveBattery(active);

    if (active) {
      this.setActiveNfc(nfcManager.isActive());

      this.addConnectionsListeners();

      window.addEventListener('simslot-iccinfochange', this);

      window.addEventListener('wifi-statuschange', this);

      this.setActiveWifi(true);


      window.addEventListener('moznetworkupload', this);
      window.addEventListener('moznetworkdownload', this);

      this.refreshCallListener();
      this.toggleTimeLabel(!this.isLocked());
    } else {
      this.removeConnectionsListeners();

      window.removeEventListener('simslot-iccinfochange', this);

      window.removeEventListener('wifi-statuschange', this);

      window.removeEventListener('moznetworkupload', this);
      window.removeEventListener('moznetworkdownload', this);

      this.removeCallListener();
      // Always prevent the clock from refreshing itself when the screen is off
      this.toggleTimeLabel(false);
    }
  },

  setActiveBattery: function sb_setActiveBattery(active) {
    var battery = window.navigator.battery;
    if (!battery) {
      return;
    }

    if (active) {
      battery.addEventListener('chargingchange', this);
      battery.addEventListener('levelchange', this);
      battery.addEventListener('statuschange', this);
      this.update.battery.call(this);
    } else {
      battery.removeEventListener('chargingchange', this);
      battery.removeEventListener('levelchange', this);
      battery.removeEventListener('statuschange', this);
    }
  },

  setActiveWifi: function sb_setActiveWifi(active) {
    if (active) {
      var wifiManager = window.navigator.mozWifiManager;
      if (wifiManager) {
        wifiManager.connectionInfoUpdate = this.update.wifi.bind(this);
      }

      this.update.wifi.call(this);
    }
  },

  setActiveNfc: function sb_setActiveNfc(active) {
    this.nfcActive = active;
    this.update.nfc.call(this);
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

      var self = this;
      var label = this.icons.label;
      var previousLabelContent = label.textContent;
      var l10nArgs = JSON.parse(label.dataset.l10nArgs || '{}');

      if (!conn || !conn.voice || !conn.voice.connected ||
          conn.voice.emergencyCallsOnly) {
        delete l10nArgs.operator;
        label.dataset.l10nArgs = JSON.stringify(l10nArgs);

        label.dataset.l10nId = '';
        label.textContent = l10nArgs.date;

        if (previousLabelContent !== label.textContent) {
          updateLabelWidth();
        }

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

      if (previousLabelContent !== label.textContent) {
        updateLabelWidth();
      }

      // Update the width of the date element. Called when the content changed.
      function updateLabelWidth() {
        self.PRIORITIES.some(function(iconObj) {
          if (iconObj[0] === 'label') {
            iconObj[1] = self._getWidthFromDomElementWidth(label);
            return true;
          }

          return false;
        });
      }
    },

    time: function sb_updateTime(now) {
      now = now || new Date();
      var _ = navigator.mozL10n.get;
      var f = new navigator.mozL10n.DateTimeFormat();

      var timeFormat = window.navigator.mozHour12 ?
        _('shortTimeFormat12') : _('shortTimeFormat24');
      timeFormat = this._getTimeFormat(timeFormat);
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
      var previousLevel = parseInt(icon.dataset.level, 10);
      var previousCharging = icon.dataset.charging === 'true';

      icon.dataset.charging = battery.charging;
      var level = Math.floor(battery.level * 10) * 10;

      if (previousLevel !== level || previousCharging !== battery.charging) {
        icon.dataset.level = level;
        navigator.mozL10n.setAttributes(
          icon,
          battery.charging ? 'statusbarBatteryCharging' : 'statusbarBattery',
          {level: level}
        );
        this.previousCharging = battery.charging;

        this.cloneStatusbar();
      }
    },

    networkActivity: function sb_updateNetworkActivity() {
      // Each time we receive an update, make network activity indicator
      // show up for 500ms.

      var icon = this.icons.networkActivity;

      clearTimeout(this._networkActivityTimer);

      this._networkActivityTimer = setTimeout(function hideNetActivityIcon() {
        icon.hidden = true;
        this._updateIconVisibility();
      }.bind(this), 500);

      if (icon.hidden) {
        icon.hidden = false;

        this._updateIconVisibility();
      }
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
      var simSlots = SIMSlotManager.getSlots();
      var isDirty = false; // Whether to reprioritise icons afterwards.
      for (var index = 0; index < simSlots.length; index++) {
        var simslot = simSlots[index];
        var conn = simslot.conn;
        var voice = conn.voice;
        var data = conn.data;
        var icon = this.icons.signals[index];
        var roaming = this.icons.roaming[index];

        var _ = navigator.mozL10n.get;

        if (!voice) {
          continue;
        }

        var previousHiddenState = icon.hidden;
        var previousActiveState = icon.dataset.inactive;
        var previousSearchingState = icon.dataset.searching;
        var previousRoamingHiddenState = roaming.hidden;

        if (this.settingValues['ril.radio.disabled']) {
          icon.hidden = true;

          if (previousHiddenState !== icon.hidden) {
            isDirty = true;
          }

          continue;
        }

        icon.hidden = false;
        icon.dataset.inactive = false;

        if (simslot.isAbsent()) {
          // no SIM
          delete icon.dataset.level;
          delete icon.dataset.searching;
          roaming.hidden = true;
          icon.hidden = true;
          icon.dataset.inactive = true;

          icon.setAttribute('aria-label', _('noSimCard'));
        } else if (data && data.connected && data.type.startsWith('evdo')) {
          // "Carrier" / "Carrier (Roaming)" (EVDO)
          // Show signal strength of data call as EVDO only supports data call.
          this.updateSignalIcon(icon, data);
        } else if (voice.connected || this.hasActiveCall() &&
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
          roaming.hidden = true;
          icon.setAttribute('aria-label', _(icon.dataset.searching ?
            'statusbarSignalNoneSearching' : 'emergencyCallsOnly'));
        }

        if (previousHiddenState !== icon.hidden ||
          previousActiveState !== icon.dataset.inactive ||
          previousSearchingState !== icon.dataset.searching ||
          previousRoamingHiddenState !== roaming.hidden) {
          isDirty = true;
        }
      }

      this.updateConnectionsVisibility();
      this.refreshCallListener();

      if (isDirty) {
        this._updateIconVisibility();
      }
    },

    data: function sb_updateSignal() {
      var conns = window.navigator.mozMobileConnections;
      if (!conns) {
        this.updateConnectionsVisibility();
        return;
      }

      var isDirty = false; // Whether to reprioritise icons afterwards.
      for (var index = 0; index < conns.length; index++) {
        var conn = conns[index];
        var data = conn.data;
        var icon = this.icons.data[index];

        if (!data) {
          continue;
        }

        var previousHiddenState = icon.hidden;

        if (this.settingValues['ril.radio.disabled'] ||
            !this.settingValues['ril.data.enabled'] ||
            !this.icons.wifi.hidden || !data.connected) {
          icon.hidden = true;

          if (previousHiddenState !== icon.hidden) {
            isDirty = true;
          }

          continue;
        }

        var type = this.mobileDataIconTypes[data.type];
        icon.hidden = false;
        icon.textContent = '';
        icon.classList.remove('sb-icon-data-circle');
        if (type) {
          if (this.dataExclusiveCDMATypes[data.type]) {
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

        if (previousHiddenState !== icon.hidden) {
          isDirty = true;
        }
      }

      this.updateConnectionsVisibility();
      this.refreshCallListener();

      if (isDirty) {
        this._updateIconVisibility();
      }
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
          var level = Math.min(Math.floor(
            wifiManager.connectionInformation.relSignalStrength / 20), 4);
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
      clearTimeout(this.recordingTimer);

      var icon = this.icons.recording;
      icon.dataset.active = this.recordingActive;

      if (this.recordingActive) {
        // Recording is currently active, show the active icon.
        icon.hidden = false;
        this._updateIconVisibility();
        return;
      }

      // Recording is currently inactive.
      // Show the inactive icon and hide it after kActiveIndicatorTimeout
      this.recordingTimer = setTimeout(function hideRecordingIcon() {
        icon.hidden = true;
        this._updateIconVisibility();
      }.bind(this), this.kActiveIndicatorTimeout);

      // The icon active state may have changed (visually indicated by its
      // opacity) in the maximised status bar, so we still need this call to
      // refresh the minimised status bar so that it looks like the maximised.
      this.cloneStatusbar();
    },

    sms: function sb_updateSms() {
      // We are not going to show this for v1

      // this.icon.sms.hidden = ?
      // this.icon.sms.dataset.num = ?;

      //this._updateIconVisibility();
    },

    geolocation: function sb_updateGeolocation() {
      clearTimeout(this.geolocationTimer);

      var icon = this.icons.geolocation;
      icon.dataset.active = this.geolocationActive;

      if (this.geolocationActive) {
        // Geolocation is currently active, show the active icon.
        icon.hidden = false;
        this._updateIconVisibility();
        return;
      }

      // Geolocation is currently inactive.
      // Show the inactive icon and hide it after kActiveIndicatorTimeout
      this.geolocationTimer = setTimeout(function hideGeolocationIcon() {
        icon.hidden = true;
        this._updateIconVisibility();
      }.bind(this), this.kActiveIndicatorTimeout);

      // The icon active state may have changed (visually indicated by its
      // opacity) in the maximised status bar, so we still need this call to
      // refresh the minimised status bar so that it looks like the maximised.
      this.cloneStatusbar();
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
    },

    debugging: function sb_updateDebugging() {
      var icon = this.icons.debugging;

      icon.hidden = this.settingValues['debugger.remote-mode'] == 'disabled';

      this._updateIconVisibility();
    }
  },

  updateConnectionsVisibility: function sb_updateConnectionsVisibility() {
    // Iterate through connections children and only show one icon
    // in case no SIM card is inserted
    var conns = window.navigator.mozMobileConnections;

    if (!conns || !this.icons.signals) {
      return;
    }

    var icons = this.icons;
    icons.connections.hidden = false;
    icons.connections.dataset.multiple = (conns.length > 1);

    for (var index = 0; index < conns.length; index++) {
      if (icons.signals[index].dataset.inactive === 'false') {
        return;
      }
    }

    // No SIM cards inserted
    icons.connections.dataset.multiple = false;
    icons.signals[0].hidden = false;
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
    var slotIndex = icon.dataset.index ? (icon.dataset.index - 1) : 0;
    var roaming = this.icons.roaming[slotIndex];
    roaming.hidden = !connInfo.roaming;

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

  createConnectionsElements: function sb_createConnectionsElements() {
    if (this.icons.signals) {
      return;
    }

    var conns = window.navigator.mozMobileConnections;
    if (conns) {
      var multipleSims = SIMSlotManager.isMultiSIM();

      // Create signal elements based on the number of SIM slots.
      this.icons.connections.dataset.multiple = multipleSims;
      this.icons.signals = {};
      this.icons.data = {};
      this.icons.roaming = {};
      for (var i = conns.length - 1; i >= 0; i--) {
        var signal = document.createElement('div');
        var data = document.createElement('div');
        var roaming = document.createElement('div');
        signal.className = 'sb-icon sb-icon-signal statusbar-signal';
        signal.dataset.level = '5';
        if (multipleSims) {
          signal.dataset.index = i + 1;
        }
        signal.setAttribute('role', 'listitem');
        signal.hidden = true;
        data.setAttribute('role', 'listitem');
        data.className = 'sb-icon statusbar-data';
        data.hidden = true;

        roaming.setAttribute('role', 'listitem');
        roaming.className = 'sb-icon sb-icon-roaming';
        roaming.hidden = true;

        signal.appendChild(data);
        this.icons.connections.appendChild(signal);
        this.icons.connections.appendChild(roaming);
        this.icons.signals[i] = signal;
        this.icons.data[i] = data;
        this.icons.roaming[i] = roaming;
      }

      this.updateConnectionsVisibility();
    }
  },

  createCallForwardingsElements: function sb_createCallForwardingsElements() {
    if (this.icons.callForwardingsElements) {
      return;
    }

    var conns = window.navigator.mozMobileConnections;
    if (conns) {
      var multipleSims = SIMSlotManager.isMultiSIM();

      // Create call forwarding icons
      var sbCallForwardings =
        document.getElementById('statusbar-call-forwardings');
      sbCallForwardings.dataset.multiple = multipleSims;
      this.icons.callForwardingsElements = {};
      for (var idx = conns.length - 1; idx >= 0; idx--) {
        var callForwarding = document.createElement('div');
        callForwarding.className = 'sb-icon sb-icon-call-forwarding';
        if (multipleSims) {
          callForwarding.dataset.index = idx + 1;
        }
        callForwarding.setAttribute('role', 'listitem');
        callForwarding.setAttribute('aria-label', 'statusbarForwarding');
        callForwarding.hidden = true;
        this.icons.callForwardings.appendChild(callForwarding);
        this.icons.callForwardingsElements[idx] = callForwarding;
      }

      this.updateCallForwardingsVisibility();
    }
  },

  getAllElements: function sb_getAllElements() {
    this.icons = {};

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    // ID of elements to create references
    this.ELEMENTS.forEach((function createElementRef(name) {
      this.icons[toCamelCase(name)] =
        document.getElementById('statusbar-' + name);
    }).bind(this));


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
    var className = this.statusbarIconsMin.className;
    this.statusbarIcons.removeChild(this.statusbarIconsMin);
    this.statusbarIconsMin = this.statusbarIconsMax.parentNode.cloneNode(true);
    this.statusbarIconsMin.setAttribute('id', 'statusbar-minimized-wrapper');
    this.statusbarIconsMin.firstElementChild.setAttribute('id',
      'statusbar-minimized');
    this.statusbarIconsMin.className = className;
    this.statusbarIcons.appendChild(this.statusbarIconsMin);
  },

  // To reduce the duplicated code
  isLocked: function() {
    return Service.locked;
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
  });
}
