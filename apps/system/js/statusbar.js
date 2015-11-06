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
  const AVG_ICON_SIZE = 22;

  var Statusbar = {
    name: 'Statusbar',

    // The indices indicate icons priority (lower index = highest priority)
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

    _numMinimizedIcons: 9,
    _currentIcons: {},
    get _iconsCount() {
      return Object.keys(this._currentIcons).length;
    },

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
      Service.register('iconContainer', this);
    },

    calculateMinimized: function sb_calculateMinimized() {
      var minimizedWidth = this.element.clientWidth / 2;
      var count = minimizedWidth / AVG_ICON_SIZE;
      this._numMinimizedIcons = Math.floor(count);
    },

    iconContainer: function sb_iconContainer(icon) {
      if (icon.dashPureName === 'operator') {
        return this.statusbarTray;
      }
      return this.statusbarIcons;
    },

    /**
     * Finish all initializing statusbar event handlers
     */
    finishInit: function() {
      window.addEventListener(
        'appstatusbar-fullscreen-statusbar-set-appearance', this);
      window.addEventListener('appstatusbar-fullscreen-statusbar-show', this);
      window.addEventListener('appstatusbar-fullscreen-statusbar-hide', this);
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
      window.addEventListener('iconshown', this);
      window.addEventListener('iconhidden', this);
      window.addEventListener('systemdialogmanager-activated', this);
      window.addEventListener('systemdialogmanager-deactivated', this);

      window.addEventListener('attentionopened', this);
      window.addEventListener('appwillopen', this);
      window.addEventListener('appwillclose', this);
      window.addEventListener('appopened', this);
      window.addEventListener('appclosed', this);
      window.addEventListener('hierarchytopmostwindowchanged', this);
      window.addEventListener('activityopened', this);
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

      LazyLoader.load([
        'js/utility_tray_motion.js',
        'js/utility_tray.js'
      ]).then(function() {
        this.utilityTray = UtilityTray;
        UtilityTray.init();
      }.bind(this)).catch((err) => {
        console.error('UtilityTray load or init error', err);
      });

      this.calculateMinimized();
    },

    handleEvent: function sb_handleEvent(evt) {
      var icon;
      switch (evt.type) {
        case 'iconshown':
          this._currentIcons[evt.detail.dashPureName] = true;
          this.toggleMaximized();
          break;
        case 'iconhidden':
          delete this._currentIcons[evt.detail.dashPureName];
          break;
        case 'ftudone':
        case 'ftuskip':
          this.finishInit();
          break;
        case 'iconrendered':
          icon = evt.detail;
          var order = this.PRIORITIES.indexOf(icon.dashPureName);
          icon.setOrder(order);
          break;

        case 'attentionopened':
          this.element.classList.add('maximized');
          this.element.classList.remove('light');
          break;

        case 'sheets-gesture-begin':
        case 'appwillopen':
        case 'appwillclose':
        case 'cardviewshown':
          this.element.classList.add('hidden');
          break;

        case 'sheets-gesture-end':
        case 'stackchanged':
        case 'cardviewclosed':
          this.element.classList.remove('hidden');
          break;

        case 'appstatusbar-fullscreen-statusbar-show':
          this.topPanel.style.pointerEvents = 'none';
          break;
        case 'appstatusbar-fullscreen-statusbar-hide':
          this.topPanel.style.pointerEvents = '';
          break;

        case 'utilitytraywillshow':
        case 'utilitytraywillhide':
        case 'systemdialogmanager-activated':
        case 'systemdialogmanager-deactivated':
        case 'appstatusbar-fullscreen-statusbar-set-appearance':
        case 'utility-tray-overlayopened':
        case 'utility-tray-overlayclosed':
        case 'utility-tray-abortopen':
        case 'utility-tray-abortclose':
        case 'appchromecollapsed':
        case 'updateprompthidden':
          this.setAppearance();
          break;

        case 'appopened':
          var app = evt.detail;
          if (!app.isFullScreen() && !app.isFullScreenLayout()) {
            this.element.setAttribute('aria-owns',
              evt.detail.appChrome.element.id);
          } else {
            this.element.removeAttribute('aria-owns');
          }
          /* falls through */
        case 'appclosed':
        case 'hierarchytopmostwindowchanged':
        case 'appchromeexpanded':
          this.element.classList.remove('hidden');
          this.setAppearance();
          break;

        case 'activityopened':
        case 'apptitlestatechanged':
        case 'activitytitlestatechanged':
        case 'homescreentitlestatechanged':
          this.setAppearance();
          this.element.classList.remove('hidden');
          break;
        case 'homescreenopened':
          // In some cases, if the user has been switching apps so fast and
          // quickly he press the home button, we might miss the
          // |sheets-gesture-end| event so we must resume the statusbar
          // if needed
          this.setAppearance();
          this.element.classList.remove('hidden');
          this.element.classList.remove('fullscreen');
          this.element.classList.remove('fullscreen-layout');
          this.element.removeAttribute('aria-owns');
          break;
        case 'updatepromptshown':
          this.element.classList.remove('light');
          break;
      }
    },

    setAppearance: function() {
      var app = Service.query('getTopMostWindow');
      if (!app) {
        return;
      }

      var lightApp = app.appChrome && app.appChrome.useLightTheming();
      var isFullScreen = app.isFullScreen() || document.mozFullScreen;
      var dialogShown = Service.query('SystemDialogManager.isActive');
      console.log(dialogShown);

      this.element.classList.toggle('light',
        !!((lightApp && !isFullScreen) || dialogShown)
      );

      this.element.classList.toggle('fullscreen', isFullScreen);

      this.element.classList.toggle('fullscreen-layout',
        app.isFullScreenLayout()
      );

      this.toggleMaximized();
    },

    toggleMaximized: function() {
      var app = Service.query('getTopMostWindow');

      if (!app) {
        return;
      }

      var appsWithoutRocketbar = [
        'isHomescreen',
        'isAttentionWindow',
        'isLockscreen'
      ];

      var noRocketbar = appsWithoutRocketbar.some(function(name) {
        return !!(app[name]);
      });
      var chromeMaximized = !!(app.appChrome && app.appChrome.isMaximized());
      var trayActive = !!(this.utilityTray && this.utilityTray.shown);
      var shouldMaximize = noRocketbar || chromeMaximized || trayActive;
      var fewIcons = (this._iconsCount < this._numMinimizedIcons);

      // Important: we need a boolean to make the toggle method
      // take the right decision
      var elem = this.element;
      elem.classList.toggle('maximized', !!(shouldMaximize && !fewIcons));
    },

    panelHandler: function sb_panelHandler(evt) {
      // Do not forward events if FTU is running
      if (Service.query('isFtuRunning')) {
        return;
      }

      // Do not forward events if the utility tray is shown.
      if (this.utilityTray && this.utilityTray.shown) {
        return;
      }

      var app = Service.query('getTopMostWindow');
      app && app.handleStatusbarTouch(evt, this._cacheHeight);
    },

    getAllElements: function sb_getAllElements() {
      this.element = document.getElementById('statusbar');
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
