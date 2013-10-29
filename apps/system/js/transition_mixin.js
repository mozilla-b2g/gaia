'use strict';

(function(window) {
  var TransitionEvents = ['open', 'close', 'complete', 'timeout'];
  var screenElement = document.getElementById('screen');

  // XXX: Move all transition related functions into a mixin.
  var TransitionStateTable = {
    'closed': ['opening', null, null, null],
    'opened': [null, 'closing', null, null],
    'opening': [null, 'closing', 'opened', 'opened'],
    'closing': ['opened', null, 'closed', 'closed']
  };

  var TransitionMixin = {
    openAnimation: 'enlarge',
    closeAnimation: 'reduce',

    _transitionState: 'closed',

    _transitionHandler: function hw__transitionHandler(evt) {
      if (evt.target !== this.element)
        return;

      evt.stopPropagation();

      this._processTransitionEvent('complete');
    },

    resetTransition: function tm_resetTransition() {
      if (this._transitionStateTimeout) {
        window.clearTimeout(this._transitionStateTimeout);
        this._transitionStateTimeout = null;
      }
      this.element.classList.remove(
        this.currentAnimation || this.openAnimation);
      this.element.classList.remove(
        this.currentAnimation || this.closeAnimation);
      this.element.classList.remove('transition-opening');
      this.element.classList.remove('transition-closing');
    },

    _processTransitionEvent:
      function tm__processTransitionEvent(evt, callback) {
        var currentState = this._transitionState;
        var evtIndex = TransitionEvents.indexOf(evt);
        var state = TransitionStateTable[currentState][evtIndex];
        if (!state) {
          return;
        }

        if (callback) {
          var s = evt == 'open' ? 'opened' : 'closed';
          this.one('transition', s, callback);
        }
        this._changeTransitionState(state, evt);
        var self = this;
        setTimeout(
          function() {
            self._callbackTransitonStateChange(currentState, state, evt);
          });
      },

    _changeTransitionState:
      function tm__changeTransitionState(state, evt) {
        var currentState = this._transitionState;
        this._transitionState = state;
        this.element.setAttribute('transition-state',
          this._transitionState);

        this.debug('transition state changed from ' +
          currentState, ' to ', state, ' by ', evt);
      },

    _callbackTransitonStateChange:
      function tm__callbackTransitonStateChange(previous, current, evt) {
        // The design of three type of callbacks here is for flexibility.
        // If we want to do something one by one we could use that.
        // The order is: leave state -> on event occur -> enter state.
        if (typeof(this['_leave_' + previous]) == 'function') {
          this['_leave_' + previous](current, evt);
        }

        if (typeof(this['_on_' + evt]) == 'function') {
          this['_on_' + evt](previous, current);
        }

        if (typeof(this['_enter_' + current]) == 'function') {
          this['_enter_' + current](previous, evt);
        }

        if (typeof(this['_' + this.CLASSNAME + '_' + current]) == 'function') {
          this['_' + this.CLASSNAME + '_' + current](previous, evt);
        }
      },

    _leave_closed: function tm__leave_closed(next, evt) {
      // XXX: Refine this.
      if (this.isHomescreen)
        this.ensure();
      if (!AttentionScreen.isFullyVisible()) {
        this.setVisible(true);
          // Set the frame to be visible.
      } else {
        // If attention screen is fully visible now,
        // don't give the open frame visible.
        // This is the case that homescreen is restarted behind attention screen

        // XXX: After bug 822325 is fixed in gecko,
        // we don't need to check trusted ui state here anymore.
        // We do this because we don't want the trustedUI opener
        // is killed in background due to OOM.
        if (!TrustedUIManager.hasTrustedUI(this.origin))
          this.setVisible(false);
      }
      this.resetTransition();

      // Only resize after the resize function is called once.
      if (this.resized || this.isHomescreen)
        this.resize(true);

      if (this.isHomescreen) {
        this.setOrientation();
      }
    },

    // Should be the same as defined in system.css animation time.
    _transitionTimeout: System.slowTransition ? 3000 : 300,

    _enter_opening: function tm__enter_opening(prev, evt) {
      // Establish a timer to force finish the opening state.
      this.fadeIn();
      this._transitionStateTimeout = setTimeout(function() {
        this._processTransitionEvent('timeout');
      }.bind(this), this._transitionTimeout * 1.3);

      this.element.classList.add('active');
      this.element.classList.add('transition-opening');
      this.element.classList.add(this.currentAnimation || this.openAnimation);
      this.element.removeAttribute('aria-hidden');
      this.launchTime = Date.now();
      if (this.isFullScreen()) {
        screenElement.classList.add('fullscreen-app');
      }
      if (this.rotatingDegree !== 0) {
        // Lock the orientation before transitioning.
        this.setOrientation();
      }
      this.publish('opening');
      this.publish('willopen'); // backward compatibility
      if (this.browser)
        this.browser.element.focus();
    },

    _leave_opened: function tm__leave_opened(next, evt) {
      this.element.classList.add('transition-closing');
      this.element.classList.add(this.currentAnimation || this.closeAnimation);
    },

    _enter_closing: function tm__enter_closing(prev, evt) {
      // Establish a timer to force finish the closing state.
      this._transitionStateTimeout = setTimeout(function() {
        this._processTransitionEvent('timeout');
      }.bind(this), this._transitionTimeout);
      this.element.setAttribute('aria-hidden', 'true');
      if (this.determineClosingRotationDegree() !== 0) {
        this.fadeOut();
      }
      this.publish('closing');
      this.publish('willclose'); // backward compatibility
      if (this.browser)
        this.browser.element.blur();
    },

    _enter_opened: function tm__enter_opened(prev, evt) {
      this.resetTransition();
      this.currentAnimation = '';
      if (!this.isHomescreen) {
        this.setOrientation();
      }
      this.element.classList.add('active');
      this.publish('opened');
      this.publish('open'); // backward compatibity
      this.element.classList.add('render');

      if (this.loaded) {
        this.publish('loadtime', true, false, {
          time: parseInt(Date.now() - this._start),
          type: 'w'
        });
      }
    },

    _enter_closed: function tm__enter_closed(prev, evt) {
      this.element.classList.remove('active');
      this.setVisible(false);
      this.resetTransition();
      this.currentAnimation = '';
      this.publish('closed');
      this.publish('close'); // backward compatibity
    },

    open: function tm__open(callback) {
      if (typeof(arguments[0]) !== 'function') {
        this.currentAnimation = arguments[0];
        callback = arguments[1];
      }
      this._processTransitionEvent('open', callback);
    },

    close: function tm__close(callback) {
      if (typeof(arguments[0]) !== 'function') {
        this.currentAnimation = arguments[0];
        callback = arguments[1];
      }
      this._processTransitionEvent('close', callback);
    },

    readyToOpen: function tm_open(callback) {
      if (this.loaded) {
        this._start = Date.now();
      }
      if (this.element) {
        this.debug('requesting to open');
        if (!this.loaded) {
          this.debug('loaded yet');
          callback();
        } else {
          this.debug('loaded');
          var invoked = false;
          this._waitForNextPaint(function() {
            if (invoked)
              return;
            invoked = true;
            callback();
          });
          this.ensureFullRepaint(function() {
            if (invoked)
              return;
            invoked = true;
            callback();
          });
        }
      }
    }
  };

  window.TransitionMixin = TransitionMixin;
  AppWindow.addMixin(TransitionMixin);
}(this));
