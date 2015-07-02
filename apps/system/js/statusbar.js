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

/*global Service, UtilityTray, LazyLoader */

'use strict';

(function(exports) {
  var Statusbar = {
    name: 'Statusbar',

    // The indices indicate icons priority (lower index = highest priority)
    // In each object:
    // * witdth: is the icon element width or null if size is variable
    // * order: is the order in which the icons will be displayed
    PRIORITIES: [
      'time',
      'emergency-callback',
      'battery',
      'recording',
      'airplane-mode',
      'wifi',
      'mobile-connection',
      'debugging',
      'download',
      'geolocation',
      'network-activity',
      'tethering',
      'bluetooth-transfer',
      'bluetooth',
      'nfc',
      'usb',
      'alarm',
      'bluetooth-headphone',
      'mute',
      'call-forwardings',
      'playing',
      'headphone',
      'operator'
    ],

    /* Whether or not status bar is actively updating or not */
    active: true,

    /* For other modules to acquire */
    get height() {
      if (document.mozFullScreen ||
          (Service.query('getTopMostWindow') &&
           Service.query('getTopMostWindow').isFullScreen())) {
        return 0;
      } else {
        return this._cacheHeight ||
               (this._cacheHeight =
                this.element.getBoundingClientRect().height);
      }
    },

    start: function() {
      this.getAllElements();

      // cache height.
      this._cacheHeight = this.element.getBoundingClientRect().height;

      window.addEventListener('apptitlestatechanged', this);
      window.addEventListener('activitytitlestatechanged', this);
      window.addEventListener('homescreentitlestatechanged', this);
      window.addEventListener('appchromecollapsed', this);
      window.addEventListener('appchromeexpanded', this);
      window.addEventListener('iconrendered', this);
      if (Service.query('FtuLauncher.isFinished')) {
        this.finishInit();
      } else {
        window.addEventListener('ftuskip', this);
        window.addEventListener('ftudone', this);
      }
      Service.registerState('height', this);
      Service.register('pauseUpdate', this);
    },

    iconContainer: function sb_iconContainer(icon) {
      if (icon.dashPureName === 'operator') {
        return this.statusbarTray;
      }
      return this.statusbarIconsMax;
    },

    /**
     * Finish all initializing statusbar event handlers
     */
    finishInit: function() {
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

      // Listen to 'lockscreen-appopened', 'lockscreen-appclosing', and
      // 'lockpanelchange' in order to correctly set the visibility of
      // the statusbar clock depending on the active lockscreen panel
      window.addEventListener('lockscreen-appopened', this);
      window.addEventListener('lockscreen-appclosing', this);
      window.addEventListener('lockpanelchange', this);

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

      // We need to preventDefault on mouse events until
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1005815 lands
      var events = ['touchstart', 'touchmove', 'touchend',
                    'mousedown', 'mousemove', 'mouseup'];
      events.forEach(function bindEvents(name) {
        this.topPanel.addEventListener(name, this.panelHandler.bind(this));
      }, this);

      this.statusbarIcons.addEventListener('wheel', this);

      LazyLoader.load(['js/utility_tray.js']).then(function() {
        this.utilityTray = UtilityTray;
        UtilityTray.init();
      }.bind(this)).catch((err) => {
        console.error('UtilityTray load or init error', err);
      });

      Service.register('iconContainer', this);
    },

    getOrder: function sb_getOrder(iconId) {
      return this.PRIORITIES.indexOf(iconId);
    },

    handleEvent: function sb_handleEvent(evt) {
      var icon;
      switch (evt.type) {
        case 'ftudone':
        case 'ftuskip':
          this.finishInit();
          break;
        case 'iconrendered':
          icon = evt.detail;
          var order = this.getOrder(icon.dashPureName);
          if (order === -1) {
            return;
          }

          icon.setOrder(order);
          break;

        case 'attentionopened':
          this.element.classList.add('maximized');
          this.element.classList.remove('light');
          break;

        case 'sheets-gesture-begin':
          this.element.classList.add('hidden');
          this.pauseUpdate(evt.type);
          break;

        case 'utilitytraywillshow':
        case 'utilitytraywillhide':
        case 'cardviewshown':
          this.setAppearance();
          this.pauseUpdate(evt.type);
          break;

        case 'utility-tray-overlayopened':
        case 'utility-tray-overlayclosed':
        case 'utility-tray-abortopen':
        case 'utility-tray-abortclose':
        case 'cardviewclosed':
          this.setAppearance();
          this.resumeUpdate(evt.type);
          break;

        case 'wheel':
          if (evt.deltaMode === evt.DOM_DELTA_PAGE && evt.deltaY &&
            evt.deltaY < 0 && !this.isLocked()) {
            window.dispatchEvent(new CustomEvent('statusbarwheel'));
          }
          break;

        case 'sheets-gesture-end':
          this.element.classList.remove('hidden');
          this.resumeUpdate(evt.type);
          break;

        case 'stackchanged':
          this.setAppearance();
          this.element.classList.remove('hidden');
          break;

        case 'appchromecollapsed':
          this.setAppearance();
          break;

        case 'appopened':
        case 'hierarchytopmostwindowchanged':
        case 'appchromeexpanded':
          this.setAppearance();
          this.element.classList.remove('hidden');
          break;

        case 'activityopened':
        case 'apptitlestatechanged':
        case 'activitytitlestatechanged':
        case 'homescreentitlestatechanged':
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
        case 'updatepromptshown':
          this.element.classList.remove('light');
          break;
        case 'updateprompthidden':
          this.setAppearance();
          break;
      }
    },

    setAppearance: function() {
      var app = Service.query('getTopMostWindow');
      if (!app) {
        return;
      }

      this.element.classList.toggle('light',
        !!(app.appChrome && app.appChrome.useLightTheming())
      );

      this.element.classList.toggle('fullscreen',
        app.isFullScreen()
      );

      this.element.classList.toggle('fullscreen-layout',
        app.isFullScreenLayout()
      );

      var appsWithoutRocketbar = [
        'isHomescreen',
        'isAttentionWindow',
        'isLockscreen'
      ];

      var noRocketbar = appsWithoutRocketbar.some(function(name) {
        return !!(app[name]);
      });

      var chromeMaximized = !!(app.appChrome && app.appChrome.isMaximized());
      var trayActive = UtilityTray.active;
      var shouldMaximize = noRocketbar || chromeMaximized || trayActive;

      // Important: we need a boolean to make the toggle method
      // takes the right decision
      this.element.classList.toggle('maximized',  shouldMaximize || false);
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
        case 'utility-tray-abortopen':
          return 'utilitytrayopening';
        case 'utilitytraywillhide':
        case 'utility-tray-overlayclosed':
        case 'utility-tray-abortclose':
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

    panelHandler: function sb_panelHandler(evt) {
      // Do not forward events if FTU is running
      if (Service.query('isFtuRunning')) {
        return;
      }

      // Do not forward events is utility-tray is active
      if (this.utilityTray && this.utilityTray.active) {
        return;
      }

      var app = Service.query('getTopMostWindow');
      app && app.handleStatusbarTouch(evt, this._cacheHeight);
    },

    getAllElements: function sb_getAllElements() {
      this._icons = new Map();

      this.element = document.getElementById('statusbar');
      this.background = document.getElementById('statusbar-background');
      this.statusbarIcons = document.getElementById('statusbar-icons');
      this.statusbarIconsMax = document.getElementById('statusbar-maximized');
      this.screen = document.getElementById('screen');
      this.topPanel = document.getElementById('top-panel');
      this.statusbarTray = document.getElementById('statusbar-tray');

      // Dummy element used at initialization.
      this.statusbarIconsMin = document.createElement('div');
      this.statusbarIcons.appendChild(this.statusbarIconsMin);
    },

    // To reduce the duplicated code
    isLocked: function() {
      return Service.query('locked');
    }
  };
  exports.Statusbar = Statusbar;
}(window));
