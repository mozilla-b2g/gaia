/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Shrinking UI: would make app window tilted and ready to be tapped, dragged
 * and sent out and received in. It receives four events to do the UI change:
 *
 * 'shrinking-start': tilt the window and let user can drag it
 * 'shrinking-stop' : tilt the window back immediately and let user can use it
 * 'shrinking-receiving' : after the app launched, do the receiving animation
 * 'shrinking-rejected': show the animation when the sending was rejected
 *
 * It would send an event out to nofify that the user has dragged the window
 * to the top of the frame, which means the content should be sent:
 * (@see '_handleSendingOut')
 *
 * 'shrinking-sent': user has dragged the window to the top of the frame
 *
 * The caller should notice that after the first time the window got tilted,
 * it must be tilted back by the 'shrinking-stop' event, or the app window
 * and the whole Gaia may be malfunctioning. Also, when the screen got black
 * out, or any other state changes occurs, the whole shrinking process would be
 * interrupted, and the 'shrinking-stop' is necessary in such situation.
 *
 */
(function(exports) {

  var ShrinkingUI = {
    THRESHOLD: 50,
    SUSPEND_INTERVAL: 100,
    apps: {},
    current: {
      manifestURL: '',
      wrapper: null,
      appFrame: null,
      tip: null,
      cover: null
    },
    state: {
      overThreshold: false,
      toward: 'TOP',
      suspended: false,
      delaySlidingID: null,
      touch: {
        initY: -1,
        prevY: -1
      }
    }
  };

  /**
   * Bind events and do some necessary initialization.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI.initialize =
    (function su_initialize() {
      window.addEventListener('appcreated', this);
      window.addEventListener('appterminated', this);
      window.addEventListener('appopen', this);
      window.addEventListener('shrinking-start', this);
      window.addEventListener('shrinking-stop', this);
      window.addEventListener('shrinking-receiving', this);
      window.addEventListener('shrinking-rejected', this);
      window.addEventListener('check-p2p-registration-for-active-app', this);
      window.addEventListener('dispatch-p2p-user-response-on-active-app', this);
    }).bind(ShrinkingUI);

  /**
   * The event dispatcher.
   *
   * @param {event} |evt|
   * @this {ShrinkingUI}
   */
  ShrinkingUI.handleEvent =
    (function su_handleEvent(evt) {

      // We can't handle pages without manifestURL.
      switch (evt.type) {
        case 'appcreated':
        case 'appterminated':
        case 'appopen':
          if (!evt.detail || !evt.detail.manifestURL)
            return;
      }

      switch (evt.type) {
        case 'appcreated':
          var app = evt.detail;
          this._register(app);
          break;
        case 'appterminated':
          if (this._state() &&
              evt.detail.manifestURL === this.current.manifestURL)
            this._cleanEffects();
          this._unregister(evt.detail.manifestURL);
          break;
        case 'appopen':
          var config = evt.detail;
          this._switchTo(config.manifestURL);
          break;
        case 'shrinking-start':
          this._setup();
          this.start();
          break;
        case 'shrinking-stop':
          this.stop();
          break;
        case 'shrinking-receiving':
          // It should be launched, then received.
          // So we'll get a new app.
          this._setup();
          this._receivingEffects();
          break;
        case 'shrinking-rejected':
          this._rejected();
          break;
        case 'check-p2p-registration-for-active-app':
          if (evt.detail && evt.detail.checkP2PRegistration) {
            var manifestURL = this.current.manifestURL;
            evt.detail.checkP2PRegistration(this.currentAppURL);
          }
          break;
        case 'dispatch-p2p-user-response-on-active-app':
          if (evt.detail && evt.detail.dispatchP2PUserResponse) {
            var manifestURL = this.current.manifestURL;
            evt.detail.dispatchP2PUserResponse(this.currentAppURL);
          }
          break;
      }
    }).bind(ShrinkingUI);

  /**
   * Register an app.
   *
   * @param {AppWindow} |app|
   * @this {ShrinkingUI}
   */
  ShrinkingUI._register =
    (function su_register(app) {
      this.apps[app.manifestURL] = app;
    }).bind(ShrinkingUI);

  /**
   * Unregister an app.
   *
   * @param {string} |manifestURL| the manifest URL.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._unregister =
    (function su_unregister(manifestURL) {
      delete this.apps[manifestURL];
    }).bind(ShrinkingUI);

  /**
   * When new app launched, switch to it.
   *
   * @param {string} |url| the manifest URL.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._switchTo =
    (function su_switchTo(url) {
      this.currentAppURL = url;
    }).bind(ShrinkingUI);

  /**
   * Setup the app window but not do any visual effects on it.
   * This method exists because sometime we may need to use different
   * effects on the window.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI._setup =
    (function su_setup() {
      var currentWindow = this.apps[this.currentAppURL];
      this.current.appFrame = currentWindow.frame;
      this.current.wrapper = this.current.appFrame.parentNode;
    }).bind(ShrinkingUI);

  /**
   * Start tilting the app window.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI.start =
    (function su_start() {

      // Already shrunk.
      if (this._state())
        return;

      var afterTilt = (function() {
        // After it tilted done, turn it to the screenshot mode.
        var currentWindow = this.apps[this.currentAppURL];
        currentWindow.setVisible(false, true);
        this._setState(true);
      }).bind(this);

      this._setTip();
      this._shrinkingTilt(afterTilt);
    }).bind(ShrinkingUI);

  /**
   * Set the tip on the window.
   *
   * @this {ShrinkingTilt}
   */
  ShrinkingUI._setTip =
    (function su_setTip() {
      var tip = this._slidingTip();
      if (!this.current.tip) {
        this.current.tip = tip;
        this.current.wrapper.appendChild(tip);
      }
      this.current.tip.classList.remove('hide');
    }).bind(ShrinkingUI);

  /**
   * Stop the shrinking effect and tilt it back.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI.stop =
    (function su_start() {
      if (! this._state())
        return;
      var afterTiltBack = (function() {
        // Turn off the screenshot mode.
        var currentWindow = this.apps[this.currentAppURL];
        currentWindow.setVisible(true);
        this._cleanEffects();
      }).bind(this);
      this.current.tip.remove();
      this.current.tip = null;
      this._shrinkingTiltBack(true, afterTiltBack);
    }).bind(ShrinkingUI);

  /**
   * Sending has been rejected. It would fly back.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI._rejected = (function su_rejected() {
    this._sendingSlideTo('BOTTOM' , (function() {
      this._enableSlidingCover();
      this._setTip();
    }).bind(this));
  }).bind(ShrinkingUI);

  /**
   * Private gettter: prevent DOM manipulation goes everywhere.
   * Outside caller should observe the attribute as the setter mentioned.
   *
   * @return {boolean} The frame is shrinked or not.
   * @see _setState
   * @this {ShrinkingUI}
   */
  ShrinkingUI._state =
    (function su_state() {
      if (!this.current.appFrame) // Has been setup or not.
        return false;
      return 'true' === this.current.appFrame.dataset.shrinkingState;
     }).bind(ShrinkingUI);

  /**
   * Avoid to manipulate strings and DOM attributes everywhere.
   * Users should observe the 'data-shrinking-state' to see if now the
   * app window is tilted ('true') or not ('false').
   *
   * @param {boolean} |state| Ccurrently the UI is on or off.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._setState =
    (function su_shrinking(state) {

      // TODO: Call AppWindow.setState and AppWindow.getState instead of
      // setting/getting the attribute directly in shrinking UI.
      this.current.appFrame.setAttribute('data-shrinking-state',
        state.toString());
    }).bind(ShrinkingUI);

  /**
   * Receiving: make the app itself fly in from the top.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI._receivingEffects =
    (function su_receivingEffects() {

      // Hide it before we move it.
      // Visibility won't work.
      this.current.appFrame.style.opacity = '0';

      var afterTop = (function() {
        // Restore the display to let it fly in.
        this.current.appFrame.style.opacity = '';
        this.current.appFrame.style.transition = 'transform 0.5s ease';

        // 2. Slide to the BOTTOM.
        // 3. Tilt back and display it as normal apps.
        this._sendingSlideTo('BOTTOM',
          (function doTiltBack() {
            this._shrinkingTiltBack(false, this._cleanEffects);
          }).bind(this)
        );
      }).bind(this);

      var afterTilt = (function() {
        // Make it fly to top immediately (can't set to zero or the
        // callback won't work).
        this.current.appFrame.style.transition = 'transform 0.05s ease';
        this._sendingSlideTo('TOP', afterTop);
      }).bind(this);

      // 1. Make it on top and tilted.
      this._shrinkingTilt(afterTilt);
    }).bind(ShrinkingUI);

  /**
   * Slide the frame to the specific position.
   *
   * @param {number} |y| The Y coordinate the frame should slide to.
   * @param {function()} |callback| (Optional) execute after the frame moved
   *                                to the position.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._sendingSlideTo =
    (function su_sendingSlideTo(y, callback) {
      if ('TOP' === y) {
        y = this.current.appFrame.parentElement.clientHeight;
      } else if ('BOTTOM' === y) {
        y = 0;
      }
      if (y < 0)
        y = 0;

      var cbDone = (function on_cbDone(evt) {
        this.current.appFrame.removeEventListener('transitionend', cbDone);
        if ('undefined' !== typeof callback) {
          callback();
        }
      }).bind(this);
      this.current.appFrame.addEventListener('transitionend', cbDone);
      this.current.appFrame.style.transform = 'rotateX(0.8deg) ' +
                                             'translateY(-' + y + 'px)';
    }).bind(ShrinkingUI);

  /**
   * Create a new sliding cover and bind all necessary event handlers.
   *
   * @return {DOMElement}
   * @this {ShrinkingUI}
   */
  ShrinkingUI._slidingCover =
    (function slidingCover() {
      var cover = document.createElement('div');
      cover.id = 'shrinking-cover';
      cover.style.width = '100%';
      cover.style.height = '100%';
      cover.style.position = 'relative';
      cover.style.zIndex = '2';
      cover.addEventListener('touchstart', this._handleSendingStart);
      cover.addEventListener('touchmove', this._handleSendingSlide);
      cover.addEventListener('touchend', this._handleSendingOut);
      return cover;
    }).bind(ShrinkingUI);

  /**
   * Create a tip.
   *
   * @return {DOMElement}
   * @this {ShrinkingUI}
   */
  ShrinkingUI._slidingTip =
    (function slidingTip() {
      var tip = document.createElement('div');
      var tipArrow = document.createElement('div');
      tip.id = 'shrinking-tip';
      tipArrow.id = 'shrinking-tip-arrow';
      tipArrow.textContent = '\u00A0';
      tip.textContent = navigator.mozL10n.get('shrinking-tip');
      tip.appendChild(tipArrow);
      return tip;
    }).bind(ShrinkingUI);

  /**
   * Will return the disabled element to let caller manupulate it.
   *
   * @return {DOMElement}
   * @this {ShrinkingUI}
   */
  ShrinkingUI._enableSlidingCover =
    (function su_enableSlidingCover() {
      this.current.cover.addEventListener('touchstart',
        this._handleSendingStart);
      this.current.cover.addEventListener('touchmove',
        this._handleSendingSlide);
      this.current.cover.addEventListener('touchend',
        this._handleSendingOut);
      return this.current.cover;
    }).bind(ShrinkingUI);

  /**
   * Will return the disabled element to let caller manupulate it.
   *
   * @return {DOMElement}
   * @this {ShrinkingUI}
   */
  ShrinkingUI._disableSlidingCover =
    (function su_disableSlidingCover() {
      this.current.cover.removeEventListener('touchstart',
        this._handleSendingStart);
      this.current.cover.removeEventListener('touchmove',
        this._handleSendingSlide);
      this.current.cover.removeEventListener('touchend',
        this._handleSendingOut);
      return this.current.cover;
    }).bind(ShrinkingUI);

  /**
   * Make the app frame tilted and overlay it with a cover.
   *
   * @param {function()} |cb| (Optional) if there're are any movement
   *                          should be performed after tilting back.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._shrinkingTilt =
    (function su_shrinkingTilt(cb) {
      // If start then do some effect would tilt the window again,
      // would generate two cover which should be unique.
      if (null === this.current.cover) {

        // TODO: Call AppWindow.inject(DOM) instead of changing the DOM
        // directly in Shrinking UI.
        this.current.cover = this._slidingCover();
        var anchor = this.current.appFrame.firstElementChild;
        this.current.appFrame.insertBefore(this.current.cover,
          anchor);
      }
      this.current.wrapper.style.perspective = '1rem';
      this.current.wrapper.style.backgroundImage =
        'url("/style/shrinking_ui/images/background.png")';
      this.current.appFrame.style.transition = 'transform 0.5s ease';

      // Add a little bouncing back animation.
      // Nested callbacks: first animation is for sinking down,
      // and the second one is for bouncing back.
      var bounceBack = (function on_bounceBack(evt) {
        this.current.appFrame.removeEventListener('transitionend', bounceBack);
        this.current.appFrame.addEventListener('transitionend', bounceBackEnd);
        this.current.appFrame.style.transition = 'transform 0.3s ease';
        this.current.appFrame.style.transform = 'rotateX(0.8deg)';
      }).bind(this);

      var bounceBackEnd = (function on_bounceBackEnd(evt) {
        this.current.appFrame.removeEventListener('transitionend',
          bounceBackEnd);
        this.current.appFrame.style.transition = 'transform 0.5s ease';
        if (cb)
          cb();
      }).bind(this);

      this.current.appFrame.addEventListener('transitionend', bounceBack);

      // After set up, trigger the transition.
      this.current.appFrame.style.transformOrigin = '50% 100% 0';
      this.current.appFrame.style.transform = 'rotateX(1.0deg)';
    }).bind(ShrinkingUI);

  /**
   * Restore the app frame. It depends on another stateful method
   * because we must update some states after restoring the frame.
   *
   * Note this function would not clean the effects, because the
   * window may need to be tilted again.
   *
   * @param {boolean} |instant| If true, tilt it back instantly
   * @param {function()} |cb| (Optional) Callback when the tilt was done.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._shrinkingTiltBack =
    (function su_shrinkingTiltBack(instant, cb) {
      // Setup the rotating animation.
      if (!instant) {
        var tsEnd = (function _tsEnd(evt) {
            this.current.appFrame.removeEventListener('transitionend', tsEnd);
            if (cb)
              cb();
        }).bind(this);
        this.current.appFrame.style.transition = 'transform 0.3s ease';
        this.current.appFrame.addEventListener('transitionend', tsEnd);
        this.current.appFrame.style.transform = 'rotateX(0.0deg)';
      } else {
        this.current.appFrame.style.transition = '';
        this.current.appFrame.style.transform = 'rotateX(0.0deg)';
        if (cb)
          cb();
      }
    }).bind(ShrinkingUI);

  /**
   * User start to tap on the tilted frame.
   *
   * @param {event} |evt|
   * @this {ShrinkingUI}
   */
  ShrinkingUI._handleSendingStart =
    (function su_handleSendingStart(evt) {
      // Stop the touch event to affect the inner elements.
      evt.stopImmediatePropagation();

      // Remove the tip above the window.
      var tsEnd = (function _tsEnd() {
        this.current.tip.removeEventListener('transitionend', tsEnd);
      }).bind(this);
      this.current.tip.classList.add('hide');
      this.current.tip.addEventListener('transitionend', tsEnd);

      return false;
    }).bind(ShrinkingUI);

  /**
   * Sending is in progress.
   *
   * @param {event} |evt| The 'touchstart' event.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._handleSendingSlide =
    (function su_handleSendingSlide(evt) {

      var pgy = evt.touches[0].pageY;
      var slideY = this.current.appFrame.parentElement.clientHeight - pgy;
      if ('undefined' === typeof this.state.touch.initY) {
        this.state.touch.initY = slideY;
      }
      if ('undefined' === typeof this.state.touch.prevY) {
        this.state.touch.prevY = slideY;
      }
      // User is dragging it back or not.
      this.state.toward = (this.state.touch.prevY < slideY) ? 'TOP' : 'BOTTOM';

      // Don't set new sliding callback if we're suspended.
      if (this.state.suspended)
        return;

      var handleDelaySliding = (function su_handleDelaySliding() {
          this._sendingSlideTo(slideY);
          this.state.suspended = false;
      }).bind(this);

      this.state.delaySlidingID = setTimeout(handleDelaySliding,
        this.SUSPEND_INTERVAL);
      this.state.suspended = true;

      this._sendingSlideTo(slideY);
      this.state.touch.prevY = slideY;
      this.state.overThreshold = (slideY > this.THRESHOLD) ? true : false;
    }).bind(ShrinkingUI);

  /**
   * Sending was finished (user released the finger).
   * Would trigger 'shrinking-sent' event if user sent it out.
   *
   * @param {event} |evt| The 'touchmove' event.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._handleSendingOut =
    (function su_handleSendingOut(evt) {
      // Clear the last sliding timeout callback to force
      // it slide to TOP or BOTTOM.
      clearTimeout(this.state.delaySlidingID);

      if (this.state.overThreshold && 'TOP' === this.state.toward) {
        var cover = this.cover;
        this._sendingSlideTo('TOP' , (function() {
          // When it got sent, freeze it at the top.
          this._disableSlidingCover();
          window.dispatchEvent(new CustomEvent('shrinking-sent'));
        }).bind(this));
      } else {
        // Fallback to the bottom if user cancel it.
        this._sendingSlideTo('BOTTOM',
          (function resumeSending() {
            // Resume the sending timeout state.
            this.state.suspended = false;
            this._setTip();
          }).bind(this)
        );
      }
    }).bind(ShrinkingUI);

  /**
   * Must clear and restore the app frame after transition end
   * to make it come back with animation.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI._cleanEffects =
    (function su_cleanEffects() {
      this.current.appFrame.style.transition = '';
      this.current.appFrame.style.transform = '';
      this.current.appFrame.style.transformOrigin = '50% 50% 0';
      this._setState(false);

      // After trasitionend, clean this handler.
      this.current.appFrame.removeEventListener('transitionend',
        this._cleanEffects);
      this.current.wrapper.style.backgroundImage = '';
      this.current.wrapper.style.perspective = '';
      this._disableSlidingCover().remove();

      this.current.wrapper = null;
      this.current.appFrame = null;
      this.current.cover = null;
    }).bind(ShrinkingUI);

  exports.ShrinkingUI = ShrinkingUI;
  ShrinkingUI.initialize();
})(window);
