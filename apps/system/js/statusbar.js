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

/*global FtuLauncher, Service, UtilityTray, layoutManager */

'use strict';

var StatusBar = {
  name: 'Statusbar',

  // The indices indicate icons priority (lower index = highest priority)
  // In each subarray:
  // * Index 0 is the icon id
  // * Index 1 is the icon element width or null if size is variable
  PRIORITIES: [
    ['emergency-callback', 16 + 4],
    ['battery', 25 + 4],
    ['recording', 16 + 4],
    ['airplane-mode', 16 + 4],
    ['wifi', 16 + 4],
    ['mobile-connection', null], // Width can change
    ['time', null], // Width can change
    ['debugging', 16 + 4],
    ['download', 16 + 4],
    ['geolocation', 16 + 4],
    ['network-activity', 16 + 4],
    ['tethering', 16 + 4],
    ['bluetooth-transfer', 16 + 4],
    ['bluetooth', 16 + 4],
    ['nfc', 16 + 4],
    ['usb', 16 + 4],
    ['alarm', 16 + 4],
    ['bluetooth-headphone', 16 + 4],
    ['mute', 16 + 4],
    ['call-forwardings', null], // Width can change
    ['playing', 16 + 4],
    ['headphone', 16 + 4],
    //['sms', 16 + 4], // Not currently implemented.
    ['operator', null] // Only visible in the maximized status bar.
  ],

  /* Whether or not status bar is actively updating or not */
  active: true,

  // XXX: Use Service.query('getTopMostWindow') instead of maintaining
  // in statusbar
  /* Whether or not the lockscreen is displayed */
  _inLockScreenMode: false,

  _minimizedStatusBarWidth: window.innerWidth,

  _pausedForGesture: false,

  /* For other modules to acquire */
  get height() {
    var current = Service.currentApp && Service.currentApp.getTopMostWindow();
    if (document.mozFullScreen ||
               (current &&
                current.isFullScreen())) {
      return 0;
    } else {
      return this._cacheHeight ||
             (this._cacheHeight = this.element.getBoundingClientRect().height);
    }
  },

  /* jshint ignore: start */
  iconView: function() {
    return `<!-- System -->
    <div id="statusbar-alarm" class="sb-icon sb-icon-alarm"
      hidden role="listitem" data-l10n-id="statusbarAlarm"></div>
    <div id="statusbar-playing" class="sb-icon sb-icon-playing"
      hidden role="listitem" data-l10n-id="statusbarPlaying"></div>
    <div id="statusbar-headphone" class="sb-icon sb-icon-headphone"
      hidden role="listitem" data-l10n-id="statusbarHeadphone"></div>
    <div id="statusbar-bluetooth-headphone"
      class="sb-icon sb-icon-bluetooth-headphone"
      role="listitem" hidden data-l10n-id="statusbarBluetoothHeadphone"></div>
    <div id="statusbar-call-forwardings" class="sb-icon-call-forwarding"
      hidden role="presentation"></div>
    <div id="statusbar-geolocation" class="sb-icon sb-icon-geolocation"
      hidden role="listitem" data-l10n-id="statusbarGeolocation"></div>
    <div id="statusbar-recording" class="sb-icon sb-icon-recording"
      hidden role="listitem" data-l10n-id="statusbarRecording"></div>
    <div id="statusbar-mute" class="sb-icon sb-icon-mute"
      hidden role="listitem"></div>
    <div id="statusbar-usb" class="sb-icon sb-icon-usb" hidden role="listitem"
      data-l10n-id="statusbarUsb"></div>
    <!-- See note on <img> above. -->
    <img id="statusbar-download"
      src="style/statusbar/images/system-downloads.png"
      class="sb-icon-download" hidden role="listitem"
      data-l10n-id="statusbarDownload">
    <div id="statusbar-emergency-callback"
      class="sb-icon sb-icon-emergency-callback"
      hidden role="listitem"
      data-l10n-id="statusbarEmergencyCallback"></div>
    <div id="statusbar-debugging" data-icon="bug"
      class="sb-icon sb-icon-debugging" hidden role="listitem"></div>
    <!-- Connectivity -->
    <div id="statusbar-nfc" class="sb-icon sb-icon-nfc" hidden role="listitem"
      data-l10n-id="statusbarNfc"></div>
    <div id="statusbar-bluetooth-transfer"
      class="sb-icon sb-icon-bluetooth-transfer"
      role="listitem" hidden
      data-l10n-id="statusbarBluetoothTransfer"></div>
    <div id="statusbar-bluetooth"
      class="sb-icon sb-icon-bluetooth" hidden role="listitem"></div>
    <div id="statusbar-tethering"
      class="sb-icon sb-icon-tethering" hidden role="listitem"></div>
    <!-- HACK: We use images instead of divs to enforce allocation of a
         dedicated layer just for this animated icons, remove after
         https://bugzil.la/717872 gets fixed -->
    <img id="statusbar-network-activity"
      src="style/statusbar/images/network-activity.png"
      class="sb-icon-network-activity" hidden role="listitem"
      data-l10n-id="statusbarNetworkActivity">
    <div id="statusbar-mobile-connection"
      class="sb-icon-mobile-connection" hidden role="presentation"></div>
    <div id="statusbar-wifi" class="sb-icon sb-icon-wifi"
      data-level="4" hidden role="listitem"></div>
    <div id="statusbar-airplane-mode"
      class="sb-icon sb-icon-airplane-mode" hidden role="listitem"
      data-l10n-id="statusbarAirplaneMode"></div>
    <!-- General -->
    <div id="statusbar-battery" class="sb-icon sb-icon-battery"
      role="listitem"></div>
    <div id="statusbar-time" class="sb-icon-time" role="listitem"></div>`;
  },
  /* jshint ignore: end */

  renderIcons: function() {
    this.statusbarIconsMax.insertAdjacentHTML('afterbegin', this.iconView());
    window.dispatchEvent(new CustomEvent('statusbariconrendered'));
  },

  init: function sb_init() {
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
    window.addEventListener('iconwidthchanged', this);
    window.addEventListener('ftuskip', this);
    window.addEventListener('ftudone', this);
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
    window.addEventListener('rocketbar-deactivated', this);

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

    UtilityTray.init();
  },

  handleEvent: function sb_handleEvent(evt) {
    var icon;
    switch (evt.type) {
      case 'ftudone':
      case 'ftuskip':
        this.finishInit();
        break;
      case 'iconcreated':
        icon = evt.detail;
        this._icons.set(icon.name, icon);
        break;
      case 'iconchanged':
        this.cloneStatusbar();
        break;
      case 'iconshown':
      case 'iconhidden':
        this._updateIconVisibility();
        break;
      case 'iconwidthchanged':
        this._updateMinimizedStatusBarWidth();
        icon = evt.detail;
        if (icon.name === 'OperatorIcon') {
          this.updateOperatorWidth(icon);
        }
        break;

      case 'lockscreen-appopened':
        // XXX: Use Service.query('getTopMostWindow')
        this._inLockScreenMode = true;
        this.setAppearance();
        break;

      case 'lockscreen-appclosing':
        this._inLockScreenMode = false;
        this.setAppearance();
        break;

      case 'attentionopened':
        this.element.classList.add('maximized');
        this.element.classList.remove('light');
        break;

      case 'sheets-gesture-begin':
        this.element.classList.add('hidden');
        if (!this._pausedForGesture) {
          this.pauseUpdate();
          this._pausedForGesture = true;
        }
        break;

      case 'utilitytraywillshow':
      case 'utilitytraywillhide':
      case 'cardviewshown':
        this.pauseUpdate();
        break;

      case 'utility-tray-overlayopened':
      case 'utility-tray-overlayclosed':
      case 'utility-tray-abortopen':
      case 'utility-tray-abortclose':
      case 'cardviewclosed':
        this.resumeUpdate();
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
        if (this._pausedForGesture) {
          this.resumeUpdate();
          this._pausedForGesture = false;
        }
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
        if (this._pausedForGesture) {
          this.resumeUpdate();
          this._pausedForGesture = false;
        }
        this.element.classList.remove('hidden');
        this.element.classList.remove('fullscreen');
        this.element.classList.remove('fullscreen-layout');
        break;
      case 'activitydestroyed':
        this._updateMinimizedStatusBarWidth();
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
    return Math.round((window.layoutManager ?
      layoutManager.width : window.innerWidth) - (3 * 2));
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
          (window.layoutManager ? layoutManager.width : window.innerWidth) -
          element.getBoundingClientRect().width -
          // Remove padding and margin
          5 - 3);
    } else {
      this._minimizedStatusBarWidth = this._getMaximizedStatusBarWidth();
    }

    this._updateIconVisibility();
  },


  // Update the width of the date element. Called when the content changed.
  updateOperatorWidth: function(icon) {
    this.PRIORITIES.some(function(iconObj) {
      if (iconObj[0] === 'operator') {
        iconObj[1] = this._getWidthFromDomElementWidth(icon);
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
    if (this.isPaused()) {
      return;
    }

    // Let's refresh the minimized clone.
    this.cloneStatusbar();

    var maximizedStatusBarWidth = this._getMaximizedStatusBarWidth();
    var minimizedStatusBarWidth = this._minimizedStatusBarWidth;

    this.PRIORITIES.forEach(function sb_updateIconVisibilityForEach(iconObj) {
      var iconId = iconObj[0];
      var icon = this._icons.get(this.toClassName(iconId) + 'Icon');

      if (!icon) {
        return;
      }
      if (!icon.isVisible()) {
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
      var icon = this._icons.get(this.toClassName(iconObj[0]) + 'Icon');
      if (!icon || !icon.element) {
        return 0;
      }
      iconWidth = this._getWidthFromDomElementWidth(icon);
    }

    return iconWidth;
  },

  _getWidthFromDomElementWidth: function sb_getWidthFromDomElementWidth(icon) {
    var style = window.getComputedStyle(icon.element);
    var iconWidth = icon.element.clientWidth +
      parseInt(style.marginLeft, 10) +
      parseInt(style.marginRight, 10);

    return iconWidth;
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

  getAllElements: function sb_getAllElements() {
    this._icons = new Map();

    this.element = document.getElementById('statusbar');
    this.background = document.getElementById('statusbar-background');
    this.statusbarIcons = document.getElementById('statusbar-icons');
    this.statusbarIconsMax = document.getElementById('statusbar-maximized');
    this.renderIcons();
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
  },

  toClassName: function(str) {
    str = str.replace(/\-(.)/g, function replacer(str, p1) {
      return p1.toUpperCase();
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
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
