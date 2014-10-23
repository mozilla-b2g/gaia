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

/* globals dump, Promise, System */
(function(exports) {
  var ShrinkingUI = function() {
    this._clearPreviousTilting = false;
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
      suspended: false,
      delaySlidingID: null,
      touch: {
        initY: -1,
        prevY: -1
      },
      slideTransitionCb: null, // Last slide transition
      tiltTransitionCb: null, // Last tilt transition
      activeApp: null
    },
    configs: {
      degreeLandscape: '2.7deg',
      degreePortrait: '0.65deg',
      overDegreeLandscape: '2.9deg',
      overDegreePortrait: '0.9deg'
    },

    get current() {
      if (!this._clearPreviousTilting || !this.state.activeApp) {
        var currentApp = System.currentApp;
        if (!currentApp) {
          return null;
        }
        this.state.activeApp = currentApp.getTopMostWindow();
      }
      return this.state.activeApp;
    },

    get element() {
      var currentApp = this.current;
      if (!currentApp) {
        return null;
      }
      return currentApp.getBottomMostWindow().element;
    },

    get wrapper() {
      var currentApp = this.current;
      if (!currentApp) {
        return null;
      }
      return currentApp.getBottomMostWindow().element.parentNode;
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
    window.addEventListener('home', this);
    window.addEventListener('holdhome', this);
    window.addEventListener('activeappchanged', this);
    window.addEventListener('shrinking-start', this);
    window.addEventListener('shrinking-stop', this);
    window.addEventListener('shrinking-receiving', this);
    window.addEventListener('check-p2p-registration-for-active-app', this);
    window.addEventListener('dispatch-p2p-user-response-on-active-app', this);
  };

  /**
   * Unbind events and do some necessary initialization.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype.stop = function su_stop() {
    window.removeEventListener('home', this);
    window.removeEventListener('holdhome', this);
    window.removeEventListener('activeappchanged', this);
    window.removeEventListener('shrinking-start', this);
    window.removeEventListener('shrinking-stop', this);
    window.removeEventListener('shrinking-receiving', this);
    window.removeEventListener('check-p2p-registration-for-active-app', this);
    window.removeEventListener('dispatch-p2p-user-response-on-active-app',
      this);
  };

  /**
   * The event dispatcher.
   *
   * @param {event} |evt|
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype.handleEvent = function su_handleEvent(evt) {
      var currentApp;
      switch (evt.type) {
        // Mimic what the lockscreen does: stop home key event
        // be passed to the AppWindowManager, which would fade out
        // the current app and show the homescreen.
        //
        // This require that the shrinking file must be loaded before
        // the AppWindowManager.
        case 'home':
        case 'holdhome':
          if (this._state()) {
            evt.stopImmediatePropagation();
          }
          break;
        case 'activeappchanged':
          if (this._state()) {
            this._clearPreviousTilting = true;
            this.stopTilt();
          }
          break;
        case 'shrinking-start':
          this.startTilt();
          break;
        case 'shrinking-stop':
          // OrientationManager listen this event to
          // publish 'reset-orientation' event
          // even when orientation is locked
          this.stopTilt();
          break;
        case 'shrinking-receiving':
          // It should be launched, then received.
          // So we'll get a new app.
          this._receivingEffects();
          break;
        case 'check-p2p-registration-for-active-app':
          if (evt.detail && evt.detail.checkP2PRegistration) {
            currentApp = this.current;
            evt.detail.checkP2PRegistration(currentApp.manifestURL ||
              window.System.manifestURL);
          }
          break;
        case 'dispatch-p2p-user-response-on-active-app':
          if (evt.detail && evt.detail.dispatchP2PUserResponse) {
            currentApp = this.current;
            evt.detail.dispatchP2PUserResponse(currentApp.manifestURL ||
              window.System.manifestURL);
          }
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

  /**
   * Start tilting the app window.
   *
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype.startTilt = function su_startTilt() {
    // Already shrunk.
    if (this._state()) {
      return;
    }

    if (!this.wrapper || !this.element) {
      return;
    }
    this._clearPreviousTilting = false;
    var currentApp = this.current;
    this.state.shrinking = true;
    this.state.tilting = true;
    var afterTilt = () => {
      // After it tilted done, turn it to the screenshot mode.
      currentApp.broadcast('shrinkingstart');
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
    var wrapper = this.wrapper;
    if (!this.tip) {
      this.tip = this._slidingTip();
      wrapper.appendChild(this.tip);
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
    var currentApp = this.current;
    this.state.shrinking = false;
    this.state.ending = true;
    var afterTiltBack = (() => {
      // Turn off the screenshot mode.
      currentApp.broadcast('shrinkingstop');
      this._cleanEffects().then(() => {
        this.state.ending = false;
        this._clearPreviousTilting = false;
      });
    }).bind(this);
    this.tip.remove();
    this.tip = null;
    this._shrinkingTiltBack(true, afterTiltBack);
  };

  /**
   * Private gettter: prevent DOM manipulation goes everywhere.
   * Outside caller should observe the attribute as the setter mentioned.
   *
   * @return {boolean} The frame is shrinked or not.
   * @see _setState
   * @this {ShrinkingUI}
   */
  ShrinkingUI.prototype._state = function su_state() {
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
    var element = this.element;
    element.setAttribute('data-shrinking-state',
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
      var element = this.element;
      if (element && this.state.tiltTransitionCb) {
        element.removeEventListener('transitionend',
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
    var element = this.element;
    element.style.opacity = '0';

    var afterTop = (function() {
      // Restore the display to let it fly in.
      element.style.opacity = '';
      element.style.transition = 'transform 0.5s ease';

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
      element.style.transition = 'transform 0.05s ease';
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
      var element = this.element;
      if ('TOP' === y) {
        y = element.parentElement.clientHeight;
      } else if ('BOTTOM' === y) {
        y = 0;
      }
      if (y < 0) {
        y = 0;
      }

      var cbDone = (function on_cbDone(evt) {
        element.removeEventListener('transitionend', cbDone);
        if ('undefined' !== typeof callback) {
          callback();
        }
      }).bind(this);
      element.addEventListener('transitionend', cbDone);
      this._updateTiltTransition(cbDone);
      element.style.transform =
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
      tip.id = 'shrinking-tip';
      tipArrow.id = 'shrinking-tip-arrow';
      tipArrow.textContent = '\u00A0';
      tip.setAttribute('data-l10n-id', 'shrinking-tip');
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
      var element = this.element;
      var wrapper = this.wrapper;
      // If start then do some effect would tilt the window again,
      // would generate two cover which should be unique.
      if (null === this.cover) {

        // TODO: Call AppWindow.inject(DOM) instead of changing the DOM
        // directly in Shrinking UI.
        this.cover = this._slidingCover();
        var anchor = element.firstElementChild;
        element.insertBefore(this.cover,
          anchor);
      }
      wrapper.classList.add('shrinking-wrapper');
      element.style.transition = 'transform 0.5s ease';

      // Add a little bouncing back animation.
      // Nested callbacks: first animation is for sinking down,
      // and the second one is for bouncing back.
      var bounceBack = (function on_bounceBack(evt) {
        if (evt.target !== element) {
          return;
        }
        element.removeEventListener('transitionend', bounceBack);
        element.addEventListener('transitionend', bounceBackEnd);
        this._updateTiltTransition(bounceBackEnd);
        element.style.transition = 'transform 0.3s ease';
        element.style.transform =
          'rotateX(' + this._getTiltingDegree() + ') ';
      }).bind(this);

      var bounceBackEnd = (function on_bounceBackEnd(evt) {
        if (evt.target !== element) {
          return;
        }
        element.removeEventListener('transitionend',
          bounceBackEnd);
        element.style.transition = 'transform 0.5s ease 0s';
        if (cb) {
          cb();
        }
      }).bind(this);

      element.addEventListener('transitionend', bounceBack);
      this._updateTiltTransition(bounceBack);

      // After set up, trigger the transition.
      element.style.transformOrigin = '50% 100% 0';
      element.style.transform = 'rotateX(' + this._getOverTiltingDegree() + ')';
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
      var element = this.element;
      // Setup the rotating animation.
      if (!instant) {
        var tsEnd = (function _tsEnd(evt) {
          element.removeEventListener('transitionend', tsEnd);
            if (callback) {
              callback();
            }
        }).bind(this);
        element.style.transition = 'transform 0.3s ease';
        element.addEventListener('transitionend', tsEnd);
        this._updateTiltTransition(tsEnd);
        element.style.transform = 'rotateX(0.0deg)';
      } else {
        element.style.transition = '';
        element.style.transform = 'rotateX(0.0deg)';
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
      this.debug('_handleSendingStart(): ', this._state());
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
      var slideY = this.current.element.parentElement.clientHeight - pgy;
      if ('undefined' === typeof this.state.touch.initY) {
        this.state.touch.initY = slideY;
      }
      if ('undefined' === typeof this.state.touch.prevY) {
        this.state.touch.prevY = slideY;
      }
      // User is dragging it back or not.
      this.state.toward = (this.state.touch.prevY < slideY) ? 'TOP' : 'BOTTOM';

      // Don't set new sliding callback if we're suspended.
      if (this.state.suspended) {
        return;
      }

      var handleDelaySliding = (function su_handleDelaySliding() {
          this._sendingSlideTo(slideY);
          this.state.suspended = false;
      }).bind(this);

      this.state.delaySlidingID = window.setTimeout(handleDelaySliding,
        this.SUSPEND_INTERVAL);
      this.state.suspended = true;

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
      this.debug('_handleSendingOut(): ', this._state());
      // Clear the last sliding timeout callback to force
      // it slide to TOP or BOTTOM.
      clearTimeout(this.state.delaySlidingID);

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
            // Resume the sending timeout state.
            this.state.suspended = false;
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
    var element = this.element;
    var wrapper = this.wrapper;
    return new Promise((resolve, rejected) => {
      this.debug('_cleanEffects(): ', this._state());
      this._disableSlidingCover();
      window.clearTimeout(this.state.delaySlidingID);
      this.state.suspended = false;
      element.style.transition = '';
      element.style.transform = '';
      element.style.transformOrigin = '50% 50% 0';
      this._setState(false);

      // Clear the 'transitionend' animation listener callbacks
      this._updateTiltTransition(null);
      this._updateSlideTransition(null);

      wrapper.classList.remove('shrinking-wrapper');
      this.cover.remove();
      this.cover = null;
      resolve();
    });
  };

  ShrinkingUI.prototype._getTiltingDegree = function su_getTiltingDegree() {
    return window.OrientationManager.fetchCurrentOrientation()
      .indexOf('landscape') !== -1 ?
      this.configs.degreeLandscape :
      this.configs.degreePortrait;
  };

  ShrinkingUI.prototype._getOverTiltingDegree =
    function su_getOverTiltingDegree() {
      return window.OrientationManager.fetchCurrentOrientation()
        .indexOf('landscape') !== -1 ?
        this.configs.overDegreeLandscape :
        this.configs.overDegreePortrait;
    };

  exports.ShrinkingUI = ShrinkingUI;

})(window);
