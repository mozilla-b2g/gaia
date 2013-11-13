(function(window) {
  var DEBUG = false;
  var TransitionEvents = ['open', 'close', 'complete', 'timeout'];
  var screenElement = document.getElementById('screen');

  // XXX: Move all transition related functions into a mixin.
  var TransitionStateTable = {
    'closed': ['opening', null, null, null],
    'opened': [null, 'closing', null, null],
    'opening': [null, 'closing', 'opened', 'opened'],
    'closing': ['opened', null, 'closed', 'closed']
  };

  window.AppTransitionController =
    function AppTransitionController(app, openAnimation, closeAnimation) {
      if (!app || !app.element)
        return;

      this.app = app;
      if (openAnimation)
        this.openAnimation = openAnimation;

      if (closeAnimation)
        this.closeAnimation = closeAnimation;

      this.app.element.addEventListener('_opening', this);
      this.app.element.addEventListener('_closing', this);
      this.app.element.addEventListener('_opened', this);
      this.app.element.addEventListener('_closed', this);
      this.app.element.addEventListener('_opentransitionstart', this);
      this.app.element.addEventListener('_closetransitionstart', this);
      this.app.element.addEventListener('_openingtimeout', this);
      this.app.element.addEventListener('_closingtimeout', this);
      this.app.element.addEventListener('animationend', this);
      this.app.element.addEventListener('animationstart', this);
    };

  AppTransitionController.prototype.destroy = function() {
    if (!this.app || !this.app.element)
      return;

    this.app.element.removeEventListener('_opening', this);
    this.app.element.removeEventListener('_closing', this);
    this.app.element.removeEventListener('_opened', this);
    this.app.element.removeEventListener('_closed', this);
    this.app.element.removeEventListener('_opentransitionstart', this);
    this.app.element.removeEventListener('_closetransitionstart', this);
    this.app.element.removeEventListener('_openingtimeout', this);
    this.app.element.removeEventListener('_closingtimeout', this);
    this.app.element.removeEventListener('animationend', this);
    this.app.element.removeEventListener('animationstart', this);
    this.app = null;
  };

  AppTransitionController.prototype._transitionState = 'closed';
  AppTransitionController.prototype.openAnimation = 'enlarge';
  AppTransitionController.prototype.closeAnimation = 'reduce';
  AppTransitionController.prototype.TRANSITION_TIMEOUT = 350;
  AppTransitionController.prototype.SLOW_TRANSITION_TIMEOUT = 3500;
  AppTransitionController.prototype._changeTransitionState =
    function atc__changeTransitionState(evt) {
      var currentState = this._transitionState;
      var evtIndex = TransitionEvents.indexOf(evt);
      var state = TransitionStateTable[currentState][evtIndex];
      if (!state) {
        return;
      }

      this.app.debug(currentState, state, '::', evt);

      this.switchTransitionState(state);
      this['_do_' + state]();
      this.app.publish(state);
    };

  AppTransitionController.prototype._do_closing =
    function atc_do_closing() {
      this._closingTimeout = window.setTimeout(function() {
        this.app.broadcast('closingtimeout');
      }.bind(this),
      System.slowTransition ? this.SLOW_TRANSITION_TIMEOUT :
                              this.TRANSITION_TIMEOUT);
      this.app.element.classList.add('transition-closing');
      this.app.element.classList.add(this.currentAnimation ||
        this.closeAnimation);
    };

  AppTransitionController.prototype._do_closed =
    function atc_do_closed() {
      this.resetTransition();
    };

  AppTransitionController.prototype._do_opening =
    function atc_do_opening() {
      this._openingTimeout = window.setTimeout(function() {
        this.app.broadcast('openingtimeout');
      }.bind(this),
      System.slowTransition ? this.SLOW_TRANSITION_TIMEOUT :
                              this.TRANSITION_TIMEOUT);
      this.app.element.classList.add('transition-opening');
      this.app.element.classList.add(this.currentAnimation ||
        this.openAnimation);
    };

  AppTransitionController.prototype._do_opened =
    function atc_do_opened() {
      this.resetTransition();
    };

  AppTransitionController.prototype.switchTransitionState =
    function atc_switchTransitionState(state) {
      this._transitionState = state;
      if (!this.app || !this.app.element)
        return;
      this.app.element.setAttribute('transition-state', this._transitionState);
    };

  AppTransitionController.prototype.handle_closing =
    function atc_handle_closing() {
      if (!this.app || !this.app.element)
        return;
      this.app.element.setAttribute('aria-hidden', 'true');
      this.switchTransitionState('closing');
    };

  AppTransitionController.prototype.handle_closed =
    function atc_handle_closed() {
      if (!this.app || !this.app.element)
        return;

      this.app.setVisible(false, true);
      this.app.element.setAttribute('aria-hidden', 'true');
      this.app.element.classList.remove('active');
      this.switchTransitionState('closed');
    };

  AppTransitionController.prototype.handle_opening =
    function atc_handle_opening() {
      if (!this.app || !this.app.element)
        return;
      this.app.launchTime = Date.now();
      this.app.fadeIn();
      this.app.element.removeAttribute('aria-hidden');
      this.app.setVisible(true);

      if (this.app.isHomescreen) {
        this.app.setOrientation();
      }

      this.switchTransitionState('opening');
    };

  AppTransitionController.prototype.handle_opened =
    function atc_handle_opened() {
      if (!this.app || !this.app.element)
        return;

      this.resetTransition();
      this.app.element.removeAttribute('aria-hidden');
      this.app.element.classList.add('active');
      this.app.setVisible(true);
      if (!this.app.isHomescreen) {
        this.app.setOrientation();
      }
      this.app.ensureFullRepaint(function() {
        this.app.element.classList.add('render');
        if (this._transitionState !== 'opened')
          return;
        // XXX: Remove this after SIMPIN Dialog is refactored.
        if (!SimPinDialog.visible)
          this.app.focus();
      }.bind(this));
      this.switchTransitionState('opened');
    };

  AppTransitionController.prototype.requireOpen = function(animation) {
    if (animation) {
      this.currentAnimation = animation;
    }
    this._changeTransitionState('open', 'requireopen');
  };

  AppTransitionController.prototype.requireClose = function(animation) {
    if (animation) {
      this.currentAnimation = animation;
    }
    this._changeTransitionState('close', 'requireclose');
  };

  AppTransitionController.prototype.resetTransition =
    function atc_resetTransition() {
      if (this._openingTimeout) {
        window.clearTimeout(this._openingTimeout);
        this._openingTimeout = null;
      }

      if (this._closingTimeout) {
        window.clearTimeout(this._closingTimeout);
        this._closingTimeout = null;
      }
      this.app.element.classList.remove(
        this.currentAnimation || this.openAnimation);
      this.app.element.classList.remove(
        this.currentAnimation || this.closeAnimation);
      this.currentAnimation = null;
      this.app.element.classList.remove('transition-opening');
      this.app.element.classList.remove('transition-closing');
    };

  AppTransitionController.prototype.handleEvent =
    function atc_handleEvent(evt) {
      switch (evt.type) {
        case '_opening':
          this.handle_opening();
          break;
        case '_opened':
          this.handle_opened();
          break;
        case '_closed':
          this.handle_closed();
          break;
        case '_closing':
          this.handle_closing();
          break;
        case '_closingtimeout':
        case '_openingtimeout':
          this._changeTransitionState('timeout', evt.type);
          break;
        case 'transitionend':
        case 'animationstart':
          this.app.debug(evt.animationName + ' has been STARTED!');
          break;
        case 'animationend':
          this.app.debug(evt.animationName + ' has been ENDED!');
          this._changeTransitionState('complete', evt.type);
          break;
      }
    };
}(this));
