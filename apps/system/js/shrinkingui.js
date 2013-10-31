/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/**
 * Shrinking UI: would make app window tilted and ready to be tapped, dragged
 * and sent out and received in. It would be mixed in the app window and
 * provide the later the ability to initialize the visual effects.
 */
(function(window) {
  'use strict';
  var ShrinkingUI = {
    THRESHOLD: 50,
    SUSPEND_INTERVAL: 100,
    overThreshold: false,
    toward: 'TOP',
    suspended: false,
    delaySlidingID: null,
    coverElement: null,
    wrapper: null,
    iframe: null,
    tilted: false,
    touchState: {
      initY: -1,
      prevY: -1
    }
  };

  /**
   * One of the only two exposed methods of these shrinking effects.
   * The outside users should only know the starting, stopping and
   * detecting method.
   *
   * @param {DOMElement} |appFrame| The iframe of the application.
   * @this {ShrinkingUI}
   */
  ShrinkingUI.shrinkingStart =
    (function su_shrinkingStart(wrapper) {
      this.wrapper = wrapper;
      if (this._shrinkingState())
        return;
      this.iframe = wrapper.querySelector('iframe');
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
      return 'true' === this.wrapper.dataset.shrinkingState;
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
      this.wrapper.setAttribute('data-shrinking-state', state.toString());
    }).bind(ShrinkingUI);

  /**
   * Receiving: make the app itself fly in from the top.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI._shrinkingReceivingEffects =
    (function su_shrinkingReceivingEffects() {

      // Hide it before we move it.
      var originalDisplay = this.iframe.style.display;
      this.iframe.style.display = 'none';

      // 1. Make it on top and tilted.
      this._shrinkingTilt();
      this._shrinkingSendingSlideTo('TOP');
      this.iframe.style.display = originalDisplay;
      this.iframe.style.transition = 'transform 0.5s ease';

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
        y = this.iframe.parentElement.clientHeight;
      } else if ('BOTTOM' == y) {
        y = 0;
      }
      if (y < 0)
        y = 0;

      var cbDone = (function on_cbDone(evt) {
        this.iframe.removeEventListener('transitionend', cbDone);
        if ('undefined' !== typeof callback)
          callback();
      }).bind(this);
      this.iframe.addEventListener('transitionend', cbDone);
      this.iframe.style.transform = 'rotateX(0.8deg) ' +
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
      this.wrapper.style.perspective = '1rem';
      this.wrapper.style.backgroundColor = 'dimgray';
      this.wrapper.insertBefore(this._shrinkingSlidingCover(),
        this.wrapper.querySelector('iframe'));
      this.iframe.style.transition = 'transform 0.5s ease';


      // Add a little bouncing back animation.
      // Nested callbacks: first animation is for sinking down,
      // and the second one is for bouncing back.
      var bounceBack = (function on_bounceBack(evt) {
        this.iframe.removeEventListener('transitionend', bounceBack);
        this.iframe.addEventListener('transitionend', bounceBackEnd);
        this.iframe.style.transition = 'transform 0.3s ease';
        this.iframe.style.transform = 'rotateX(0.8deg)';
      }).bind(this);

      var bounceBackEnd = (function on_bounceBackEnd(evt) {
        this.iframe.removeEventListener('transitionend',
          bounceBackEnd);
        this.iframe.style.transition = 'transform 0.5s ease';
      }).bind(this);

      this.iframe.addEventListener('transitionend', bounceBack);

      // After set up, trigger the transition.
      this.iframe.style.transformOrigin = '50% 100% 0';
      this.iframe.style.transform = 'rotateX(1.0deg)';
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
          this.iframe.style.transition = 'transform 0.3s ease';
          this.iframe.addEventListener('transitionend',
            this._handleShrinkingCleanEffects);
          this.iframe.style.transform = 'rotateX(0.0deg)';
        } else {
          this.iframe.style.transform = 'rotateX(0.0deg)';
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

        // DEBUG
        //NFCDisableSlidingCover(this.cover).remove();
        //NFCTiltBack(this.iframe);

        // DEBUG: beacuse current the receiving effects would
        // not remove the cover element.
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
      var slideY = this.iframe.parentElement.clientHeight - pgy;
      if ('undefined' === typeof this.touchState.initY) {
        this.touchState.initY = slideY;
      }
      if ('undefined' === typeof this.touchState.prevY) {
        this.touchState.prevY = slideY;
      }
      // User is dragging it back or not.
      this.toward = (this.touchState.prevY < slideY) ? 'TOP' : 'BOTTOM';

      // Don't set new sliding callback if we're suspended.
      if (this.suspended)
        return;

      var handleDelaySliding = (function su_handleDelaySliding() {
          this._shrinkingSendingSlideTo(slideY);
          this.suspended = false;
      }).bind(this);

      this.delaySlidingID = setTimeout(handleDelaySliding,
        this.SUSPEND_INTERVAL);
      this.suspended = true;

      this._shrinkingSendingSlideTo(slideY);
      this.touchState.prevY = slideY;
      this.overThreshold = (slideY > this.THRESHOLD) ? true : false;
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
      clearTimeout(this.delaySlidingID);

      if (this.overThreshold && 'TOP' === this.toward) {
        var cover = this.wrapper.querySelector('#shrinking-cover');
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
            this.suspended = false;
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
      this.iframe.style.transition = '';
      this.iframe.style.transform = '';
      this.iframe.style.transformOrigin = '50% 50% 0';
      this._setShrinkingState(false);

      // After trasitionend, clean this handler.
      this.iframe.removeEventListener('transitionend',
        this._handleShrinkingCleanEffects);
      this.wrapper.style.backgroundColor = '';
      this.wrapper.style.perspective = '';
      var cover = this.wrapper.querySelector('#shrinking-cover');
      this._shrinkingDisableSlidingCover(cover).remove();
    }).bind(ShrinkingUI);

  if (AppWindow.ENABLE_SHRINKING)
    AppWindow.addMixin(ShrinkingUI);

})();
