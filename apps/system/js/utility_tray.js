'use strict';
/* global Service */

window.UtilityTray = {
  name: 'UtilityTray',

  shown: false,

  // This reflects the target state of the utility tray during animation.
  showing: false,

  active: false,

  overlay: document.getElementById('utility-tray'),

  notifications: document.getElementById('utility-tray-notifications'),

  statusbar: document.getElementById('statusbar'),

  statusbarIcons: document.getElementById('statusbar-icons'),

  topPanel: document.getElementById('top-panel'),

  ambientIndicator: document.getElementById('ambient-indicator'),

  grippy: document.getElementById('utility-tray-grippy'),

  container: document.getElementById('desktop-notifications-container'),

  notificationTitle: document.getElementById('notification-some'),

  screen: document.getElementById('screen'),

  EVENT_PREFIX: 'utilitytray',

  publish: function(evtName) {
    window.dispatchEvent(new CustomEvent(this.EVENT_PREFIX + evtName, {
      detail: this
    }));
  },

  isActive: function() {
    return this.shown;
  },

  focus: function() {},
  blur: function() {},

  init: function ut_init() {
    var touchEvents = [
      'touchstart',
      'touchmove',
      'touchend',
      'mousedown'
    ];

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
    window.addEventListener('activityopening', this);
    window.addEventListener('resize', this);
    window.addEventListener('cardviewbeforeshow', this);
    window.addEventListener('sheets-gesture-begin', this);
    window.addEventListener('sheets-gesture-end', this);

    // Listen for screen reader edge gestures
    window.addEventListener('mozChromeEvent', this);

    // Firing when the keyboard and the IME switcher shows/hides.
    window.addEventListener('keyboardimeswitchershow', this);
    window.addEventListener('keyboardimeswitcherhide', this);
    window.addEventListener('imemenushow', this);

    window.addEventListener('simlockshow', this);

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

    this.animationTime = this.DEFAULT_ANIMATION_TIME;

    Service.request('registerHierarchy', this);

    Service.register('makeAmbientIndicatorActive', this);
    Service.register('makeAmbientIndicatorInactive', this);
    Service.register('hide', this);
    Service.register('updateNotificationCount', this);
    Service.registerState('shown', this);
  },

  /*
   * The time after which we shouldn't use motion events to determine the
   * speed of the utility tray opening/closing, in milliseconds.
   */
  MAX_SWIPE_AGE: 50,

  /*
   * The minimum transition length for the utility tray animation, in seconds.
   */
  MINIMUM_ANIMATION_TIME: 0.05,

  /*
   * The default length of the utility tray animation, in seconds.
   */
  DEFAULT_ANIMATION_TIME: 0.2,

  startY: undefined,
  lastDelta: undefined,
  lastMove: 0,
  lastMoveTime: 0,
  animationTime: 0,
  isTap: false,
  screenWidth: 0,
  screenHeight: 0,
  grippyHeight: 0,
  ambientHeight: 0,
  hideStartCallback: null,

  setHierarchy: function(active) {
    if (active && this.isActive()) {
      return true;
    } else if (active && !this.isActive()) {
      // this.isActive is false, we cannot focus it. Something wrong, fallback
      // to lower UI.
      return false;
    } else if (!active && this.isActive()) {
      return true;
    } else {
      // utility tray is not active and we try to deactivate it. It's fine.
      return true;
    }
  },

  _handle_home: function() {
    if (this.isActive()) {
      this.hide();
      return false;
    }
    return true;
  },

  respondToHierarchyEvent: function(evt) {
    if (this['_handle_' + evt.type]) {
      return this['_handle_' + evt.type](evt);
    } else {
      return true;
    }
  },

  handleEvent: function ut_handleEvent(evt) {
    var target = evt.target;
    var detail = evt.detail;

    switch (evt.type) {
      case 'mousedown':
        if (this._shouldPrevent(target)) {
          evt.preventDefault();
        }
        break;
      case 'cardviewbeforeshow':
        this.hide(true);
        break;

      case 'attentionopened':
      case 'attentionwill-become-active':
      case 'home':
        if (this.showing) {
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
      case 'simlockshow':
      case 'appopening':
      case 'activityopening':
        if (this.showing) {
          this.hide();
        }
        break;

      case 'sheets-gesture-begin':
        this.overlay.classList.add('on-edge-gesture');
        break;
      case 'sheets-gesture-end':
        this.overlay.classList.remove('on-edge-gesture');
        break;

      case 'launchapp':
        // We don't want background apps to trigger this event, otherwise,
        // utility tray will be closed accidentally.
        if (detail && detail.stayBackground) {
          return;
        }

        var findMyDevice =
          window.location.origin.replace('system', 'findmydevice');

        var blacklist = [findMyDevice];

        var isBlockedApp = blacklist.some(function(blockedApp) {
          return blockedApp === detail.origin;
        });

        if (!isBlockedApp && this.showing) {
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
        break;

      case 'keyboardimeswitcherhide':
        this.overlay.removeEventListener('mousedown', this._pdIMESwitcherShow);
        this.statusbar.removeEventListener('mousedown',
                                           this._pdIMESwitcherShow);
        break;

      case 'screenchange':
        if (this.showing && !this.active && !evt.detail.screenEnabled) {
          this.hide(true);
        }
        break;

      case 'touchstart':
        if (Service.query('locked') || Service.query('isFtuRunning')) {
          return;
        }

        // Prevent swipe down gesture when already opened/opening.
        if (target !== this.grippy && this.showing) {
          return;
        }

        if (target !== this.overlay && target !== this.grippy &&
            evt.currentTarget !== this.statusbarIcons &&
            evt.currentTarget !== this.topPanel) {
          return;
        }

        if (this._shouldPrevent(target)) {
          evt.preventDefault();
        }

        this.onTouchStart(evt.touches[0]);
        break;

      case 'touchmove':
        if (this._shouldPrevent(target)) {
          evt.preventDefault();
        }

        this.onTouchMove(evt.touches[0], evt.timeStamp);
        break;

      case 'touchend':
        if (this._shouldPrevent(target)) {
          evt.preventDefault();
        }

        evt.stopImmediatePropagation();
        var touch = evt.changedTouches[0];

        if (!this.active) {
          return;
        }

        this.onTouchEnd(touch, evt.timeStamp);
        break;

      case 'statusbarwheel':
        this.show(true);
        break;
      case 'wheel':
        if (evt.deltaMode === evt.DOM_DELTA_PAGE && evt.deltaY &&
          evt.deltaY > 0) {
          this.hide(true);
        }
        break;

      case 'transitionend':
        this.showing ? this.afterShow() : this.afterHide();
        this.screen.classList.remove('utility-tray-in-transition');
        break;

      case 'resize':
        this.validateCachedSizes(true);
        break;

      case 'mozChromeEvent':
        if (evt.detail.type !== 'accessibility-control') {
          break;
        }
        var eventType = JSON.parse(evt.detail.details).eventType;
        if (eventType === 'edge-swipe-down' &&
          !Service.query('locked') &&
          !Service.query('isFtuRunning')) {
          this[this.showing ? 'hide' : 'show'](true);
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

    if (refresh || !this.ambientHeight) {
      this.ambientHeight = this.ambientIndicator.clientHeight || 0;
    }

    if (refresh || !this.screenWidth) {
      this.screenWidth = screenRect.width || 0;
    }

    if (refresh || !this.screenHeight) {
      this.screenHeight = (screenRect.height - this.ambientHeight) || 0;
    }

    if (refresh || !this.grippyHeight) {
      this.grippyHeight = this.grippy.clientHeight || 0;
    }
  },

  onTouchStart: function ut_onTouchStart(touch) {
    if (this.active) {
      return;
    }

    this.validateCachedSizes();
    this.active = true;
    this.startY = touch.pageY;
    if (!this.screen.classList.contains('utility-tray')) {
      // If the active app was tracking touches it won't get any more events
      // because of the pointer-events:none we're adding.
      // Sending a touchcancel accordingly.
      var app = Service.query('getTopMostWindow');
      if (app && app.config && app.config.oop) {
        app.iframe.sendTouchEvent('touchcancel', [touch.identifier],
                                  [touch.pageX], [touch.pageY],
                                  [touch.radiusX], [touch.radiusY],
                                  [touch.rotationAngle], [touch.force], 1, 0);
      }
    }

    this.isTap = true;

    if (this.shown) {
      window.dispatchEvent(new CustomEvent('utilitytraywillhide'));
    } else {
      window.dispatchEvent(new CustomEvent('utilitytraywillshow'));
    }
  },

  onTouchMove: function ut_onTouchMove(touch, timestamp) {
    if (!this.active) {
      return;
    }

    this.validateCachedSizes();
    this.overlay.classList.add('visible');
    var screenHeight = this.screenHeight;

    var y = touch.pageY;
    var dy = -(this.startY - y);

    var move = dy - this.lastDelta;
    if (Math.abs(move) > 0) {
      this.lastMoveTime = timestamp;
      this.lastMove = move;
    }

    this.lastDelta = dy;

    // Tap threshold
    if (dy > 5 && this.isTap) {
      this.publish('-overlayopening');
      this.isTap = false;
    }

    if (this.shown) {
      dy += screenHeight;
    }

    dy = Math.max(0, dy);
    dy = Math.min(screenHeight, dy);

    var style = this.overlay.style;
    style.transition = '';
    style.transform = 'translateY(' + dy + 'px)';

    this.notifications.style.transition = '';
    this.notifications.style.transform =
      'translateY(' + (this.screenHeight - dy) + 'px)';

    this.screen.classList.add('utility-tray-in-transition');
  },

  onTouchEnd: function ut_onTouchEnd(touch, timestamp) {
    // Prevent utility tray shows while the screen got black out.
    if (Service.query('locked')) {
      this.hide(true);
    } else {
      var timeDelta = timestamp - this.lastMoveTime;
      var significant = (Math.abs(this.lastDelta) > (this.screenHeight / 5));
      var shouldOpen = significant ? !this.shown : this.shown;

      if (significant && timeDelta <= this.MAX_SWIPE_AGE &&
          (this.lastMove < 0) === this.shown) {
        var velocity = (timeDelta / 1000) / Math.abs(this.lastMove);
        this.animationTime =
          Math.min(this.DEFAULT_ANIMATION_TIME,
            Math.max(this.MINIMUM_ANIMATION_TIME,
              velocity * (this.shown ?
                          this.screenHeight + this.lastDelta :
                          this.screenHeight - this.lastDelta)));
      }

      shouldOpen ? this.show() : this.hide();
    }

    /*
     * Trigger search from the left half of the screen if we're LTR
     * And trigger from the right half if we're RTL.
     */
    var corner;
    if (document.documentElement.dir  == 'rtl') {
      corner = touch && (touch.target === this.topPanel) &&
                 (touch.pageX > (window.innerWidth / 2));
    } else {
      corner = touch && (touch.target === this.topPanel) &&
                 (touch.pageX < (window.innerWidth / 2));
    }
    if (this.isTap && corner) {
      if (this.showing) {
        this.hide();
      }
      var app = Service.query('getTopMostWindow');
      var combinedView = app.appChrome && app.appChrome.useCombinedChrome();
      var isTransitioning = app.isTransitioning();

      if (!isTransitioning && combinedView && !app.appChrome.isMaximized()) {
        app.appChrome.titleClicked();
      }
    }

    this.active = false;
    this.startY = undefined;
    this.lastDelta = undefined;
    this.isTap = false;
  },

  hide: function ut_hide(instant = false) {
    if (!this.active) {
      window.dispatchEvent(new CustomEvent('utilitytraywillhide'));
    }

    this.validateCachedSizes();
    var style = this.overlay.style;

    style.transition = instant ? '' :
      'transform linear ' + this.animationTime + 's';
    this.notifications.style.transition = style.transition;
    this.animationTime = this.DEFAULT_ANIMATION_TIME;

    this.showing = false;

    if (instant || style.transform === '') {
      this.afterHide();
    } else if (this.hideStartCallback === null) {
      // We want to remove the utility-tray class from the screen at the start
      // of the animation, but if we do it outside of a timeout, the work will
      // align with the start of the animation and cause a noticeable delay.
      this.hideStartCallback = setTimeout(() => {
        this.hideStartCallback = null;
        this.screen.classList.remove('utility-tray');
      }, 20);
    }

    style.transform = '';
    var offset = this.grippyHeight - this.ambientHeight;
    var notifTransform = 'calc(100% + ' + offset + 'px)';
    this.notifications.style.transform = 'translateY(' + notifTransform + ')';

    if (!this.shown) {
      window.dispatchEvent(new CustomEvent('utility-tray-abortopen'));
    }
  },

  afterHide: function ut_after_hide() {
    if (this.hideStartCallback) {
      clearTimeout(this.hideStartCallback);
      this.hideStartCallback = null;
    }

    this.screen.classList.remove('utility-tray');
    this.overlay.classList.remove('visible');

    if (!this.shown) {
      return;
    }

    this.shown = false;
    window.dispatchEvent(new CustomEvent('utility-tray-overlayclosed'));

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('utilitytrayhide', true, true, null);
    window.dispatchEvent(evt);
    this.publish('-deactivated');
  },

  show: function ut_show(instant = false) {
    if (!this.active) {
      window.dispatchEvent(new CustomEvent('utilitytraywillshow'));
    }

    var transition = instant ? '' :
      'transform linear ' + this.animationTime + 's';
    this.animationTime = this.DEFAULT_ANIMATION_TIME;

    this.validateCachedSizes();
    var translate = this.ambientHeight + 'px';
    var style = this.overlay.style;
    style.transition = transition;
    style.transform = 'translateY(calc(100% - ' + translate + '))';
    this.notifications.style.transition = transition;
    this.notifications.style.transform = '';

    this.showing = true;

    if (instant) {
      this.afterShow();
    }

    if (this.shown) {
      window.dispatchEvent(new CustomEvent('utility-tray-abortclose'));
    }
  },

  afterShow: function ut_after_show() {
    this.screen.classList.add('utility-tray');
    this.overlay.classList.add('visible');

    if (this.shown) {
      return;
    }

    this.shown = true;
    window.dispatchEvent(new CustomEvent('utility-tray-overlayopened'));

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('utilitytrayshow', true, true, null);
    window.dispatchEvent(evt);
    this.publish('-activated');
  },

  updateNotificationCount: function ut_updateNotificationCount() {
    var count = this.notifications.
      querySelectorAll('#desktop-notifications-container .notification, ' +
        '.fake-notification.displayed').length;

    navigator.mozL10n.setAttributes(this.notificationTitle,
      'statusbarNotifications', {
        n: count
      });
  },

  makeAmbientIndicatorActive: function ut_makeAmbientIndicatorActive() {
    this.ambientIndicator.classList.add('active');
  },

  makeAmbientIndicatorInactive: function ut_makeAmbientIndicatorInactive() {
    this.ambientIndicator.classList.remove('active');
  },

  _pdIMESwitcherShow: function ut_pdIMESwitcherShow(evt) {
    if (evt.target.id !== 'rocketbar-input') {
      evt.preventDefault();
    }
  },

  _shouldPrevent: function ut_shouldPrevent(currentTarget) {
    var targeted = [this.grippy, this.statusbarIcons, this.topPanel];
    return targeted.some(function(target) {
      return target === currentTarget;
    });
  }
};
