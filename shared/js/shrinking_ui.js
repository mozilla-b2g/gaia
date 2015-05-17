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

/* globals dump, Promise */
(function(exports) {
  var ShrinkingUI = function(foregroundElement, backgroundElement) {
    this.elements.foregroundElement = foregroundElement;
    this.elements.backgroundElement = backgroundElement;
  };

  ShrinkingUI.prototype = {
    DEBUG: false,
    THRESHOLD: 50,
    SUSPEND_INTERVAL: 100,
    state: {
      shrinking: false,
      ending: false,
      tilting: false,
      overThreshold: false,
      toward: 'TOP',
      touch: {
        initY: -1,
        prevY: -1
      },
      slideTransitionCb: null, // Last slide transition
      tiltTransitionCb: null // Last tilt transition
    },
    elements: {},
    configs: {
      degreeLandscape: '2.7deg',
      degreePortrait: '0.65deg',
      overDegreeLandscape: '2.9deg',
      overDegreePortrait: '0.9deg'
    },

    tip: null,
    cover: null
  };

  ShrinkingUI.prototype.debug = function su_debug(msg, optObject) {
    if (this.DEBUG) {
      var output = '[DEBUG] ShrinkingUI: ' + msg;
      if (optObject) {
        output += JSON.stringify(optObject);
      }
      dump(output);
    }
  };

  /**
   * Bind events and do some necessary initialization.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype.start = function su_start() {
    window.addEventListener('shrinking-receiving', this);
    this.startTilt();
  };

  /**
   * Unbind events and do some necessary initialization.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype.stop = function su_stop() {
    if (this.isActive()) {
      this.stopTilt();
    }
    window.removeEventListener('shrinking-receiving', this);
  };

  /**
   * The event dispatcher.
   *
   * @param {event} |evt|
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype.handleEvent = function su_handleEvent(evt) {
      switch (evt.type) {
        case 'shrinking-receiving':
          // It should be launched, then received.
          // So we'll get a new app.
          this._receivingEffects();
          break;
        case 'touchstart':
          this._handleSendingStart(evt);
          break;
        case 'touchmove':
          this._handleSendingSlide(evt);
          break;
        case 'touchend':
          this._handleSendingOut(evt);
          break;
      }
    };

  ShrinkingUI.prototype.respondToHierarchyEvent =
    function su_respondToHierarchyEvent(evt) {
      if (this['_handle_' + evt.type]) {
        return this['_handle_' + evt.type](evt);
      }
      return true;
    };

  ShrinkingUI.prototype._handle_holdhome = function su__handle_holdhome(evt) {
    return this.isActive();
  };

  ShrinkingUI.prototype._handle_home = function su__handle_home(evt) {
    return this.isActive();
  };
  /**
   * Start tilting the app window.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype.startTilt = function su_startTilt() {
    // Already shrunk.
    if (this.isActive()) {
      return;
    }

    if (!this.elements.backgroundElement || !this.elements.foregroundElement) {
      return;
    }
    this.state.shrinking = true;
    this.state.tilting = true;
    var afterTilt = () => {
      // After it tilted done, turn it to the screenshot mode.
      this.elements.foregroundElement.classList.add('hidden');
      this.state.tilting = false;
    };

    this._setTip();
    this._setState(true);
    // disable rotation to prevent display UI with wrong image
    screen.mozLockOrientation(screen.mozOrientation);
    this._shrinkingTilt(afterTilt);
  };

  /**
   * Set the tip on the window.
   *
   * @this {ShrinkingTilt}
   */
  ShrinkingUI.prototype._setTip = function su_setTip() {
    var backgroundElement = this.elements.backgroundElement;
    if (!this.tip) {
      this.tip = this._slidingTip();
      backgroundElement.appendChild(this.tip);
    }
    this.tip.classList.remove('hide');
  };

  /**
   * Stop the shrinking effect and tilt it back.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype.stopTilt = function su_stopTilt() {
    if (!this.state.shrinking || this.state.ending) {
      return;
    }
    // When shrinking get forcibly stopped, restore the flag.
    if (this.state.tilting) {
      this.state.tilting = false;
    }

    this.state.shrinking = false;
    this.state.ending = true;
    var afterTiltBack = (() => {
      // Turn off the screenshot mode.
      this.elements.foregroundElement.classList.remove('hidden');
      this._cleanEffects().then(() => {
        this.state.ending = false;
      });
    });
    this.tip.remove();
    this.tip = null;
    this._shrinkingTiltBack(true, afterTiltBack);
  };

  /**
   * Indicate shrinking UI is active.
   *
   * @return {boolean} The frame is shrinked or not.
   * @see _setState
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype.isActive = function su_isActive() {
    if (this.state.shrinking || this.state.tilting || this.state.ending) {
      return true;
    }
    return false;
  };

  /**
   * Avoid to manipulate strings and DOM attributes everywhere.
   * Users should observe the 'data-shrinking-state' to see if now the
   * app window is tilted ('true') or not ('false').
   *
   * @param {boolean} |state| Ccurrently the UI is on or off.
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype._setState = function su_shrinking(state) {
    // TODO: Call AppWindow.setState and AppWindow.getState instead of
    // setting/getting the attribute directly in shrinking UI.
    var foregroundElement = this.elements.foregroundElement;
    foregroundElement.setAttribute('data-shrinking-state',
      state.toString());
    this.debug('Setting shrink state to: ' + state);
  };

  /**
   * Update the current 'transitionend' callback for the slide animation.
   * @param {cb} transitioned callback
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype._updateSlideTransition =
    function su_updateSlideTransition(cb) {
      if (this.tip && this.state.slideTransitionCb) {
        this.elements.foregroundElement.style.transitionDuration = '0s';
        this.tip.removeEventListener('transitionend',
          this.state.slideTransitionCb);
      }
      this.state.slideTransitionCb = cb;
    };

  /**
   * Update the current 'transitionend' callback for the tilt animation.
   * @param {cb} transitioned callback
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype._updateTiltTransition =
    function su_updateTiltTransition(cb) {
      var foregroundElement = this.elements.foregroundElement;
      if (foregroundElement && this.state.tiltTransitionCb) {
        foregroundElement.removeEventListener('transitionend',
          this.state.tiltTransitionCb);
      }
      this.state.tiltTransitionCb = cb;
    };

  /**
   * Receiving: make the app itself fly in from the top.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype._receivingEffects = function su_receivingEffects() {
    // Hide it before we move it.
    // Visibility won't work.
    var foregroundElement = this.elements.foregroundElement;
    foregroundElement.style.opacity = '0';

    var afterTop = (function() {
      // Restore the display to let it fly in.
      foregroundElement.style.opacity = '';
      foregroundElement.style.transition = 'transform 0.5s ease';

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
      foregroundElement.style.transition = 'transform 0.05s ease';
      this._sendingSlideTo('TOP', afterTop);
    }).bind(this);

    // 1. Make it on top and tilted.
    this._shrinkingTilt(afterTilt);
  };

  /**
   * Slide the frame to the specific position.
   *
   * @param {number} |y| The Y coordinate the frame should slide to.
   * @param {function()} |callback| (Optional) execute after the frame moved
   *                                to the position.
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype._sendingSlideTo =
    function su_sendingSlideTo(y, callback) {
      var foregroundElement = this.elements.foregroundElement;
      var cbDone = (function on_cbDone(evt) {
        foregroundElement.removeEventListener('transitionend', cbDone);
        // Clear animation, so the shrinkingUI will follow the touchmove event.
        this.elements.foregroundElement.style.transitionDuration = '0s';
        if ('undefined' !== typeof callback) {
          callback();
        }
      }).bind(this);
      if ('TOP' === y) {
        // We should have animation to finish the rest of transformY.
        foregroundElement.style.transitionDuration = '0.3s';
        y = foregroundElement.parentElement.clientHeight;
      } else if ('BOTTOM' === y) {
        // If no rest transformY is needed, we should trigger the callback
        // directly.
        if (this.state.touch.prevY <= 0) {
          cbDone();
        } else {
          foregroundElement.style.transitionDuration = '0.3s';
        }
        y = 0;
      } else if (y < 0) {
        y = 0;
      }

      foregroundElement.addEventListener('transitionend', cbDone);
      this._updateTiltTransition(cbDone);
      foregroundElement.style.transform =
        'rotateX(' + this._getTiltingDegree() + ') ' +
        'translateY(-' + y + 'px)';
    };

  /**
   * Create a new sliding cover and bind all necessary event handlers.
   *
   * @return {DOMElement}
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype._slidingCover =
    function slidingCover() {
      var cover = document.createElement('div');
      cover.id = 'shrinking-cover';
      cover.style.width = '100%';
      cover.style.height = '100%';
      cover.style.position = 'relative';
      cover.style.zIndex = '2';
      cover.addEventListener('touchstart', this);
      cover.addEventListener('touchmove', this);
      cover.addEventListener('touchend', this);
      return cover;
    };

  /**
   * Create a tip.
   *
   * @return {DOMElement}
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype._slidingTip =
    function slidingTip() {
      var tip = document.createElement('div');
      var tipArrow = document.createElement('div');
      var tipText = document.createElement('div');
      tip.id = 'shrinking-tip';
      tipArrow.id = 'shrinking-tip-arrow';
      tipText.id = 'shrinking-text';
      tipArrow.textContent = '\u00A0';
      tipText.setAttribute('data-l10n-id', 'shrinking-tip');
      tip.appendChild(tipText);
      tip.appendChild(tipArrow);
      return tip;
    };

  /**
   * Will return the disabled element to let caller manupulate it.
   *
   * @return {DOMElement}
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype._disableSlidingCover =
    function su_disableSlidingCover() {
      this.cover.removeEventListener('touchstart', this);
      this.cover.removeEventListener('touchmove', this);
      this.cover.removeEventListener('touchend', this);
    };

  /**
   * Make the app frame tilted and overlay it with a cover.
   *
   * @param {function()} |cb| (Optional) if there're are any movement
   *                          should be performed after tilting back.
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype._shrinkingTilt =
    function su_shrinkingTilt(cb) {
      var foregroundElement = this.elements.foregroundElement;
      var backgroundElement = this.elements.backgroundElement;
      // If start then do some effect would tilt the window again,
      // would generate two cover which should be unique.
      if (null === this.cover) {

        // TODO: Call AppWindow.inject(DOM) instead of changing the DOM
        // directly in Shrinking UI.
        this.cover = this._slidingCover();
        var anchor = foregroundElement.firstElementChild;
        foregroundElement.insertBefore(this.cover,
          anchor);
      }
      backgroundElement.classList.add('shrinking-wrapper');
      foregroundElement.style.transition = 'transform 0.5s ease';

      // Add a little bouncing back animation.
      // Nested callbacks: first animation is for sinking down,
      // and the second one is for bouncing back.
      var bounceBack = (function on_bounceBack(evt) {
        if (evt.target !== foregroundElement) {
          return;
        }
        foregroundElement.removeEventListener('transitionend', bounceBack);
        foregroundElement.addEventListener('transitionend', bounceBackEnd);
        this._updateTiltTransition(bounceBackEnd);
        foregroundElement.style.transition = 'transform ease';
        foregroundElement.style.transform =
          'rotateX(' + this._getTiltingDegree() + ') ';
      }).bind(this);

      var bounceBackEnd = (function on_bounceBackEnd(evt) {
        if (evt.target !== foregroundElement) {
          return;
        }
        foregroundElement.removeEventListener('transitionend',
          bounceBackEnd);
        foregroundElement.style.transition = 'transform 0.5s ease 0s';
        if (cb) {
          cb();
        }
      }).bind(this);

      foregroundElement.addEventListener('transitionend', bounceBack);
      this._updateTiltTransition(bounceBack);

      // After set up, trigger the transition.
      foregroundElement.style.transformOrigin = '50% 100% 0';
      foregroundElement.style.transform =
        'rotateX(' + this._getOverTiltingDegree() + ')';
    };

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
  ShrinkingUI.prototype._shrinkingTiltBack =
    function su_shrinkingTiltBack(instant, callback) {
      var foregroundElement = this.elements.foregroundElement;
      // Setup the rotating animation.
      if (!instant) {
        var tsEnd = (function _tsEnd(evt) {
          foregroundElement.removeEventListener('transitionend', tsEnd);
            if (callback) {
              callback();
            }
        }).bind(this);
        foregroundElement.style.transition = 'transform 0.3s ease';
        foregroundElement.addEventListener('transitionend', tsEnd);
        this._updateTiltTransition(tsEnd);
        foregroundElement.style.transform = 'rotateX(0.0deg)';
      } else {
        foregroundElement.style.transition = '';
        foregroundElement.style.transform = 'rotateX(0.0deg)';
        if (callback) {
          callback();
        }
      }
    };

  /**
   * User start to tap on the tilted frame.
   *
   * @param {event} |evt|
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype._handleSendingStart =
    function su_handleSendingStart(evt) {
      // We keep the value of pageY when touchstart, so that we can
      // use it to calculate the offset of transition of every frame.
      this.state.touch.initY = evt.touches[0].pageY;
      this.debug('_handleSendingStart(): ', this.isActive());
      // Stop the touch event to affect the inner elements.
      evt.stopImmediatePropagation();

      // Remove the tip above the window.
      var tsEnd = (function _tsEnd() {
        this.tip.removeEventListener('transitionend', tsEnd);
      }).bind(this);
      this.tip.classList.add('hide');
      this.tip.addEventListener('transitionend', tsEnd);
      this._updateSlideTransition(tsEnd);

      return false;
    };

  /**
   * Sending is in progress.
   *
   * @param {event} |evt| The 'touchstart' event.
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype._handleSendingSlide =
    function su_handleSendingSlide(evt) {
      var pgy = evt.touches[0].pageY;
      var slideY = this.state.touch.initY  - pgy;
      if ('undefined' === typeof this.state.touch.initY) {
        this.state.touch.initY = slideY;
      }
      if ('undefined' === typeof this.state.touch.prevY) {
        this.state.touch.prevY = slideY;
      }
      // User is dragging it back or not.
      this.state.toward = (this.state.touch.prevY < slideY) ? 'TOP' : 'BOTTOM';

      this._sendingSlideTo(slideY);
      this.state.touch.prevY = slideY;
      this.state.overThreshold = (slideY > this.THRESHOLD) ? true : false;
    };

  /**
   * Sending was finished (user released the finger).
   * Would trigger 'shrinking-sent' event if user sent it out.
   *
   * @param {event} |evt| The 'touchmove' event.
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype._handleSendingOut =
    function su_handleSendingOut(evt) {
      this.debug('_handleSendingOut(): ', this.isActive());

      if (this.state.overThreshold && 'TOP' === this.state.toward) {
        this._sendingSlideTo('TOP' , (function() {
          // When it got sent, freeze it at the top.
          this._disableSlidingCover();
          window.dispatchEvent(new CustomEvent('shrinking-sent'));
        }).bind(this));
      } else {
        // Fallback to the bottom if user cancel it.
        this._sendingSlideTo('BOTTOM',
          (function resumeSending() {
            this._setTip();
          }).bind(this)
        );
      }
    };

  /**
   * Must clear and restore the app frame after transition end
   * to make it come back with animation.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype._cleanEffects = function su_cleanEffects() {
    var foregroundElement = this.elements.foregroundElement;
    var backgroundElement = this.elements.backgroundElement;
    return new Promise((resolve, rejected) => {
      this.debug('_cleanEffects(): ', this.isActive());
      this._disableSlidingCover();
      foregroundElement.style.transition = '';
      foregroundElement.style.transform = '';
      foregroundElement.style.transformOrigin = '50% 50% 0';
      this._setState(false);

      // Clear the 'transitionend' animation listener callbacks
      this._updateTiltTransition(null);
      this._updateSlideTransition(null);

      backgroundElement.classList.remove('shrinking-wrapper');
      this.cover.remove();
      this.cover = null;
      resolve();
    });
  };

  ShrinkingUI.prototype._getTiltingDegree = function su_getTiltingDegree() {
    return (window.OrientationManager ?
            window.OrientationManager.fetchCurrentOrientation()
              .indexOf('landscape') !== -1 :
            window.innerHeight < window.innerWidth) ?
            this.configs.degreeLandscape :
            this.configs.degreePortrait;
  };

  ShrinkingUI.prototype._getOverTiltingDegree =
    function su_getOverTiltingDegree() {
      return (window.OrientationManager ?
              window.OrientationManager.fetchCurrentOrientation()
                .indexOf('landscape') !== -1 :
              window.innerHeight < window.innerWidth) ?
              this.configs.overDegreeLandscape :
              this.configs.overDegreePortrait;
    };

  exports.ShrinkingUI = ShrinkingUI;

})(window);
