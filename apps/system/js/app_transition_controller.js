'use strict';

(function(window) {
  var DEBUG = false;
  var TransitionEvents = ['open', 'close', 'complete', 'timeout'];
  var screenElement = document.getElementById('screen');

  var TransitionStateTable = {
    'closed': ['opening', null, null, null],
    'opened': [null, 'closing', null, null],
    'opening': [null, 'closing', 'opened', 'opened'],
    'closing': ['opened', null, 'closed', 'closed']
  };

  var appTransitionSetting = 'app-transition.enabled';
  var transitionEnabled =
    SettingsListener.getSettingsLock().get(appTransitionSetting);
  SettingsListener.observe(appTransitionSetting, true, function(value) {
    transitionEnabled = value;
  });

  /**
   * AppTransitionController controlls the opening and closing animation
   * of the given appWindow.
   *
   * ##### Flow chart #####
   * ![AppTransition Flow chart](http://i.imgur.com/k0hO2AN.png)
   *
   * ##### State machine #####
   * ![AppTransition State machine](http://i.imgur.com/0arU9rl.png)
   *
   * @param {AppWindow} app The app window instance which this controller
   *                        belongs to.
   *
   * @class AppTransitionController
   */
  window.AppTransitionController =
    function AppTransitionController(app) {
      if (!app || !app.element)
        return;

      this.app = app;
      if (this.app.openAnimation)
        this.openAnimation = this.app.openAnimation;

      if (this.app.closeAnimation)
        this.closeAnimation = this.app.closeAnimation;

      this.app.element.addEventListener('_opening', this);
      this.app.element.addEventListener('_closing', this);
      this.app.element.addEventListener('_opened', this);
      this.app.element.addEventListener('_closed', this);
      this.app.element.addEventListener('_opentransitionstart', this);
      this.app.element.addEventListener('_closetransitionstart', this);
      this.app.element.addEventListener('_openingtimeout', this);
      this.app.element.addEventListener('_closingtimeout', this);
      this.app.element.addEventListener('animationend', this);
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
  AppTransitionController.prototype.changeTransitionState =
    function atc_changeTransitionState(evt) {
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
      //backward compatibility
      if (state == 'opening') {
        /**
         * Fired when the app is doing opening animation.
         * @event AppWindow#appopening
         */
        this.app.publish('willopen');
      } else if (state == 'closing') {
        /**
         * Fired when the app is doing closing animation.
         * @event AppWindow#appclosing
         */
        this.app.publish('willclose');
      } else if (state == 'opened') {
        /**
         * Fired when the app's opening animation is ended.
         * @event AppWindow#appopen
         */
        this.app.publish('open');
      } else if (state == 'closed') {
        /**
         * Fired when the app's closing animation is ended.
         * @event AppWindow#appclose
         */
        this.app.publish('close');
      }
    };

  AppTransitionController.prototype._do_closing =
    function atc_do_closing() {
      this._closingTimeout = window.setTimeout(function() {
        this.app.broadcast('closingtimeout');
      }.bind(this),
      System.slowTransition ? this.SLOW_TRANSITION_TIMEOUT :
                              this.TRANSITION_TIMEOUT);
      this.app.element.classList.add('transition-closing');
      this.app.element.classList.add(this.getAnimationName('close'));
    };

  AppTransitionController.prototype._do_closed =
    function atc_do_closed() {
      this.resetTransition();
    };

  AppTransitionController.prototype.getAnimationName = function(type) {
    if (transitionEnabled) {
      return this.currentAnimation || this[type + 'Animation'];
    } else {
      return 'immediate';
    }
  };


  AppTransitionController.prototype._do_opening =
    function atc_do_opening() {
      this._openingTimeout = window.setTimeout(function() {
        this.app.broadcast('openingtimeout');
      }.bind(this),
      System.slowTransition ? this.SLOW_TRANSITION_TIMEOUT :
                              this.TRANSITION_TIMEOUT);
      this.app.element.classList.add('transition-opening');
      this.app.element.classList.add(this.getAnimationName('open'));
    };

  AppTransitionController.prototype._do_opened =
    function atc_do_opened() {
      this.resetTransition();
    };

  AppTransitionController.prototype.switchTransitionState =
    function atc_switchTransitionState(state) {
      this._transitionState = state;
      if (!this.app)
        return;
      this.app._changeState('transition', this._transitionState);
    };

  // TODO: move general transition handlers into another object.
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
    };

  AppTransitionController.prototype.handle_opening =
    function atc_handle_opening() {
      if (!this.app || !this.app.element)
        return;
      this.app.launchTime = Date.now();
      this.app.fadeIn();
      this.app.element.removeAttribute('aria-hidden');
      this.app.setVisible(true);

      // TODO:
      // May have orientation manager to deal with lock orientation request.
      if (this.app.isHomescreen) {
        this.app.setOrientation();
      }
    };

  AppTransitionController.prototype.handle_opened =
    function atc_handle_opened() {
      if (!this.app || !this.app.element)
        return;

      if (this.app.loaded) {
        // Perf test needs.
        this.app.publish('loadtime', {
          time: parseInt(Date.now() - this.app.launchTime),
          type: 'w',
          src: this.app.config.url
        });
      }

      this.resetTransition();
      this.app.element.removeAttribute('aria-hidden');
      this.app.element.classList.add('active');
      this.app.setVisible(true);

      // TODO:
      // May have orientation manager to deal with lock orientation request.
      this.app.setOrientation();

      // this.app.width is defined means we're resized ever.
      // but this.app.resized may be cleared.
      if (this.app.resized &&
          !LayoutManager.match(this.app.width,
            this.app.height - this.app.calibratedHeight(),
            this.app.isFullScreen())) {
        this.app.resize();
      }
      this.app.waitForNextPaint(function() {
        if (this._transitionState !== 'opened')
          return;
        // XXX: Remove this after SIMPIN Dialog is refactored.
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=938979
        // XXX: Rocketbar losing input focus
        // See: https://bugzilla.mozilla.org/show_bug.cgi?id=961557
        if (!SimPinDialog.visible && !Rocketbar.shown)
          this.app.focus();
      }.bind(this));
    };

  AppTransitionController.prototype.requireOpen = function(animation) {
    if (animation) {
      this.currentAnimation = animation;
    }
    this.changeTransitionState('open', 'requireopen');
  };

  AppTransitionController.prototype.requireClose = function(animation) {
    if (animation) {
      this.currentAnimation = animation;
    }
    this.changeTransitionState('close', 'requireclose');
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
      this.clearTransitionClasses();
    };

  AppTransitionController.prototype.clearTransitionClasses =
    function atc_removeTransitionClasses() {
      this.currentAnimation = null;
      if (!this.app) {
        return;
      }

      var classes = ['enlarge', 'reduce', 'to-cardview', 'from-cardview',
        'invoking', 'invoked', 'zoom-in', 'zoom-out', 'fade-in', 'fade-out',
        'transition-opening', 'transition-closing', 'immediate',
        'slideleft', 'slideright'];

      classes.forEach(function iterator(cls) {
        this.app.element.classList.remove(cls);
      }, this);
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
          this.changeTransitionState('timeout', evt.type);
          break;
        case 'animationend':
          this.app.debug(evt.animationName + ' has been ENDED!');
          this.changeTransitionState('complete', evt.type);
          break;
      }
    };
}(this));
