/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var UtilityTray = {
  shown: false,

  active: false,

  overlay: document.getElementById('utility-tray'),

  statusbar: document.getElementById('statusbar'),

  statusbarIcons: document.getElementById('statusbar-icons'),

  grippy: document.getElementById('utility-tray-grippy'),

  screen: document.getElementById('screen'),

  notifications:
    document.getElementById('desktop-notifications-container'),
  notificationsPlaceholder:
    document.getElementById('desktop-notifications-placeholder'),

  init: function ut_init() {
    var touchEvents = ['touchstart', 'touchmove', 'touchend'];
    touchEvents.forEach(function bindEvents(name) {
      this.overlay.addEventListener(name, this);
      this.statusbarIcons.addEventListener(name, this);
      this.grippy.addEventListener(name, this);
    }, this);

    window.addEventListener('screenchange', this);
    window.addEventListener('emergencyalert', this);
    window.addEventListener('home', this);
    window.addEventListener('attentionscreenshow', this);
    window.addEventListener('launchapp', this);
    window.addEventListener('displayapp', this);
    window.addEventListener('appopening', this);

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
      LazyLoader.load('js/cost_control.js');
    }
  },

  startY: undefined,
  lastDelta: undefined,
  screenHeight: undefined,
  screenWidth: undefined,

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
        break;

      case 'keyboardimeswitcherhide':
        this.overlay.removeEventListener('mousedown', this._pdIMESwitcherShow);
        this.statusbar.removeEventListener('mousedown',
                                           this._pdIMESwitcherShow);
        break;

      case 'screenchange':
        if (this.shown && !evt.detail.screenEnabled)
          this.hide(true);
        break;

      case 'touchstart':
        if (lockScreen.locked || FtuLauncher.isFtuRunning()) {
          return;
        }

        if (target !== this.overlay && target !== this.grippy &&
            evt.currentTarget !== this.statusbarIcons) {
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

        if (!this.active)
          return;

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
          this._hideNotificationsContainer();
        } else {
          this._showNotificationsContainer();
        }
        break;
    }
  },

  onTouchStart: function ut_onTouchStart(touch) {
    var screenRect = this.overlay.getBoundingClientRect();
    this.screenHeight = screenRect.height;
    this.screenWidth = screenRect.width;
    this.active = true;
    this.startY = touch.pageY;
    if (!this.screen.classList.contains('utility-tray')) {
      window.dispatchEvent(new CustomEvent('utility-tray-overlayopening'));
      // If the active app was tracking touches it won't get any more events
      // because of the pointer-events:none we're adding.
      // Sending a touchcancel accordingly.
      var app = AppWindowManager.getActiveApp();
      if (app && app.config && app.config.oop) {
        app.iframe.sendTouchEvent('touchcancel', [touch.identifier],
                                  [touch.pageX], [touch.pageY],
                                  [touch.radiusX], [touch.radiusY],
                                  [touch.rotationAngle], [touch.force], 1);
      }
    }
    this.screen.classList.add('utility-tray');
    this._hideNotificationsContainer();
  },

  _showNotificationsContainer: function ut_showNotificationsContainer() {
    this.notifications.classList.add('above');
    this.notificationsPlaceholder.classList.add('below');

    if (this.notifications && this.notificationsPlaceholder) {
      var rect = this.notificationsPlaceholder.getBoundingClientRect();
      this.notifications.style.top = rect.top + 'px';
    }
  },

  _hideNotificationsContainer: function ut_hideNotificationsContainer() {
    this.notifications.classList.remove('above');
    this.notificationsPlaceholder.classList.remove('below');
  },

  onTouchMove: function ut_onTouchMove(touch) {
    if (!this.active) {
      return;
    }

    var screenHeight = this.screenHeight;

    var y = touch.pageY;

    var dy = -(this.startY - y);
    this.lastDelta = dy;

    if (this.shown) {
      dy += screenHeight;
    }
    dy = Math.min(screenHeight, dy);

    var style = this.overlay.style;
    style.MozTransition = '';
    style.MozTransform = 'translateY(' + dy + 'px)';
  },

  onTouchEnd: function ut_onTouchEnd(touch) {
    // Prevent utility tray shows while the screen got black out.
    if (window.lockScreen && window.lockScreen.locked) {
      this.hide(true);
    } else {
      var significant = (Math.abs(this.lastDelta) > (this.screenHeight / 5));
      var shouldOpen = significant ? !this.shown : this.shown;

      shouldOpen ? this.show() : this.hide();
    }
    this.startY = undefined;
    this.lastDelta = undefined;
    this.screenHeight = undefined;
  },

  hide: function ut_hide(instant) {
    this._hideNotificationsContainer();

    var alreadyHidden = !this.shown;
    var style = this.overlay.style;
    style.MozTransition = instant ? '' : '-moz-transform 0.2s linear';

    // If the transition has not started yet there won't be any transitionend
    // event so let's not wait in order to remove the utility-tray class.
    if (instant || style.MozTransform == '') {
      this.screen.classList.remove('utility-tray');
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
    window.dispatchEvent(new CustomEvent('utility-tray-overlaywillopen'));

    var alreadyShown = this.shown;
    var overlay = this.overlay;
    var style = overlay.style;
    style.MozTransition = '-moz-transform 0.2s linear';
    if (style.MozTransform === 'translateY(100%)') {
      this._showNotificationsContainer();
    } else {
      style.MozTransform = 'translateY(100%)';
    }
    this.shown = true;

    var screen = this.screen;
    overlay.addEventListener('transitionend', function trWait() {
      overlay.removeEventListener('transitionend', trWait);

      screen.classList.add('utility-tray');
      window.dispatchEvent(new CustomEvent('utility-tray-overlayopened'));

      if (!alreadyShown) {
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('utilitytrayshow', true, true, null);
        window.dispatchEvent(evt);
      }
    });
  },

  _pdIMESwitcherShow: function ut_pdIMESwitcherShow(evt) {
    if (evt.target.id !== 'rocketbar-input') {
      evt.preventDefault();
    }
  }
};

UtilityTray.init();
