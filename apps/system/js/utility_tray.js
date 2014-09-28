/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';
/* global CostControl */

var UtilityTray = {
  shown: false,

  active: false,

  overlay: document.getElementById('utility-tray'),

  notifications: document.getElementById('utility-tray-notifications'),

  notificationsPlaceholder:
    document.getElementById('notifications-placeholder'),

  statusbar: document.getElementById('statusbar'),

  statusbarIcons: document.getElementById('statusbar-icons'),

  topPanel: document.getElementById('top-panel'),

  grippy: document.getElementById('utility-tray-grippy'),

  container: document.getElementById('desktop-notifications-container'),

  notificationTitle: document.getElementById('notification-some'),

  screen: document.getElementById('screen'),

  init: function ut_init() {
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
    window.addEventListener('attentionopened', this);
    window.addEventListener('attentionwill-become-active', this);
    window.addEventListener('launchapp', this);
    window.addEventListener('displayapp', this);
    window.addEventListener('appopening', this);
    window.addEventListener('resize', this);
    window.addEventListener('cardviewbeforeshow', this);

    // Listen for screen reader edge gestures
    window.addEventListener('mozChromeEvent', this);

    // Firing when the keyboard and the IME switcher shows/hides.
    window.addEventListener('keyboardimeswitchershow', this);
    window.addEventListener('keyboardimeswitcherhide', this);
    window.addEventListener('imemenushow', this);

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

    window.addEventListener('software-button-enabled', this);
    window.addEventListener('software-button-disabled', this);

    if (window.navigator.mozMobileConnections) {
      window.LazyLoader.load('js/cost_control.js', function() {
        this.costControl = new CostControl();
        this.costControl.start();
      }.bind(this));
    }
  },

  addHomeListener: function ut_addHomeListener() {
    window.addEventListener('home', this);
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
      case 'cardviewbeforeshow':
        this.hide(true);
        break;

      case 'attentionopened':
      case 'attentionwill-become-active':
      case 'home':
        if (this.shown) {
          this.hide();
          if (evt.type == 'home') {
            evt.stopImmediatePropagation();
          }
        }
        break;
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

      case 'imemenushow':
        this.hide();
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
        this.validateCachedSizes(true);
        if (this.shown)
          this.updateSize();
        break;

      case 'mozChromeEvent':
        if (evt.detail.type !== 'accessibility-control') {
          break;
        }
        var eventType = JSON.parse(evt.detail.details).eventType;
        if (eventType === 'edge-swipe-down') {
          this[this.shown ? 'hide' : 'show']();
        }
        break;

      case 'software-button-enabled':
      case 'software-button-disabled':
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
      var app = System.currentApp;
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

    var notificationClipOffset =
      this.notifications.offsetTop + this.statusbar.clientHeight;
    this.notifications.style.transition = instant ? '' : 'clip 0.2s linear';
    this.notifications.style.clip =
      'rect(0, ' + this.screenWidth + 'px,' + (-notificationClipOffset) +
      'px, 0)';

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
    this.updateSize();
    var alreadyShown = this.shown;
    var style = this.overlay.style;
    style.MozTransition = '-moz-transform 0.2s linear';
    style.MozTransform = 'translateY(100%)';

    this.shown = true;
    this.screen.classList.add('utility-tray');
    this.notifications.classList.add('visible');
    this.notifications.style.transition = 'clip 0.2s linear';
    window.dispatchEvent(new CustomEvent('utility-tray-overlayopened'));

    if (!alreadyShown) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('utilitytrayshow', true, true, null);
      window.dispatchEvent(evt);
    }
  },

  updateNotificationCount: function ut_updateNotificationCount() {
    var count = this.container.querySelectorAll('.notification').length;
    navigator.mozL10n.setAttributes(this.notificationTitle,
      'statusbarNotifications', {
        n: count
      });
  },

  updateSize: function ut_updateSize() {
    this.notifications.style.height = this.placeholderHeight + 'px';
    var notificationBottom = Math.max(0, this.screenHeight - this.grippyHeight);
    this.notifications.style.clip =
      'rect(0, ' + this.screenWidth + 'px, ' + notificationBottom + 'px, 0)';
  },

  _pdIMESwitcherShow: function ut_pdIMESwitcherShow(evt) {
    if (evt.target.id !== 'rocketbar-input') {
      evt.preventDefault();
    }
  }
};

// This listener is added here in order to stop the propagation of the 'home'
// event while the utility tray is being closed
UtilityTray.addHomeListener();
