(function(window) {
  var instance = undefined;
  var HomescreenWindow = function HomescreenWindow(manifestURL) {
    if (typeof(instance) !== 'undefined') {
      return instance;
    }


    // XXX: refine this.
    var origin = this.retrieve(manifestURL).origin;
    this.config = new BrowserConfigHelper(origin, manifestURL);
    this.origin = this.config.origin;
    HomescreenWindow.origin = this.origin;
    this.manifestURL = manifestURL;
    this.manifest = this.config.manifest;
    this.URL = this.origin + '/index.html#root';
    this.config.isHomescreen = true;
    // XXX: This one is confusing but currently we pass
    // the whole instance in publish method.
    this.isHomescreen = true;
    this.render();
    instance = this;
    this.publish('created');
    return this;
  };

  HomescreenWindow.prototype.__proto__ = AppWindow.prototype;
  HomescreenWindow.prototype.render = function hw_render() {
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this.browser = new BrowserFrame(this.config);
    this.element = document.getElementById('homescreen');

    // XXX: Remove following two lines once mozbrowser element is moved
    // into appWindow.
    this.frame = this.element;
    this.iframe = this.browser.element;

    this.element.appendChild(this.browser.element);

    var screenshotOverlay = document.createElement('div');
    screenshotOverlay.classList.add('screenshot-overlay');
    this.element.appendChild(screenshotOverlay);
    this.screenshotOverlay = screenshotOverlay;

    this._registerEvents();
    this.resize();
    this.publish('rendered');
  };

  HomescreenWindow.prototype._registerEvents = function hw_registerEvents() {
    var self = this;
    this.browser.element.addEventListener('mozbrowserclose', function(evt) {
      evt.stopImmediatePropagation();
      self.restart();
    });

    this.browser.element.addEventListener('mozbrowsererror', function(evt) {
      if (evt.detail.type == 'fatal') {
        evt.stopImmediatePropagation();
        self.restart();
      }
    });

    this.element.addEventListener('animationend',
      this._transitionHandler.bind(this));
  };

  var TransitionEvents = ['open', 'close', 'complete', 'timeout'];

  // XXX: Move all transition related functions into a mixin.
  var TransitionStateTable = {
    'closed': ['opening', null, null, null],
    'opened': [null, 'closing', null, null],
    'opening': [null, null, 'opened', 'opened'],
    'closing': [null, null, 'closed', 'closed']
  };

  /* Initial transition state is closed */
  HomescreenWindow.prototype._transitionState = 'closed';

  HomescreenWindow.prototype._transitionHandler =
    function hw__transitionHandler() {

    };

  HomescreenWindow.prototype.restart = function hw_restart() {
    // If the crashing app is the home screen app and it is the displaying app
    // we will need to relaunch it right away.
    // Alternatively, if home screen is not the displaying app,
    // we will not relaunch it until the foreground app is closed.
    // (to be dealt in setDisplayedApp(), not here)

    // If we're displayed, restart immediately.
    if (WindowManager.getDisplayedApp() === self.config.origin) {
      this.kill();

      // XXX workaround bug 810431.
      // we need this here and not in other situations
      // as it is expected that homescreen frame is available.
      setTimeout(function() {
        this.render();
      }.bind(this));
    } else {
      // Otherwise wait until next opening request.
      this.kill();
    }
  };

  HomescreenWindow.prototype.kill = function hw_kill() {
    this.containerElement.removeChild(this.element);
    this.element = this.frame = this.iframe = null;
    this.browser = null;
    this.publish('terminated');
  };

  HomescreenWindow.prototype.view = function hw_view() {
    return '<div class="appWindow homescreen" id="homescreen">' +
           '</div>';
  };

  /**
   * Homescreen Window is still contained under #windows element.
   * @type {DOMElement}
   */
  HomescreenWindow.prototype.containerElement =
    document.getElementById('windows');

  HomescreenWindow.prototype.eventPrefix = 'homescreen';

  HomescreenWindow.prototype.toggle = function hw_toggle(visible) {
    this.ensure();
    if (this.browser.element)
      this.setVisible(visible);
  };

  // Ensure the homescreen is loaded and return its frame.  Restarts
  // the homescreen app if it was killed in the background.
  // Note: this function would not invoke openWindow(homescreen),
  // which should be handled in setDisplayedApp and in closeWindow()
  HomescreenWindow.prototype.ensure = function hw_ensure(reset) {
    if (!this.element) {
      this.render();
    } else if (reset) {
      this.browser.element.src = this.URL + new Date();
    }

    return this.element;
  };

  HomescreenWindow.prototype.retrieve = function hw_retrieve(manifestURL) {
    var app = Applications.getByManifestURL(manifestURL);
    if (app) {
      return {
        origin: app.origin,
        manifestURL: app.manifestURL,
        URL: app.origin + '/index.html#root'
      };
    } else {
      return {
        origin: '',
        manifestURL: manifestURL,
        URL: ''
      };
    }
  };

  HomescreenWindow.init = function hw_init() {
    var self = this;
    if (Applications.ready) {
      this.fetchSettings();
    } else {
      window.addEventListener('applicationready', function onAppReady() {
        window.removeEventListener('applicationready', onAppReady);
        self.fetchSettings();
      });
    }
  };

  HomescreenWindow.fetchSettings = function hw_fetchSettings() {
    var self = this;
    this.ready = true;
    window.dispatchEvent(new CustomEvent('homescreen-ready'));
    SettingsListener.observe('homescreen.manifestURL', '',
      function onRetrievingHomescreenManifestURL(value) {
        if (!self._homescreenApp) {
          instance = new self(value);
        } else {
          instance.kill();
          instance.retrieve(value);
          instance.render();
          self.origin = instance.origin;
          window.dispatchEvent(new CustomEvent('homescreen-changed'));
        }
      });
  };

  HomescreenWindow.getSingletonInstance = function() {
    if (typeof instance == 'undefined') {
      return new this();
    } else if (!this.browser) {
      instance.ensure();
      return instance;
    } else {
      return instance;
    }
  };

  HomescreenWindow.prototype._leave_closed = function(next, evt) {
    this.ensure();
    this.setVisible(true);
    this.resetTransition();
    this.resize();
    this.setOrientation();
  };

  // Should be the same as defined in system.css animation time.
  HomescreenWindow.prototype._transitionTimeout = 300;

  HomescreenWindow.prototype._enter_opening = function(prev, evt) {
    // Establish a timer to force finish the opening state.
    this._transitionStateTimeout = setTimeout(function() {
      this._processTransitionEvent('timeout');
    }.bind(this), this._transitionTimeout);
    this.element.classList.add('active');
    this.element.classList.add('zoom-out');
    this.publish('opening');
    if (this.browser)
      this.browser.element.focus();
  };

  HomescreenWindow.prototype._leave_opened = function(next, evt) {
    this.element.classList.remove('active');
    this.element.classList.add('zoom-in');
    if (this.browser)
      this.browser.element.focus();
  };

  HomescreenWindow.prototype._enter_closing = function(prev, evt) {
    // Establish a timer to force finish the closing state.
    this._transitionStateTimeout = setTimeout(function() {
      this._processTransitionEvent('timeout');
    }.bind(this), this._transitionTimeout);
    this.element.classList.remove('active');
    this.element.classList.add('zoom-in');
    this.publish('closing');
    if (this.browser)
      this.browser.element.blur();
  };

  HomescreenWindow.prototype._enter_opened = function(prev, evt) {
    this.resetTransition();
    this.publish('opened');
  };

  HomescreenWindow.prototype._enter_closed = function(prev, evt) {
    this.setVisible(false);
    this.resetTransition();
    this.publish('closed');
  };

  HomescreenWindow.prototype.open = function(callback) {
    if (this.element) {
      this._processTransitionEvent('open', callback);
    }
  };

  HomescreenWindow.prototype.close = function(callback) {
    if (this.element) {
      this._processTransitionEvent('close', callback);
    }
  };

  HomescreenWindow.prototype.resetTransition = function() {
    if (this._transitionStateTimeout) {
      window.clearTimeout(this._transitionStateTimeout);
      this._transitionStateTimeout = null;
    }
    this.element.classList.remove('zoom-in');
    this.element.classList.remove('zoom-out');
  };

  /**
   * Acquire one-time callback of certain type of state
   */
  HomescreenWindow.prototype.one = function(type, state, callback) {
    var self = this;
    var observer = new MutationObserver(function() {
      if (self.element.getAttribute('data-' + type + 'State') === state) {
        observer.disconnect();
        callback();
      }
    });

    // configuration of the observer:
    // we only care dataset change here.
    var config = { characterData: true, attributes: true };

    // pass in the target node, as well as the observer options
    observer.observe(this.element, config);
  };

  HomescreenWindow.prototype._processTransitionEvent = function(evt, callback) {
    var currentState = this._transitionState;
    var evtIndex = TransitionEvents.indexOf(evt);
    var state = TransitionStateTable[currentState][evtIndex];
    if (!state) {
      return;
    }

    console.log(state);

    if (callback) {
      var s = evt == 'open' ? 'opened' : 'closed';
      this.one('transition', s, callback);
    }
    this._changeTransitionState(state);
    this._callbackTransitonStateChange(currentState, state, evt);
  };

  HomescreenWindow.prototype._changeTransitionState =
    function hw__changeTransitionState(state) {
      this._transitionState = state;
      this.element.setAttribute('data-transitionState', this._transitionState);
    };

  HomescreenWindow.prototype.
    _callbackTransitonStateChange =
    function hw____callbackTransitonStateChange(previous, current, evt) {
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
    };

  window.HomescreenWindow = HomescreenWindow;
}(this));
