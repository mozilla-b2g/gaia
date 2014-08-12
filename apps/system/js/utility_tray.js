/* global System */
'use strict';

(function(exports) {
  var UtilityTray = function() {};
  System.create(UtilityTray, {}, {
    name: 'UtilityTray',

    shown: false,

    active: false,

    screen: document.getElementById('screen'),

    containerElement: document.getElementById('screen'),
    view: function() {
      return
      '<div id="utility-tray" data-z-index-level="utility-tray">' +
        '<div id="notifications-placeholder"></div>' +
        '<div id="utility-tray-grippy" role="button" data-l10n-id="utilityTrayGrippy">' +
        '</div>' +
      '</div>' +

      '<!-- Notifications -->' +
      '<div id="utility-tray-notifications" data-z-index-level="utility-tray-notifications">' +
        '<div id="notification-bar">' +
          '<span id="notification-some" data-l10n-id="notifications">Notifications</span>' +

          '<button id="notification-clear" data-l10n-id="clear-all" disabled>Clear all</button>' +
        '</div>' +

        '<div id="notifications-container">' +
          '<!-- Update Manager -->' +
          '<div id="update-manager-container" class="fake-notification" role="link">' +
            '<div class="icon">' +
            '</div>' +
            '<div class="activity">' +
            '</div>' +
            '<div class="message">' +
            '</div>' +
          '</div>' +
          '<!-- Emergency callback Manager -->' +
          '<div id="emergency-callback-notification" class="fake-notification" hidden role="link">' +
            '<div class="icon">' +
            '</div>' +
            '<div class="message" data-l10n-id="emergency-callback-mode">' +
            '</div>' +
            '<div class="timer">' +
            '</div>' +
          '</div>' +
          '<!-- Storage watcher notification -->' +
          '<div id="storage-watcher-container" class="fake-notification" role="link">' +
            '<div class="icon">' +
            '</div>' +
            '<div class="message">' +
            '</div>' +
            '<div class="available-space">' +
            '</div>' +
          '</div>' +
          '<!-- Media playback notification -->' +
          '<div id="media-playback-container" class="fake-notification" hidden>' +
            '<div class="media-playback-nowplaying">' +
              '<div class="icon">' +
              '</div>' +
              '<div class="albumart">' +
              '</div>' +
              '<div class="title" data-l10n-id="mediaPlaybackTitle">' +
              '</div>' +
              '<div class="artist" data-l10n-id="mediaPlaybackArtist">' +
              '</div>' +
            '</div>' +
            '<div class="media-playback-controls" role="toolbar" data-l10n-id="mediaPlaybackControls">' +
              '<button class="previous" data-l10n-id="mediaPlaybackPrevious"></button>' +
              '<button class="play-pause"></button>' +
              '<button class="next" data-l10n-id="mediaPlaybackNext"></button>' +
            '</div>' +
          '</div>' +
          '<!-- App Install Manager -->' +
          '<div id="install-manager-notification-container">' +
          '</div>' +
          '<!-- bluetooth transfer -->' +
          '<div id="bluetooth-transfer-status-list">' +
          '</div>' +
          '<!-- Another entry to show IME list when the keyboard is activated -->' +
          '<div id="keyboard-show-ime-list">' +
            '<div class="fake-notification" role="link">' +
                '<div class="message">' +
                '</div>' +
                '<div class="tip">' +
                '</div>' +
            '</div>' +
          '</div>' +
          '<!-- media recording status -->' +
          '<div id="media-recoding-status-list" role="list">' +
          '</div>' +

          '<div id="desktop-notifications-container">' +
          '</div>' +
        '</div>' +

        '<!-- credit module -->' +
        '<div id="cost-control-widget"></div>' +

        '<!-- quick settings -->' +
        '<div id="quick-settings" role="toolbar">' +
          '<a href="#" id="quick-settings-wifi" data-enabled="false" role="button"></a>' +
          '<div class="separator"></div>' +
          '<a href="#" id="quick-settings-data" data-enabled="false" role="button"></a>' +
          '<div class="separator"></div>' +
          '<a href="#" id="quick-settings-bluetooth" data-enabled="false" role="button"></a>' +
          '<div class="separator"></div>' +
          '<a href="#" id="quick-settings-airplane-mode" data-enabled="false" role="button"></a>' +
          '<div class="separator"></div>' +
          '<a href="#" id="quick-settings-full-app" data-enabled="false" role="button" data-l10n-id="settingsButton"></a>' +
        '</div>' +
      '</div>';
    },

    _start: function ut_init() {
      this.overlay = document.getElementById('utility-tray');
      this.notifications = document.getElementById('utility-tray-notifications');
      this.notificationsPlaceholder =
        document.getElementById('notifications-placeholder');

      this.statusbar = document.getElementById('statusbar');

      this.statusbarIcons = document.getElementById('statusbar-icons');

      this.topPanel = document.getElementById('top-panel');

      this.grippy = document.getElementById('utility-tray-grippy');
      var touchEvents = ['touchstart', 'touchmove', 'touchend'];
      touchEvents.forEach(function bindEvents(name) {
        this.overlay.addEventListener(name, this);
        this.statusbarIcons.addEventListener(name, this);
        this.grippy.addEventListener(name, this);
        this.topPanel.addEventListener(name, this);
      }, this);

      window.addEventListener('screenchange', this);
      window.addEventListener('emergencyalert', this);
      window.addEventListener('home', this);
      window.addEventListener('attentionscreenshow', this);
      window.addEventListener('launchapp', this);
      window.addEventListener('displayapp', this);
      window.addEventListener('appopening', this);
      window.addEventListener('resize', this);

      // Firing when the keyboard and the IME switcher shows/hides.
      window.addEventListener('keyboardimeswitchershow', this);
      window.addEventListener('keyboardimeswitcherhide', this);

      window.addEventListener('simpinshow', this);

      // Firing when user selected a new keyboard or canceled it.
      window.addEventListener('keyboardchanged', this);
      window.addEventListener('keyboardchangecanceled', this);

      // Firing when user swipes down with a screen reader when focused on
      // status bar.
      window.addEventListener('statusbarwheel', this);
      // Firing when user swipes up with a screen reader when focused on grippy.
      this.grippy.addEventListener('wheel', this);

      this.overlay.addEventListener('transitionend', this);

      if (window.navigator.mozMobileConnections) {
        window.LazyLoader.load('js/cost_control.js');
      }
    },

    startY: undefined,
    lastDelta: undefined,
    isTap: false,
    screenWidth: 0,
    screenHeight: 0,
    grippyHeight: 0,
    placeholderHeight: 0,

    handleEvent: function ut_handleEvent(evt) {
      var target = evt.target;
      var detail = evt.detail;

      switch (evt.type) {
        case 'home':
          if (this.shown) {
            this.hide();
            evt.stopImmediatePropagation();
          }
          break;
        case 'attentionscreenshow':
        case 'emergencyalert':
        case 'displayapp':
        case 'keyboardchanged':
        case 'keyboardchangecanceled':
        case 'simpinshow':
        case 'appopening':
          if (this.shown) {
            this.hide();
          }
          break;

        case 'launchapp':
          // we don't want background apps to trigger this event, otherwise,
          // utility tray will be closed accidentally.
          var findMyDevice =
            window.location.origin.replace('system', 'findmydevice');

          var blacklist = [findMyDevice];

          var isBlockedApp = blacklist.some(function(blockedApp) {
            return blockedApp === detail.origin;
          });

          if (!isBlockedApp && this.shown) {
            this.hide();
          }
          break;

        // When IME switcher shows, prevent the keyboard's focus getting changed.
        case 'keyboardimeswitchershow':
          this.overlay.addEventListener('mousedown', this._pdIMESwitcherShow);
          this.statusbar.addEventListener('mousedown', this._pdIMESwitcherShow);
          this.topPanel.addEventListener('mousedown', this._pdIMESwitcherShow);
          break;

        case 'keyboardimeswitcherhide':
          this.overlay.removeEventListener('mousedown', this._pdIMESwitcherShow);
          this.statusbar.removeEventListener('mousedown',
                                             this._pdIMESwitcherShow);
          this.topPanel.removeEventListener('mousedown', this._pdIMESwitcherShow);
          break;

        case 'screenchange':
          if (this.shown && !evt.detail.screenEnabled) {
            this.hide(true);
          }
          break;

        case 'touchstart':
          if (window.System.locked || window.System.runningFTU) {
            return;
          }

          if (target !== this.overlay && target !== this.grippy &&
              evt.currentTarget !== this.statusbarIcons &&
              evt.currentTarget !== this.topPanel) {
            return;
          }

          if (target === this.statusbarIcons || target === this.grippy) {
            evt.preventDefault();
          }

          this.onTouchStart(evt.touches[0]);
          break;

        case 'touchmove':
          if (target === this.statusbarIcons || target === this.grippy) {
            evt.preventDefault();
          }

          this.onTouchMove(evt.touches[0]);
          break;

        case 'touchend':
          if (target === this.statusbarIcons || target === this.grippy) {
            evt.preventDefault();
          }

          evt.stopImmediatePropagation();
          var touch = evt.changedTouches[0];

          if (!this.active) {
            return;
          }

          this.active = false;

          this.onTouchEnd(touch);
          break;

        case 'statusbarwheel':
          this.show();
          break;
        case 'wheel':
          if (evt.deltaMode === evt.DOM_DELTA_PAGE && evt.deltaY &&
            evt.deltaY > 0) {
            this.hide(true);
          }
          break;

        case 'transitionend':
          if (!this.shown) {
            this.screen.classList.remove('utility-tray');
            this.notifications.classList.remove('visible');
          }
          break;

        case 'resize':
          console.log('Window resized');
          this.validateCachedSizes(true);
          break;
      }
    },

    validateCachedSizes: function(refresh) {
      var screenRect;
      if (refresh || !this.screenHeight || !this.screenWidth) {
        screenRect = this.overlay.getBoundingClientRect();
      }

      if (refresh || !this.screenWidth) {
        this.screenWidth = screenRect.width || 0;
      }

      if (refresh || !this.screenHeight) {
        this.screenHeight = screenRect.height || 0;
      }

      if (refresh || !this.grippyHeight) {
        this.grippyHeight = this.grippy.clientHeight || 0;
      }

      if (refresh || !this.placeholderHeight) {
        this.placeholderHeight = this.notificationsPlaceholder.clientHeight || 0;
        this.notifications.style.height = this.placeholderHeight + 'px';
      }
    },

    onTouchStart: function ut_onTouchStart(touch) {
      this.validateCachedSizes();
      this.active = true;
      this.startY = touch.pageY;
      if (!this.screen.classList.contains('utility-tray')) {
        // If the active app was tracking touches it won't get any more events
        // because of the pointer-events:none we're adding.
        // Sending a touchcancel accordingly.
        var app = System.topMostAppWindow;
        if (app && app.config && app.config.oop) {
          app.iframe.sendTouchEvent('touchcancel', [touch.identifier],
                                    [touch.pageX], [touch.pageY],
                                    [touch.radiusX], [touch.radiusY],
                                    [touch.rotationAngle], [touch.force], 1);
        }
      }

      this.isTap = true;

      window.dispatchEvent(new CustomEvent('utility-tray-overlayopening'));
    },

    onTouchMove: function ut_onTouchMove(touch) {
      if (!this.active) {
        return;
      }

      this.validateCachedSizes();
      var screenHeight = this.screenHeight;

      var y = touch.pageY;

      var dy = -(this.startY - y);
      this.lastDelta = dy;

      // Tap threshold
      if (dy > 5) {
        this.isTap = false;
        this.screen.classList.add('utility-tray');
        this.notifications.classList.add('visible');
      }

      if (this.shown) {
        dy += screenHeight;
      }
      dy = Math.min(screenHeight, dy);

      var style = this.overlay.style;
      style.MozTransition = '';
      style.MozTransform = 'translateY(' + dy + 'px)';

      this.notifications.style.transition = '';
      var notificationBottom = Math.max(0, dy - this.grippyHeight);
      this.notifications.style.clip =
        'rect(0, ' + this.screenWidth + 'px, ' + notificationBottom + 'px, 0)';
    },

    onTouchEnd: function ut_onTouchEnd(touch) {
      // Prevent utility tray shows while the screen got black out.
      if (window.System.locked) {
        this.hide(true);
      } else {
        var significant = (Math.abs(this.lastDelta) > (this.screenHeight / 5));
        var shouldOpen = significant ? !this.shown : this.shown;

        shouldOpen ? this.show() : this.hide();
      }

      // Trigger search from the left half of the screen
      var corner = touch && (touch.target === this.topPanel) &&
                   (touch.pageX < (window.innerWidth / 2));
      if (this.isTap && corner) {
        if (this.shown) {
          this.hide();
        }
        setTimeout(function() {
          window.dispatchEvent(new CustomEvent('global-search-request'));
        });
      }

      this.startY = undefined;
      this.lastDelta = undefined;
      this.isTap = false;
    },

    hide: function ut_hide(instant) {
      this.validateCachedSizes();
      var alreadyHidden = !this.shown;
      var style = this.overlay.style;
      style.MozTransition = instant ? '' : '-moz-transform 0.2s linear';
      this.notifications.style.transition = instant ? '' : 'clip 0.2s linear';
      this.notifications.style.clip =
        'rect(0, ' + this.screenWidth + 'px, 0, 0)';

      // If the transition has not started yet there won't be any transitionend
      // event so let's not wait in order to remove the utility-tray class.
      if (instant || style.MozTransform === '') {
        this.screen.classList.remove('utility-tray');
        this.notifications.classList.remove('visible');
      }

      style.MozTransform = '';
      this.shown = false;
      window.dispatchEvent(new CustomEvent('utility-tray-overlayclosed'));

      if (!alreadyHidden) {
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('utilitytrayhide', true, true, null);
        window.dispatchEvent(evt);
      }
    },

    show: function ut_show(dy) {
      this.validateCachedSizes();
      var alreadyShown = this.shown;
      var style = this.overlay.style;
      style.MozTransition = '-moz-transform 0.2s linear';
      style.MozTransform = 'translateY(100%)';

      this.shown = true;
      this.screen.classList.add('utility-tray');
      this.notifications.classList.add('visible');
      this.notifications.style.transition = 'clip 0.2s linear';
      this.notifications.style.height = this.placeholderHeight + 'px';
      var notificationBottom = Math.max(0, this.screenHeight - this.grippyHeight);
      this.notifications.style.clip =
        'rect(0, ' + this.screenWidth + 'px, ' + notificationBottom + 'px, 0)';
      this.notifications.classList.add('visible');
      window.dispatchEvent(new CustomEvent('utility-tray-overlayopened'));

      if (!alreadyShown) {
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('utilitytrayshow', true, true, null);
        window.dispatchEvent(evt);
      }
    },

    _pdIMESwitcherShow: function ut_pdIMESwitcherShow(evt) {
      if (evt.target.id !== 'rocketbar-input') {
        evt.preventDefault();
      }
    }
  });
  exports.UtilityTray = UtilityTray;
}(window));
