'use strict';

(function(window) {
  var TransitionEvents = ['open', 'close', 'complete', 'timeout'];

  // XXX: Move all transition related functions into a mixin.
  var TransitionStateTable = {
    'closed': ['opening', null, null, null],
    'opened': [null, 'closing', null, null],
    'opening': [null, null, 'opened', 'opened'],
    'closing': ['opened', null, 'closed', 'closed']
  };

  var TransitionMixin = {
    openAnimation: 'enlarge',
    closeAnimation: 'reduce',

    _transitionState: 'closed',

    _transitionHandler: function hw__transitionHandler(evt) {
      if (evt.target !== this.element)
        return;

      this._processTransitionEvent('complete');
    },

    resetTransition: function tm_resetTransition() {
      if (this._transitionStateTimeout) {
        window.clearTimeout(this._transitionStateTimeout);
        this._transitionStateTimeout = null;
      }
      this.element.classList.remove(this.openAnimation);
      this.element.classList.remove(this.closeAnimation);
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
        this._changeTransitionState(state);
        this.debug('transition state changed from ' +
          currentState, ' to ', state, ' by ', evt);
        this._callbackTransitonStateChange(currentState, state, evt);
      },

    _changeTransitionState:
      function tm__changeTransitionState(state) {
        this._transitionState = state;
        this.element.setAttribute('data-transitionState',
          this._transitionState);
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
      },

    _leave_closed: function tm__leave_closed(next, evt) {
      this.ensure();
      if (!AttentionScreen.isFullyVisible())
        this.setVisible(true);
      this.resetTransition();
      this.resize();
      this.setOrientation();
    },

    // Should be the same as defined in system.css animation time.
    _transitionTimeout: 300,

    _enter_opening: function tm__enter_opening(prev, evt) {
      // Establish a timer to force finish the opening state.
      this.fadeIn();
      this._transitionStateTimeout = setTimeout(function() {
        this._processTransitionEvent('timeout');
      }.bind(this), this._transitionTimeout * 1.3);
      this.element.classList.add('active');
      this.element.classList.add(this.openAnimation);
      this.publish('opening');
      if (this.browser)
        this.browser.element.focus();
    },

    _leave_opened: function tm__leave_opened(next, evt) {
      this.element.classList.remove('active');
      this.element.classList.add(this.closeAnimation);
      if (this.browser)
        this.browser.element.focus();
    },

    _enter_closing: function tm__enter_closing(prev, evt) {
      // Establish a timer to force finish the closing state.
      this._transitionStateTimeout = setTimeout(function() {
        this._processTransitionEvent('timeout');
      }.bind(this), this._transitionTimeout);
      this.element.classList.remove('active');
      this.element.classList.add('this.closeAnimation');
      this.publish('closing');
      if (this.browser)
        this.browser.element.blur();
    },

    _enter_opened: function tm__enter_opened(prev, evt) {
      this.resetTransition();
      this.element.classList.add('active');
      this.publish('opened');
    },

    _enter_closed: function tm__enter_closed(prev, evt) {
      this.setVisible(false);
      this.resetTransition();
      this.publish('closed');
    },

    open: function tm_open(callback) {
      if (this.element) {
        this._processTransitionEvent('open', callback);
      }
    },

    close: function tm_close(callback) {
      if (this.element) {
        this._processTransitionEvent('close', callback);
      }
    }
  };

  window.TransitionMixin = TransitionMixin;
  AppWindow.addMixin(TransitionMixin);
}(this));
