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
    PRIORITIES: {
      'emergency-callback': { width: 16 + 4, order: 12},
      'battery': {width: 25 + 4, order: 2},
      'recording': {width: 16 + 4, order: 16},
      'airplane-mode': {width: 16 + 4, order: 3},
      'wifi': {width: 16 + 4, order: 4},
      'mobile-connection': {width: null, order: 5}, // Width can change
      'time': {width: null, order: 1}, // Width can change
      'debugging': {width: 16 + 4, order: 11},
      'download': {width: 16 + 4, order: 13},
      'geolocation': {width: 16 + 4, order: 17},
      'network-activity': {width: 16 + 4, order: 6},
      'tethering': {width: 16 + 4, order: 7},
      'bluetooth-transfer': {width: 16 + 4, order: 9},
      'bluetooth': {width: 16 + 4, order: 8},
      'nfc': {width: 16 + 4, order: 10},
      'usb': {width: 16 + 4, order: 14},
      'alarm': {width: 16 + 4, order: 22},
      'bluetooth-headphone': {width: 16 + 4, order: 19},
      'mute': {width: 16 + 4, order: 15},
      'call-forwardings': {width: null, order: 18}, // Width can change
      'playing': {width: 16 + 4, order: 21},
      'headphone': {width: 16 + 4, order: 20},
      'operator': {width: null, order: 23} // Only visible in the maximized.
    },

    /* Whether or not status bar is actively updating or not */
    active: true,

    _minimizedStatusbarWidth: window.innerWidth,

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
      window.addEventListener('iconcreated', this);
      window.addEventListener('iconshown', this);
      window.addEventListener('iconhidden', this);
      window.addEventListener('iconchanged', this);
      window.addEventListener('iconrendered', this);
      window.addEventListener('iconwidthchanged', this);
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

    onIconCreated: function sb_onIconCreated(icon) {
      if (!this.PRIORITIES[icon.dashPureName]) {
        return;
      }

      this.PRIORITIES[icon.dashPureName].icon = icon;
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

      Service.register('onIconCreated', this);
      Service.register('iconContainer', this);
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
          var iconObj = this.PRIORITIES[icon.dashPureName];
          if (!iconObj) {
            return;
          }

          var order = iconObj && iconObj.order ? iconObj.order : 1000;
          icon.setOrder(order);
          this._updateIconVisibility();
          break;
        case 'iconchanged':
          this.cloneStatusbar();
          break;
        case 'iconshown':
        case 'iconhidden':
          this._updateIconVisibility();
          break;
        case 'iconwidthchanged':
          this._updateMinimizedStatusbarWidth();
          icon = evt.detail;
          if (icon.name === 'OperatorIcon') {
            this.updateOperatorWidth(icon);
          }
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
          this.pauseUpdate(evt.type);
          break;

        case 'utility-tray-overlayopened':
        case 'utility-tray-overlayclosed':
        case 'utility-tray-abortopen':
        case 'utility-tray-abortclose':
        case 'cardviewclosed':
          this.resumeUpdate(evt.type);
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
          this._updateMinimizedStatusbarWidth();
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
          this._updateMinimizedStatusbarWidth();
          break;

        case 'appopened':
        case 'hierarchytopmostwindowchanged':
        case 'appchromeexpanded':
          this.setAppearance();
          this.element.classList.remove('hidden');
          this._updateMinimizedStatusbarWidth();
          break;

        case 'activityopened':
          this._updateMinimizedStatusbarWidth();
          /* falls through */
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
        case 'activitydestroyed':
          this._updateMinimizedStatusbarWidth();
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
      var shouldMaximize = noRocketbar || chromeMaximized;

      // Important: we need a boolean to make the toggle method
      // takes the right decision
      this.element.classList.toggle('maximized',  shouldMaximize || false);
    },

    _getMaximizedStatusbarWidth: function sb_getMaximizedStatusbarWidth() {
      // Let's consider the style of the status bar:
      // * padding: 0 0.3rem;
      return Math.round((Service.query('LayoutManager.width') ||
        window.innerWidth) - (3 * 2));
    },

    _updateMinimizedStatusbarWidth: function() {
      var app = Service.query('getTopMostWindow');
      var appChrome = app && app.appChrome;

      // Only calculate the search input width when the chrome is minimized
      // Bug 1118025 for more info
      if (appChrome && appChrome.isMaximized()) {
        this._updateIconVisibility();
        return;
      }

      // Get the width of the minimized shadow element
      var selector = '.titlebar .titlebar-minimized';
      var element = app && app.element && app.element.querySelector(selector);

      if (element) {
        var elementWidth = element.getBoundingClientRect().width;
        this._minimizedStatusbarWidth = Math.floor(elementWidth);
      } else {
        this._minimizedStatusbarWidth = this._getMaximizedStatusbarWidth();
      }

      this._updateIconVisibility();
    },


    // Update the width of the date element. Called when the content changed.
    updateOperatorWidth: function(icon) {
      var iconObj = this.PRIORITIES.operator;
      if (!iconObj) {
        return false;
      }
      iconObj.width = this._getWidthFromDomElementWidth(icon);
      return true;
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

    _updateIconVisibility: function sb_updateIconVisibility() {
      if (this.isPaused()) {
        return;
      }

      // Let's refresh the minimized clone.
      this.cloneStatusbar();

      var maximizedStatusbarWidth = this._getMaximizedStatusbarWidth();
      var minimizedStatusbarWidth = this._minimizedStatusbarWidth;

      Object.keys(this.PRIORITIES).forEach(function(iconId) {
        var iconObj = this.PRIORITIES[iconId];
        var icon = iconObj.icon;
        if (!icon) {
          return;
        }
        if (!icon.isVisible()) {
          return;
        }

        var className = 'sb-hide-' + iconId;

        if (maximizedStatusbarWidth < 0) {
          this.statusbarIcons.classList.add(className);
          return;
        }

        this.statusbarIcons.classList.remove(className);
        this.statusbarIconsMin.classList.remove(className);

        var iconWidth = this._getIconWidth(iconObj);

        maximizedStatusbarWidth -= iconWidth;
        if (maximizedStatusbarWidth < 0) {
          // Add a class to the container so that both status bars inherit it.
          this.statusbarIcons.classList.add(className);
          return;
        }

        minimizedStatusbarWidth -= iconWidth;
        if (minimizedStatusbarWidth < 0) {
          // This icon needs to be hidden on the minimized status bar only.
          this.statusbarIconsMin.classList.add(className);
        }
      }.bind(this));
    },

    _getIconWidth: function sb_getIconWidth(iconObj) {
      var iconWidth = iconObj.width;

      if (!iconWidth) {
        // The width of this icon is not static.
        var icon = iconObj.icon;
        if (!icon || !icon.element) {
          return 0;
        }
        iconWidth = this._getWidthFromDomElementWidth(icon);
      }

      return iconWidth;
    },

    _getWidthFromDomElementWidth: function(icon) {
      var style = window.getComputedStyle(icon.element);
      var iconWidth = icon.element.clientWidth +
        parseInt(style.marginLeft, 10) +
        parseInt(style.marginRight, 10);

      return iconWidth;
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

      this.cloneStatusbar();
    },

    cloneStatusbar: function() {
      var className = this.statusbarIconsMin.className;
      this.statusbarIcons.removeChild(this.statusbarIconsMin);
      this.statusbarIconsMin =
        this.statusbarIconsMax.parentNode.cloneNode(true);
      this.statusbarIconsMin.setAttribute('id', 'statusbar-minimized-wrapper');
      this.statusbarIconsMin.firstElementChild.setAttribute('id',
        'statusbar-minimized');
      this.statusbarIconsMin.className = className;
      this.statusbarIcons.appendChild(this.statusbarIconsMin);
    },

    // To reduce the duplicated code
    isLocked: function() {
      return Service.query('locked');
    },

    toCamelCase: function sb_toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    },

    toClassName: function(str) {
      str = str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  };
  exports.Statusbar = Statusbar;
}(window));
