/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/**
 * Shrinking UI: would make app window tilted and ready to be tapped, dragged
 * and sent out and received in.
 */
(function(exports) {
  'use strict';
  var ShrinkingUI = {
    THRESHOLD: 50,
    SUSPEND_INTERVAL: 100,
    apps: {},
    current: {
      appURL: '', // ManifestURL
      wrapper: null,
      iframe: null
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
      window.addEventListener('launchapp', this);
      window.addEventListener('launchwrapper', this);

      // TODO: event name and details.
      window.addEventListener('nfc-p2pinit', this);
      window.addEventListener('nfc-p2pfin', this);
    }).bind(ShrinkingUI);

  /**
   * The event dispatcher.
   *
   * @param {event} |evt|
   * @this {ShrinkingUI}
   */
  ShrinkingUI.handleEvent =
    (function su_handleEvent(evt) {
      switch (evt.type) {
        case 'appcreated':
          var app = evt.detail;
          this._register(app);
          this.apps[evt.detail.manifestURL] = app;
          break;
        case 'appterminated':
          this._unregister(evt.detail.manifestURL);
          break;
      case 'launchapp':
      case 'launchwrapper':
        var config = evt.detail;
        if (!config.stayBackground) {
          this._switchTo(config.manifestURL);
        }
        break;
      case 'nfc-p2pinit':
        this.shrinkingStart();
        break;
      case 'nfc-p2pfin':
        this.shrinkingStop();
        break;
      }
    }).bind(ShrinkingUI);

  /**
   * Register an app.
   *
   * @param {AppWindow} |app|
   * @param {string} |url| the manifest URL.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._register =
    (function su_register(app, url) {
      this.apps[url] = app;
    }).bind(ShrinkingUI);

  /**
   * Unregister an app.
   *
   * @param {string} |url| the manifest URL.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._unregister =
    (function su_unregister(url) {
      delete this.apps[url];
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
   * One of the only two exposed methods of these shrinking effects.
   * The outside users should only know the starting, stopping and
   * detecting method.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI.shrinkingStart =
    (function su_shrinkingStart() {
      var currentWindow = this.apps[this.currentAppURL];
      this.current.iframe = currentWindow.iframe;
      this.current.wrapper = currentWindow.iframe.parentElement;

      // Already shrunk.
      if (this._shrinkingState())
        return;
      this._shrinkingTilt();
      this._setShrinkingState(true);
    }).bind(ShrinkingUI);

  /**
   * Stop the shrinking effect and tilt it back.
   *
   * @param {boolean} |instant| If true, tilt it back instantly.
   * @this {ShrinkingUI}
   */
  ShrinkingUI.shrinkingStop =
    (function su_shrinkingStart(instant) {
      if (! this._shrinkingState())
        return;
      this._shrinkingTiltBack(instant);
    }).bind(ShrinkingUI);

  /**
   * Private gettter: prevent DOM manipulation goes everywhere.
   * Outside caller should observe the attribute as the setter mentioned.
   *
   * @return {boolean} The frame is shrinked or not.
   * @see _setShrinkingState
   * @this {ShrinkingUI}
   */
  ShrinkingUI._shrinkingState =
    (function su_shrinkingState() {
      return 'true' === this.current.wrapper.dataset.shrinkingState;
     }).bind(ShrinkingUI);

  /**
   * Avoid to manipulate strings and DOM attributes everywhere.
   * Users should observe the 'data-shrinking-state' to see if now the
   * app window is tilted ('true') or not ('false').
   *
   * @param {boolean} |state| Ccurrently the UI is on or off.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._setShrinkingState =
    (function su_shrinking(state) {
      this.current.wrapper.setAttribute('data-shrinking-state',
        state.toString());
    }).bind(ShrinkingUI);

  /**
   * Receiving: make the app itself fly in from the top.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI._shrinkingReceivingEffects =
    (function su_shrinkingReceivingEffects() {

      // Hide it before we move it.
      var originalDisplay = this.current.iframe.style.display;
      this.current.iframe.style.display = 'none';

      // 1. Make it on top and tilted.
      this._shrinkingTilt();
      this._shrinkingSendingSlideTo('TOP');
      this.current.iframe.style.display = originalDisplay;
      this.current.iframe.style.transition = 'transform 0.5s ease';

      // 2. Slide to the BOTTOM.
      // 3. Tilt back and display it as normal apps.
      this._shrinkingSendingSlideTo('BOTTOM',
        (function doTiltBack() {
          this._shrinkingTiltBack();
        }).bind(this)
      );
    }).bind(ShrinkingUI);

  /**
   * Slide the frame to the specific position.
   *
   * @param {number} |y| The Y coordinate the frame should slide to.
   * @param {function()} |callback| (Optional) execute after the frame moved
   *                                to the position.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._shrinkingSendingSlideTo =
    (function su_shrinkingSendingSlideTo(y, callback) {
      if ('TOP' === y) {
        y = this.current.iframe.parentElement.clientHeight;
      } else if ('BOTTOM' == y) {
        y = 0;
      }
      if (y < 0)
        y = 0;

      var cbDone = (function on_cbDone(evt) {
        this.current.iframe.removeEventListener('transitionend', cbDone);
        if ('undefined' !== typeof callback)
          callback();
      }).bind(this);
      this.current.iframe.addEventListener('transitionend', cbDone);
      this.current.iframe.style.transform = 'rotateX(0.8deg) ' +
                                             'translateY(-' + y + 'px)';
    }).bind(ShrinkingUI);

  /**
   * Create a new sliding cover and bind all necessary event handlers.
   *
   * @return {DOMElement}
   * @this {ShrinkingUI}
   */
  ShrinkingUI._shrinkingSlidingCover =
    (function shrinkingSlidingCover() {
      var cover = document.createElement('div');
      cover.id = 'shrinking-cover';
      cover.style.width = '100%';
      cover.style.height = '100%';
      cover.style.position = 'relative';
      cover.style.zIndex = '2';
      cover.addEventListener('touchstart', this._handleShrinkingSendingStart);
      cover.addEventListener('touchmove', this._handleShrinkingSendingSlide);
      cover.addEventListener('touchend', this._handleShrinkingSendingOut);
      return cover;
    }).bind(ShrinkingUI);

  /**
   * Create a new sliding cover and bind all necessary event handlers.
   * Will return the disabled element to let caller manupulate it.
   *
   * @param {DOMElement} |cover| The cover element would be disalbed.
   * @return {DOMElement}
   * @this {ShrinkingUI}
   */
  ShrinkingUI._shrinkingDisableSlidingCover =
    (function su_shrinkingDisableSlidingCover(cover) {
      cover.removeEventListener('touchstart',
        this._handleShrinkingSendingStart);
      cover.removeEventListener('touchmove',
        this._handleShrinkingSendingSlide);
      cover.removeEventListener('touchend',
        this._handleShrinkingSendingOut);
      return cover;
    }).bind(ShrinkingUI);

  /**
   * Make the app frame tilted and overlay it with a cover.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI._shrinkingTilt =
    (function su_shrinkingTilt() {
      this.current.wrapper.style.perspective = '1rem';
      this.current.wrapper.style.backgroundColor = 'dimgray';
      this.current.wrapper.insertBefore(this._shrinkingSlidingCover(),
        this.current.wrapper.querySelector('iframe'));
      this.current.iframe.style.transition = 'transform 0.5s ease';


      // Add a little bouncing back animation.
      // Nested callbacks: first animation is for sinking down,
      // and the second one is for bouncing back.
      var bounceBack = (function on_bounceBack(evt) {
        this.current.iframe.removeEventListener('transitionend', bounceBack);
        this.current.iframe.addEventListener('transitionend', bounceBackEnd);
        this.current.iframe.style.transition = 'transform 0.3s ease';
        this.current.iframe.style.transform = 'rotateX(0.8deg)';
      }).bind(this);

      var bounceBackEnd = (function on_bounceBackEnd(evt) {
        this.current.iframe.removeEventListener('transitionend',
          bounceBackEnd);
        this.current.iframe.style.transition = 'transform 0.5s ease';
      }).bind(this);

      this.current.iframe.addEventListener('transitionend', bounceBack);

      // After set up, trigger the transition.
      this.current.iframe.style.transformOrigin = '50% 100% 0';
      this.current.iframe.style.transform = 'rotateX(1.0deg)';
    }).bind(ShrinkingUI);

  /**
   * Restore the app frame. It depends on another stateful method
   * because we must update some states after restoring the frame.
   *
   * @param {boolean} |instant| If true, tilt it back instantly.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._shrinkingTiltBack =
    (function su_shrinkingTiltBack(instant) {
        // Setup the rotating animation.
        if (!instant) {
          this.current.iframe.style.transition = 'transform 0.3s ease';
          this.current.iframe.addEventListener('transitionend',
            this._handleShrinkingCleanEffects);
          this.current.iframe.style.transform = 'rotateX(0.0deg)';
        } else {
          this.current.iframe.style.transform = 'rotateX(0.0deg)';
          this._handleShrinkingCleanEffects();
        }
    }).bind(ShrinkingUI);

  // TODO: How to check the sending is successful or not?
  // This function is only for demo. In the real case we may not check
  // the result by function call, but a asychronous callback or message.
  ShrinkingUI._shrinkingSendingCheck =
    (function su_shrinkingSendingCheck(cover) {
      // DEBUG
      // Now use the dummy false condition.
      var DUMMY_CHECK = true;
      if (false === DUMMY_CHECK) {
        this._shrinkingSendingSlideTo('BOTTOM');

        // Don't remove the cover to allow user try it again.
      } else {
        // If success, do nothing on visual effects.
        // TODO: But it need to share the object by the app.

        this._shrinkingDisableSlidingCover(cover).remove();
        this._shrinkingReceivingEffects();
      }
    }).bind(ShrinkingUI);

  /**
   * User start to tap on the tilted frame.
   *
   * @param {event} |evt|
   */
  ShrinkingUI._handleShrinkingSendingStart =
    function su_handleShrinkingSendingStart(evt) {
      // Stop the touch event to affect the inner elements.
      evt.stopImmediatePropagation();
      return false;
    };

  /**
   * Sending is in progress.
   *
   * @param {event} |evt| The 'touchstart' event.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._handleShrinkingSendingSlide =
    (function su_handleShrinkingSendingSlide(evt) {

      var pgy = evt.touches[0].pageY;
      var slideY = this.current.iframe.parentElement.clientHeight - pgy;
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
          this._shrinkingSendingSlideTo(slideY);
          this.state.suspended = false;
      }).bind(this);

      this.state.delaySlidingID = setTimeout(handleDelaySliding,
        this.SUSPEND_INTERVAL);
      this.state.suspended = true;

      this._shrinkingSendingSlideTo(slideY);
      this.state.touch.prevY = slideY;
      this.state.overThreshold = (slideY > this.THRESHOLD) ? true : false;
    }).bind(ShrinkingUI);

  /**
   * Sending was finished.
   *
   * @param {event} |evt| The 'touchmove' event.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._handleShrinkingSendingOut =
    (function su_handleShrinkingSendingOut(evt) {
      // Clear the last sliding timeout callback to force
      // it slide to TOP or BOTTOM.
      clearTimeout(this.state.delaySlidingID);

      if (this.state.overThreshold && 'TOP' === this.state.toward) {
        var cover = this.current.wrapper.querySelector('#shrinking-cover');
        this._shrinkingSendingSlideTo('TOP',
          (function doCheck() {
            this._shrinkingSendingCheck(cover);
          }).bind(this)
        );
      } else {
        // Fallback to the bottom if user cancel it.
        this._shrinkingSendingSlideTo('BOTTOM',
          (function resumeSending() {
            // Resume the sending timeout state.
            this.state.suspended = false;
          }).bind(this)
        );
      }
    }).bind(ShrinkingUI);

  /**
   * Must clear and restore the app frame after transition end
   * to make it come back with animation.
   *
   * @param {event} |evt| The 'touchend' event.
   * @this {ShrinkingUI}
   */
  ShrinkingUI._handleShrinkingCleanEffects =
    (function su_handleShrinkingCleanEffects(evt) {
      this.current.iframe.style.transition = '';
      this.current.iframe.style.transform = '';
      this.current.iframe.style.transformOrigin = '50% 50% 0';
      this._setShrinkingState(false);

      // After trasitionend, clean this handler.
      this.current.iframe.removeEventListener('transitionend',
        this._handleShrinkingCleanEffects);
      this.current.wrapper.style.backgroundColor = '';
      this.current.wrapper.style.perspective = '';
      var cover = this.current.wrapper.querySelector('#shrinking-cover');
      this._shrinkingDisableSlidingCover(cover).remove();
    }).bind(ShrinkingUI);

  exports.ShrinkingUI = ShrinkingUI;
  ShrinkingUI.initialize();
})(window);
