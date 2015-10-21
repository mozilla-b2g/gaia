'use strict';
/* global Service */

window.UtilityTray = {
  name: 'UtilityTray',

  debug: 0 ? console.log.bind(console, '[UtilityTray]') : () => {},

  shown: false,

  // This reflects the target state of
  // the utility tray during animation.
  showing: false,

  // Indicates the overlay is mid-transition,
  // this can be during touch or after when
  // we transition to fully open/closed.
  transitioning: false,

  // Indicates touch is active
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
      'touchend'
    ];

    touchEvents.forEach(function bindEvents(name) {
      this.overlay.addEventListener(name, this);
      this.topPanel.addEventListener(name, this);
    }, this);

    // This is required to prevent b2g-desktop from
    // stealing focus from form fields when the
    // #top-panel is touched. Remove this line if/when
    // b2g-desktop stops disptaching mouse events.
    this.topPanel.addEventListener('mousedown', e => e.preventDefault());

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

    // Firing when the IME switcher shows/hides.
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
   * The minimum transition length for the utility tray animation, in ms.
   */
  MINIMUM_ANIMATION_TIME: 50,

  /*
   * The default length of the utility tray animation, in ms.
   */
  DEFAULT_ANIMATION_TIME: 200,

  startY: undefined,
  lastDelta: 0,
  lastMove: 0,
  lastMoveTime: 0,
  animationTime: 0,
  isTap: false,
  screenWidth: 0,
  screenHeight: 0,
  grippyHeight: 0,
  ambientHeight: 0,
  hideStartCallback: null,

  setFocus: function() {
    return false;
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
    var detail = evt.detail;

    switch (evt.type) {
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

      case 'screenchange':
        if (this.showing && !this.active && !evt.detail.screenEnabled) {
          this.hide(true);
        }
        break;

      case 'touchstart':
        this.onTouchStart(evt);
        break;

      case 'touchmove':
        this.onTouchMove(evt);
        break;

      case 'touchend':
        this.onTouchEnd(evt);
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
        this.transitioning = false;
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

  onTouchStart: function ut_onTouchStart(evt) {
    this.debug('touch start', this.active, this.transitioning);

    if (Service.query('locked') || Service.query('isFtuRunning')) {
      return;
    }

    // If the tray is transitioning,
    // don't interupt it
    if (this.transitioning) {
      return;
    }

    if (this.active) {
      return;
    }

    // We only initiate the dragging transition
    // if the touched element is a drag handle.
    if (!this._isDraggable(evt.target)) {
      return;
    }

    // Addresses bug 1150424.
    evt.preventDefault();

    this.startMove(evt.touches[0]);
  },

  startMove: function(touch) {
    this.debug('start move');

    this.startY = touch.pageY;
    this.active = true;
    this.isTap = true;

    this.validateCachedSizes();
    this.cancelActiveAppTouches(touch);

    var event = this.shown ?
      'utilitytraywillhide':
      'utilitytraywillshow';

    window.dispatchEvent(new CustomEvent(event));
  },

  cancelActiveAppTouches: function(touch) {
    if (!this.screen.classList.contains('utility-tray')) {
      this.debug('cancelling active touches');

      // If the active app was tracking touches it won't get any more events
      // because of the pointer-events:none we're adding.
      // Sending a touchcancel accordingly.
      var app = Service.query('getTopMostWindow');
      if (app && app.config && app.config.oop) {
        app.iframe.sendTouchEvent('touchcancel',
          [touch.identifier],
          [touch.pageX],
          [touch.pageY],
          [touch.radiusX],
          [touch.radiusY],
          [touch.rotationAngle],
          [touch.force],
          1,
          0
        );
      }
    }
  },

  onTouchMove: function ut_onTouchMove(evt) {
    if (!this.active) {
      return;
    }

    this.move(evt.touches[0], evt.timeStamp);
  },

  move: function(touch, timestamp) {
    var screenHeight = this.screenHeight;
    var y = touch.pageY;
    var dy = -(this.startY - y);
    var move = dy - this.lastDelta;
    var moved = Math.abs(move) > 0;

    this.validateCachedSizes();
    this.overlay.classList.add('visible');

    if (moved) {
      this.lastMoveTime = timestamp;
      this.lastMove = move;
    }

    this.lastDelta = dy;

    // It is not longer a tap if
    // the finger moves over 4px.
    if (Math.abs(dy) > 4 && this.isTap) {
      this.debug('not a tap');
      this.publish('-overlayopening');
      this.isTap = false;
    }

    // Don't move the tray until we
    // know the gesture is a swipe.
    if (this.isTap) {
      this.debug('still a tap', this.startY, y);
      return;
    }

    if (this.shown) {
      dy += screenHeight;
    }

    // When the tray has gone beyond it's maximum,
    // reset the start position so that when the
    // finger is dragged up, the tray responds.
    if (this.shown && dy > screenHeight) {
      this.startY = y;
    }

    // Clamp the y position within
    // the vertical screen bounds
    dy = Math.max(0, dy);
    dy = Math.min(screenHeight, dy);

    // Stick the tray to the finger
    var style = this.overlay.style;
    style.transition = '';
    style.transform = 'translateY(' + dy + 'px)';


    // As the tray moves with the finger, we keep
    // the actual content of the tray at the same
    // position on the screen. This means that you
    // can see the content of the tray without
    // the tray having to be fully open.
    this.notifications.style.transition = '';
    this.notifications.style.transform =
      'translateY(' + (this.screenHeight - dy) + 'px)';

    // Hides the real status bar and adds a -moz-element
    // projection of #status-bar into the utility tray
    this.screen.classList.add('utility-tray-in-transition');
    this.transitioning = true;
  },

  onTouchEnd: function ut_onTouchEnd(evt) {
    this.debug('touch end');
    evt.stopImmediatePropagation();

    if (!this.active) {
      return;
    }

    var touch = evt.changedTouches[0];
    this._triggerSearchOnTouchEnd(touch);
    this.endMove(touch, evt.timeStamp);
  },

  endMove: function(touch, timestamp) {
    this.debug('end move');

    // Hide utility tray while
    // the screen is switched off.
    if (Service.query('locked')) {
      this.hide(true);
    } else {

      // We don't do any animation when the tray
      // is down and the user swipes down.
      var down = this.lastDelta > 0;
      var ignore = this.shown && down || this.isTap;

      if (!ignore) {
        var timeDelta = timestamp - this.lastMoveTime;
        var action = this.getAction(touch.pageY);
        this.animationTime = this.getAnimationTime(timeDelta);
        this[action]();
      } else {
        this.debug('no transition', down, this.shown, this.isTap);
        this.transitioning = false;
      }
    }

    this.active = false;
    this.startY = undefined;
    this.lastDelta = 0;
    this.isTap = false;
  },

  getAction: function(y) {
    var significant = Math.abs(this.lastDelta) > (this.screenHeight / 6);
    var down = this.lastMove > 0;
    if (significant) { return down ? 'show' : 'hide'; }
    else { return y > (this.screenHeight / 2) ? 'show' : 'hide'; }
  },

  getAnimationTime: function(timeDelta) {
    var velocity = timeDelta / Math.abs(this.lastMove);
    var time = velocity * (this.shown ?
      this.screenHeight + this.lastDelta :
      this.screenHeight - this.lastDelta);

    return Math.min(this.DEFAULT_ANIMATION_TIME,
      Math.max(this.MINIMUM_ANIMATION_TIME, time));
  },

  hide: function ut_hide(instant = false) {
    this.debug('hide', instant, this.animationTime);

    if (!this.active) {
      window.dispatchEvent(new CustomEvent('utilitytraywillhide'));

      // Do nothing if the
      // utility tray is hidden
      if (!this.showing) {
        return;
      }
    }

    // If the tray is being closed before
    // it was even shown, then the 'willopen'
    // expectation is being aborted'
    if (!this.shown) {
      window.dispatchEvent(new CustomEvent('utility-tray-abortopen'));

      // Don't attempt to close if the
      // tray is not actually visible
      if (!this.transitioning) {
        return;
      }
    }

    this.validateCachedSizes();
    var style = this.overlay.style;
    style.transition = instant ? '' :
      'transform linear ' + this.animationTime + 'ms';
    this.notifications.style.transition = style.transition;
    this.animationTime = this.DEFAULT_ANIMATION_TIME;

    this.showing = false;
    this.transitioning = !instant;

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
    this.debug('show', instant, this.animationTime);

    if (!this.shown) {
      window.dispatchEvent(new CustomEvent('utilitytraywillshow'));
    }

    var transition = instant ? '' :
      'transform linear ' + this.animationTime + 'ms';
    this.animationTime = this.DEFAULT_ANIMATION_TIME;

    this.transitioning = !instant;

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
    this.debug('after show');

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

  /**
   * Trigger search from the left half
   * of the screen if we're LTR And
   * trigger from the right half
   * if we're RTL.
   *
   * @param  {Touch} touch [description]
   */
  _triggerSearchOnTouchEnd: function ut_triggerSearchOnTouchEnd(touch) {
    var corner;

    if (document.documentElement.dir  == 'rtl') {
      corner = touch && (touch.target === this.topPanel) &&
        (touch.pageX > (window.innerWidth / 2));
    } else {
      corner = touch && (touch.target === this.topPanel) &&
        (touch.pageX < (window.innerWidth / 2));
    }

    if (this.isTap && corner) {
      this.debug('trigger search');

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
  },

  updateNotificationCount: function ut_updateNotificationCount() {
    var count = this.notifications.
      querySelectorAll('#desktop-notifications-container .notification, ' +
        '.fake-notification.displayed').length;

    navigator.mozL10n.setAttributes(this.notificationTitle,
      count ? 'statusbarNotifications' : 'statusbarNoNotifications', {
        n: count
      });
  },

  makeAmbientIndicatorActive: function ut_makeAmbientIndicatorActive() {
    this.ambientIndicator.classList.add('active');
  },

  makeAmbientIndicatorInactive: function ut_makeAmbientIndicatorInactive() {
    this.ambientIndicator.classList.remove('active');
  },

  /**
   * Dictates if a touch target
   * element is draggable.
   *
   * EG. We don't want the tray to drag up
   * while a user is tapping a button
   * or a notification.
   *
   * This only runs on 'touchstart' so
   * isn't run that frequently.
   *
   * @param  {HTMLElement}  target
   * @return {Boolean}
   */
  _isDraggable: function ut_isDraggable(target) {
    return ![
      'button',
      '.notification',
      '.fake-notification',
      'li'
    ].some(selector => target.closest(selector));
  }
};
