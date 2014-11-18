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

/*global Clock, TouchForwarder, FtuLauncher,
         System, UtilityTray, NfcIcon, WifiIcon, CallForwardingIcon,
         TetheringIcon,
         MobileConnectionIcon, layoutManager */

'use strict';

var StatusBar = {
  /* all elements that are children nodes of the status bar */
  ELEMENTS: ['emergency-cb-notification', 'time', 'connections', 'battery',
    'wifi', 'data', 'flight-mode', 'network-activity', 'tethering', 'alarm',
    'debugging', 'bluetooth', 'mute', 'headphones', 'bluetooth-headphones',
    'bluetooth-transferring', 'recording', 'geolocation', 'usb',
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

  /* Whether or not status bar is actively updating or not */
  active: true,

  /* Whether or not the lockscreen is displayed */
  _inLockScreenMode: false,

  /* Keep the DOM element references here */
  icons: {},

  // CDMA types that can support either data call or voice call simultaneously.
  dataExclusiveCDMATypes: {
    'evdo0': true, 'evdoa': true, 'evdob': true, // data call only
    '1xrtt': true, 'is95a': true, 'is95b': true  // data call or voice call
  },

  /**
   * this keeps how many current installs/updates we do
   * it triggers the icon "systemDownloads"
   */
  systemDownloadsCount: 0,
  systemDownloads: {},

  _minimizedStatusBarWidth: window.innerWidth,

  /* For other modules to acquire */
  get height() {
    if (document.mozFullScreen ||
               (System.currentApp &&
                System.currentApp.isFullScreen())) {
      return 0;
    } else {
      return this._cacheHeight ||
             (this._cacheHeight = this.element.getBoundingClientRect().height);
    }
  },

  init: function sb_init() {
    this.labelIcon = new LabelIcon(this);
    this.alarmIcon = new AlarmIcon(this);
    this.mobileConnectionIcon = new MobileConnectionIcon(this);
    this.callForwardingIcon = new CallForwardingIcon(this);
    this.timeIcon = new TimeIcon(this);
    this.tetheringIcon = new TetheringIcon(this);
    this.emergencyCallbackIcon = new EmergencyCallbackIcon(this);

    this.getAllElements();

    // cache height.
    this._cacheHeight = this.element.getBoundingClientRect().height;

    window.addEventListener('ftudone', this);
    window.addEventListener('ftuskip', this);
    window.addEventListener('ftuopen', this);
    window.addEventListener('apptitlestatechanged', this);
    window.addEventListener('activitytitlestatechanged', this);
    window.addEventListener('appchromecollapsed', this);
    window.addEventListener('iconcreated', this);
    window.addEventListener('iconshown', this);
    window.addEventListener('iconhidden', this);
  },

  /**
   * Finish all initializing statusbar event handlers
   */
  finishInit: function() {
    this.mobileConnectionIcon.createElements();
    this.callForwardingIcon.createElements();

    // Refresh the time to reflect locale changes
    this.timeIcon.toggle(true);

    // Listen to events from attention_window
    window.addEventListener('attentionopened', this);
    window.addEventListener('attentionclosed', this);

    window.addEventListener('sheets-gesture-begin', this);
    window.addEventListener('sheets-gesture-end', this);
    window.addEventListener('utilitytraywillshow', this);
    window.addEventListener('utilitytraywillhide', this);
    window.addEventListener('utility-tray-overlayopened', this);
    window.addEventListener('utility-tray-overlayclosed', this);
    window.addEventListener('cardviewshown', this);
    window.addEventListener('cardviewclosed', this);

    // Listen to 'screenchange' from screen_manager.js
    window.addEventListener('screenchange', this);

    // Listen to 'lockscreen-appopened', 'lockscreen-appclosing', and
    // 'lockpanelchange' in order to correctly set the visibility of
    // the statusbar clock depending on the active lockscreen panel
    window.addEventListener('lockscreen-appopened', this);
    window.addEventListener('lockscreen-appclosing', this);
    window.addEventListener('lockpanelchange', this);

    // Listen to orientation change and SHB activation/deactivation.
    window.addEventListener('system-resize', this);

    window.addEventListener('appopening', this);
    window.addEventListener('appopened', this);
    window.addEventListener('activityopened', this);
    window.addEventListener('activityterminated', this);
    window.addEventListener('homescreenopening', this);
    window.addEventListener('homescreenopened', this);
    window.addEventListener('stackchanged', this);

    // We need to preventDefault on mouse events until
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1005815 lands
    var events = ['touchstart', 'touchmove', 'touchend',
                  'mousedown', 'mousemove', 'mouseup'];
    events.forEach(function bindEvents(name) {
      this.topPanel.addEventListener(name, this.panelHandler.bind(this));
    }, this);

    this.statusbarIcons.addEventListener('wheel', this);
    this.setActive(true);

    UtilityTray.init();
  },

  handleEvent: function sb_handleEvent(evt) {
    switch (evt.type) {
      case 'iconcreated':
        var icon = evt.detail;
        this._icons.push(icon);
        break;
      case 'iconshown':
      case 'iconhidden':
        this._updateIconVisibility();
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
        this.timeIcon.toggle(false);
        this._updateIconVisibility();
        this.setAppearance(evt.detail);
        this._inLockScreenMode = true;
        break;

      case 'lockscreen-appclosing':
        // Display the clock in the statusbar when screen is unlocked
        this._inLockScreenMode = false;
        this.timeIcon.toggle(true);
        this._updateIconVisibility();
        this.setAppearance(System.currentApp);
        break;

      case 'attentionopened':
        this.timeIcon.toggle(true);
        break;

      case 'attentionclosed':
        // Hide the clock in the statusbar when screen is locked
        this.timeIcon.toggle(!this.isLocked());
        break;

      case 'sheets-gesture-begin':
        this.element.classList.add('hidden');
        this.pauseUpdate();
        break;

      case 'utilitytraywillshow':
      case 'utilitytraywillhide':
      case 'cardviewshown':
        this.pauseUpdate();
        break;

      case 'utility-tray-overlayopened':
      case 'utility-tray-overlayclosed':
      case 'cardviewclosed':
        this.resumeUpdate();
        break;

      case 'ftuopen':
        // If we are upgrading, we can show all the icons.
        if (FtuLauncher.isFtuUpgrading()) {
          this.finishInit();
        } else {
          // When first launching FTU, only show battery icon
          // and listen for iac step events to show more icons.
          // this._icons.get('BatteryIcon').start();
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
        this.resumeUpdate();
        break;

      case 'stackchanged':
        this.setAppearance(System.currentApp);
        this.element.classList.remove('hidden');
        break;

      case 'appchromecollapsed':
        this._updateMinimizedStatusBarWidth();
        break;

      case 'appopened':
        this.setAppearance(evt.detail);
        this.element.classList.remove('hidden');
        this._updateMinimizedStatusBarWidth();
        break;

      case 'activityopened':
        this._updateMinimizedStatusBarWidth();
        /* falls through */
      case 'apptitlestatechanged':
      case 'activitytitlestatechanged':
      case 'homescreenopened':
        this.setAppearance(evt.detail);
        this.element.classList.remove('hidden');
        break;
      case 'activityterminated':
        // In this particular case, we want to restore the original color of
        // the bottom window as it will *become* the shown window.
        this.setAppearance(evt.detail, true);
        this.element.classList.remove('hidden');
        break;
    }
  },

  setAppearance: function(app, useBottomWindow) {
    // Avoid any attempt to update the statusbar when
    // the phone is locked
    if (this._inLockScreenMode) {
      return;
    }

    // Fetch top-most (or bottom-most) window to figure out color theming.
    var themeWindow =
      useBottomWindow ? app.getBottomMostWindow() : app.getTopMostWindow();

    this.element.classList.toggle('light',
      !!(themeWindow.appChrome && themeWindow.appChrome.useLightTheming())
    );

    // Maximized state must be based on the bottom window if we're using it but
    // use the currently showing window for other cases.
    var maximizedWindow = useBottomWindow ? themeWindow : app;
    this.element.classList.toggle('maximized', maximizedWindow.isHomescreen ||
      !!(maximizedWindow.appChrome && maximizedWindow.appChrome.isMaximized())
    );
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
    return Math.round(layoutManager.width - (3 * 2));
  },

  _updateMinimizedStatusBarWidth: function sb_updateMinimizedStatusBarWidth() {
    var app = System.currentApp;
    app = app && app.getTopMostWindow();

    // Get the actual width of the rocketbar, and determine the remaining
    // width for the minimized statusbar.
    var element = app && app.appChrome && app.appChrome.element &&
      app.appChrome.element.querySelector('.urlbar .title');

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


  // Update the width of the date element. Called when the content changed.
  updateLabelWidth: function(label) {
    this.PRIORITIES.some(function(iconObj) {
      if (iconObj[0] === 'label') {
        iconObj[1] = this._getWidthFromDomElementWidth(label);
        return true;
      }

      return false;
    }, this);
  },

  _paused: 0,
  pauseUpdate: function sb_pauseUpdate() {
    this._paused++;
  },

  resumeUpdate: function sb_resumeUpdate() {
    this._paused--;
    this._updateIconVisibility();
  },

  isPaused: function sb_isPaused() {
    return this._paused > 0;
  },

  _updateIconVisibility: function sb_updateIconVisibility() {
    if (this._paused !== 0) {
      return;
    }

    // Let's refresh the minimized clone.
    this.cloneStatusbar();

    var maximizedStatusBarWidth = this._getMaximizedStatusBarWidth();
    var minimizedStatusBarWidth = this._minimizedStatusBarWidth;

    this.PRIORITIES.forEach(function sb_updateIconVisibilityForEach(iconObj) {
      var iconId = iconObj[0];
      var icon = this._icons.get(this.toCamelCase(iconId) + 'Icon');

      if (!icon.element || !icon.isVisible()) {
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
    var app = System.currentApp.getTopMostWindow();
    var chromeBar = app.element.querySelector('.chrome');
    var titleBar = app.element.querySelector('.titlebar');

    // Do not forward events if FTU is running
    if (FtuLauncher.isFtuRunning()) {
      return;
    }

    // Do not forward events is utility-tray is active
    if (UtilityTray.active) {
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

        if (app && app.isFullScreen() && app.config.chrome &&
          app.config.chrome.navigation) {
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

    this.screen.classList.remove('minimized-tray');

    clearTimeout(this._releaseTimeout);
    this._releaseTimeout = null;
  },

  _releaseAfterTimeout: function sb_releaseAfterTimeout(titleBar) {
    this.screen.classList.add('minimized-tray');

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

  /**
   * Show pertinent statusbar icons as we recieve FTU step events.
   */
  handleFtuStep: function sb_handleFtuStep(stepHash) {
    switch (stepHash) {
      case '#languages':
        this._icons.get('MobileConnectionIcon').start();
        this._updateIconVisibility();
        break;

      case '#wifi':
        this._icons.get('WifiIcon').start();
        this._updateIconVisibility();
        break;

      case '#date_and_time':
        this._icons.get('TimeIcon').start();
        this._updateIconVisibility();
        break;
    }
  },

  setActive: function sb_setActive(active) {
    this.active = active;

    this.setActiveBattery(active);

    if (active) {
      this.mobileConnectionIcon.start();

      this.setActiveWifi(true);

      this.refreshCallListener();
    } else {
      this.mobileConnectionIcon.stop();

      this.removeCallListener();
    }
  },

  setActiveWifi: function sb_setActiveWifi(active) {
    this.wifiIcon.setActive(active);
  },

  hasActiveCall: function sb_hasActiveCall() {
    var telephony = navigator.mozTelephony;
    // will return true as soon as we begin dialing
    return !!(telephony && telephony.active);
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
  });
}
