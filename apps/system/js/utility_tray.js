'use strict';
/* global Service, UtilityTrayMotion, TouchForwarder */

(function(exports) {

/**
 * The utility tray (the draggable drawer at the top of the screen, providing
 * easy access to notifications and quick settings) is composed of two classes:
 *
 * UtilityTrayMotion, managing the scrolling and snapping behavior, and
 * UtilityTray, representing the state of the UtilityTray.
 *
 * NOTE: The UtilityTray and statusbar interact differently in fullscreen modes.
 * There are two kinds of fullscreen modes:
 *
 *   - "fullscreen" FxOS Apps
 *   - window.requestFullScreen() interactions
 *
 * In both of these fullscreen modes, the utility tray does NOT swipe down
 * immediately. Instead, the first swipe down from the top (via #top-panel)
 * triggers the AppStatusbar to show; then, a second swipe is handled by
 * UtilityTrayMotion to show the utility tray.
 *
 * The expected behavior of this is illustrated in the following video, where
 * the following scenarios are tested:
 *
 *   https://youtu.be/57v25D94zFY
 *
 *   1. No app (first swipe triggers UtilityTray)
 *   2. Fullscreen Gaia app (first swipe triggers Statusbar, second UtilityTray)
 *   3. requestFullScreen app (first swipe Statusbar, second UtilityTray)
 */
exports.UtilityTray = {
  name: 'UtilityTray',

  debug: 0 ? console.log.bind(console, '[UtilityTray]') : () => {},

  shown: false,

  overlay: document.getElementById('utility-tray'),
  motionElement: document.getElementById('utility-tray-motion'),
  notifications: document.getElementById('utility-tray-notifications'),
  statusbar: document.getElementById('statusbar'),
  statusbarIcons: document.getElementById('statusbar-icons'),
  topPanel: document.getElementById('top-panel'),
  ambientIndicator: document.getElementById('ambient-indicator'),
  grippy: document.getElementById('utility-tray-grippy'),
  invisibleGripper: document.getElementById('tray-invisible-gripper'),
  container: document.getElementById('desktop-notifications-container'),
  notificationsContainer: document.getElementById('notifications-container'),
  nestedScrollInterceptor:
    document.getElementById('notifications-nested-scroll-interceptor'),
  notificationTitle: document.getElementById('notification-some'),
  footer: document.getElementById('utility-tray-footer'),
  footerContainer: document.getElementById('tray-footer-container'),
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

  /**
   * Update the max-height of the notifications container to ensure it doesn't
   * overlap with the (position: fixed) footer.
   */
  recalculateNotificationsContainerHeight() {
    this.notificationsContainer.style.maxHeight =
      (this.footerContainer.offsetTop -
       this.notificationsContainer.offsetTop) + 'px';

    // Nested scroll momentum typically propagates across parent containers.
    // However, if the notifications container is scrollable, we do *not* want
    // its scroll momentum to propagate to the Utility Tray itself.
    //
    // In Gecko, scroll momentum does *not* propagate through a scrollable
    // container whose content isn't large enough to require it to actually
    // scroll. (I'm not sure if this is a feature or a bug.) In any case, we've
    // inserted `nestedScrollInterceptor` in between the two scrollable areas,
    // and by setting 'overflow: scroll', we can conditionally interrupt the
    // scroll momentum when notifications-container is scrollable.
    // See <https://bugzil.la/1209387>.
    var notificationsCanScroll = (this.notificationsContainer.scrollTopMax > 0);
    this.nestedScrollInterceptor.style.overflowY =
      (notificationsCanScroll ? 'scroll' : 'hidden');
  },

  toggleFooterDisplay() {
    // If we're nearly fully open, deploy the footer; due to overscroll effects,
    // waiting until the scrolling has stopped completely makes the footer
    // appear sluggish.
    var shouldShow =
      (this.motion.percentVisible === 1) ||
      (this.motion.state === 'opening' && this.motion.percentVisible > 0.95);
    this.footer.classList.toggle('animate-in', shouldShow);
    this.footer.classList.toggle('animate-out', !shouldShow);
  },

  init: function ut_init() {

    // Prepare the tray's motion behavior.
    this.motion = new UtilityTrayMotion(this.motionElement);
    this.motion.el.addEventListener('tray-motion-state', this);
    this.motion.el.addEventListener('tray-motion-footer-position', this);
    this.motion.el.classList.remove('utility-tray-loading');

    // The footer size (containing the media player and cost-control-widget)
    // is variable and difficult to compute with CSS in a maintainable way,
    // especially when we account for future addons or other modifications to
    // the tray. Instead, we calculate the desired height on-the-fly, by
    // observing when key footer elements change relevant state.
    // Ideally, we would observe the whole footer for DOM changes, to make it
    // easier for addon developers, but for now we just observe the relevant
    // changes to the only two variable elements:
    var observer = new MutationObserver(
      this.recalculateNotificationsContainerHeight.bind(this));
    // MediaPlaybackWidget does not currently emit any events when it changes;
    // it is assumed here that MediaPlaybackWidget has a fixed height; here we
    // just listen to the attribute "hidden"'s state.
    observer.observe(document.getElementById('media-playback-container'), {
      attributes: true,
      attributeFilter: ['hidden']
    });
    // It's not clear that the cost control widget ever changes or hides
    // (much of its behavior happens in an iframe), but for completeness:
    observer.observe(document.getElementById('cost-control-widget'), {
      subtree: true,
      childList: true
    });
    // If the notifications container becomes scrollable, we may conditionally
    // update the behavior of this.nestedScrollInterceptor. (We can't just
    // intercept a "notification emitted" event, because there isn't a unified
    // event to listen for.)
    observer.observe(this.notificationsContainer, {
      subtree: true,
      childList: true
    });
    this.recalculateNotificationsContainerHeight();

    // This is required to prevent b2g-desktop from
    // stealing focus from form fields when the
    // #top-panel is touched. Remove this line if/when
    // b2g-desktop stops disptaching mouse events.
    this.topPanel.addEventListener('mousedown', e => e.preventDefault());
    this.invisibleGripper.addEventListener(
      'mousedown', e => e.preventDefault());

    window.addEventListener('screenchange', this);
    window.addEventListener('resize', this);
    window.addEventListener('emergencyalert', this);
    window.addEventListener('home', this);
    window.addEventListener('attentionopened', this);
    window.addEventListener('attentionwill-become-active', this);
    window.addEventListener('launchapp', this);
    window.addEventListener('displayapp', this);
    window.addEventListener('appopening', this);
    window.addEventListener('activityopening', this);
    window.addEventListener('cardviewbeforeshow', this);
    window.addEventListener('sheets-gesture-begin', this);

    // Listen for screen reader edge gestures
    window.addEventListener('mozChromeEvent', this);

    // Firing when the IME switcher shows/hides.
    window.addEventListener('imemenushow', this);

    window.addEventListener('simlockshow', this);

    // Firing when user selected a new keyboard or canceled it.
    window.addEventListener('keyboardchanged', this);
    window.addEventListener('keyboardchangecanceled', this);

    this.motion.el.addEventListener('wheel', this);
    this.statusbar.addEventListener('wheel', this);

    this.invisibleGripper.addEventListener('click',
      this._forwardInvisibleGripperClick.bind(this));

    Service.request('registerHierarchy', this);

    Service.register('makeAmbientIndicatorActive', this);
    Service.register('makeAmbientIndicatorInactive', this);
    Service.register('hide', this);
    Service.register('show', this);
    Service.register('updateNotificationCount', this);
    Service.registerState('shown', this);
  },

  setHierarchy: function() {
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

  hide(immediately) {
    if (this.motion.state === 'open' || this.motion.state === 'opening') {
      this.motion.close(immediately);
    }
  },

  show(immediately) {
    if (this.motion.state === 'closed' || this.motion.state === 'closing') {
      this.motion.open(immediately);
    }
  },

  /**
   * Handle the tray changing state, e.g. from "opening" to "open". The possible
   * states are "closed", "opening", "open", and "closing", as noted in
   * `utility_tray_motion.js`. We only receive state change notifications if
   * the state actually changed from one to another.
   *
   * For historical reasons, we emit many different events; some could be
   * condensed in the future if desired.
   *
   * @param {string} state
   * @param {string} previousState
   */
  handleTrayStateChange: function(state, previousState) {
    // Update the state first, so that events receive the proper new state.
    this.shown = (state === 'open');

    if (state === 'opening') {
      this.recalculateNotificationsContainerHeight();
      if (!this.screen.classList.contains('utility-tray')) {
        setTimeout(() => {
          // If the active app was tracking touches it won't get any more events
          // because of the "pointer-events: none" we're adding. Send a
          // "touchcancel" event accordingly. This happens in a timeout to
          // prevent interrupting the current event loop, in case we arrive here
          // from an existing touch handler.
          var touch = this.motion.currentTouch;
          var app = Service.query('getTopMostWindow');
          if (touch && app && app.config && app.config.oop) {
            app.iframe.sendTouchEvent('touchcancel', [touch.identifier],
                                      [touch.pageX], [touch.pageY],
                                      [touch.radiusX], [touch.radiusY],
                                      [touch.rotationAngle], [touch.force],
                                      1, 0);
          }
        });
      }

      this.publish('-overlayopening');
      window.dispatchEvent(new CustomEvent('utilitytraywillshow'));
    } else if (state === 'closing') {
      window.dispatchEvent(new CustomEvent('utilitytraywillhide'));
    } else if (state === 'closed') {
      window.dispatchEvent(new CustomEvent('utility-tray-overlayclosed'));
      window.dispatchEvent(new CustomEvent('utilitytrayhide'));
      this.publish('-deactivated');
    } else if (state === 'open') {
      window.dispatchEvent(new CustomEvent('utility-tray-overlayopened'));
      window.dispatchEvent(new CustomEvent('utilitytrayshow'));
      this.publish('-activated');
    }

    // If the screen is locked, the tray should remain invisible.
    if ((state === 'opening' || state === 'open') &&
        Service.query('locked')) {
      this.hide(true);
    }

    if (state === 'opening' && previousState === 'closing') {
      window.dispatchEvent(new CustomEvent('utility-tray-abortclose'));
    } else if (state === 'closing' && previousState === 'opening') {
      window.dispatchEvent(new CustomEvent('utility-tray-abortopen'));
    }

    this.overlay.setAttribute('aria-hidden', state !== 'open');
    this.screen.classList.toggle('utility-tray', this.shown);
    this.screen.classList.toggle('utility-tray-in-transition',
                                 state === 'opening' || state === 'closing');
  },

  handleEvent: function ut_handleEvent(evt) {
    var detail = evt.detail;

    switch (evt.type) {
      case 'resize':
        this.recalculateNotificationsContainerHeight();
        break;
      case 'tray-motion-state':
        this.handleTrayStateChange(evt.detail.value, evt.detail.previousValue);
        this.toggleFooterDisplay();
        break;
      case 'tray-motion-footer-position':
        this.toggleFooterDisplay();
        break;
      case 'cardviewbeforeshow':
        this.hide(true);
        break;
      case 'home':
        this.hide();
        if (evt.type == 'home') {
          evt.stopImmediatePropagation();
        }
        break;
      case 'attentionopened':
      case 'attentionwill-become-active':
      case 'emergencyalert':
      case 'displayapp':
      case 'keyboardchanged':
      case 'keyboardchangecanceled':
      case 'simlockshow':
      case 'appopening':
      case 'activityopening':
      case 'sheets-gesture-begin':
      case 'imemenushow':
        this.hide();
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

        if (!isBlockedApp) {
          this.hide();
        }
        break;

      case 'screenchange':
        // If the screen goes black, hide the tray.
        if (!evt.detail.screenEnabled) {
          this.hide(true);
        }
        break;

      case 'wheel':
        evt.preventDefault();
        // When the user swipes up/down using the "wheel" accessibility gesture,
        // open and/or close the tray accordingly. (Two-finger swipe up/down.)
        if (evt.deltaMode === evt.DOM_DELTA_PAGE && evt.deltaY) {
          if (this.motion.state === 'open' && evt.deltaY > 0) {
            this.hide(true);
          } else if (this.motion.state === 'closed' && evt.deltaY < 0) {
            this.show(true);
          }
        }
        break;

      case 'mozChromeEvent':
        if (evt.detail.type !== 'accessibility-control') {
          break;
        }
        var eventType = JSON.parse(evt.detail.details).eventType;
        if (eventType === 'edge-swipe-down' &&
          !Service.query('locked') &&
          !Service.query('isFtuRunning')) {
          if (this.motion.state === 'open') {
            this.hide(true);
          } else {
            this.show(true);
          }
        }
        break;
    }
  },

  /**
   * When we receive a click on the transparent gripper, forward the click
   * to the element below.
   *
   * Normally, when you swipe down from the top of the screen, your finger
   * latches onto the transparent gripper element resting at the top of the
   * screen. This initiates a scroll, and pulls the tray down.
   *
   * But we only need that element to trigger scrolling, not tapping. We want
   * clicks to pass through the transparent gripper to the app below.
   *
   * NOTE: Ideally, we would want a long-press gesture to also pass through
   * the element, however we cannot forward the long-press gesture to the
   * underlying element (HTMLIFrameElement.sendTouchEvent() happens too late
   * in the pipeline to trigger a long-press, e.g. a copy/paste operation).
   * See <https://groups.google.com/forum/#!topic/mozilla.dev.fxos/1Kh8RrK7QWI>.
   */
  _forwardInvisibleGripperClick(evt) {
    // The most precise way to forward clicks is to use
    // document.elementFromPoint(), but that causes a reflow.
    // Instead, just use a static hit test area for now.
    var app = Service.query('getTopMostWindow');
    if (!app) {
      return;
    }
    var STATUSBAR_HIT_AREA_HEIGHT = 30;
    var STATUSBAR_HIT_AREA_WIDTH = window.innerWidth / 2;

    if (evt.clientY < STATUSBAR_HIT_AREA_HEIGHT &&
        evt.clientX < STATUSBAR_HIT_AREA_WIDTH &&
        app.appChrome.urlbar) {
      var forwarder = new TouchForwarder(app.appChrome.urlbar);
      forwarder.forward(evt);
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

};



})(window); // end function wrapper
