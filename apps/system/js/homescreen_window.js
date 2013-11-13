(function(window) {
  var HomescreenWindow = function HomescreenWindow(manifestURL) {
    this.setBrowserConfig(manifestURL);
    this.render();
    this.publish('created');
    return this;
  };

  HomescreenWindow.prototype.__proto__ = AppWindow.prototype;

  HomescreenWindow.prototype.CLASS_NAME = 'HomescreenWindow';

  HomescreenWindow.prototype._ignoreRepaintRequest = false;

  HomescreenWindow.prototype.setBrowserConfig =
    function hw_setBrowserConfig(manifestURL) {
      var app = Applications.getByManifestURL(manifestURL);
      this.origin = app.origin;
      this.manifestURL = app.manifestURL;
      this.url = app.origin + '/index.html#root';

      this.browser_config =
        new BrowserConfigHelper(this.origin, this.manifestURL);

      // Necessary for b2gperf now.
      this.name = this.browser_config.name;

      this.manifest = this.browser_config.manifest;
      // XXX: Remove this hardcode
      this.browser_config.url = this.url;
      this.browser_config.isHomescreen = true;
      this.isHomescreen = true;
    };

  HomescreenWindow.prototype.render = function hw_render() {
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this.browser = new BrowserFrame(this.browser_config);
    this.element = document.getElementById('homescreen');

    // XXX: Remove following two lines once mozbrowser element is moved
    // into appWindow.
    this.frame = this.element;
    this.iframe = this.browser.element;
    this.iframe.dataset.frameType = 'window';
    this.iframe.dataset.frameOrigin = 'homescreen';

    this.element.appendChild(this.browser.element);

    /* XXX: We dynamically insert nodes here because
       appWindow.frame.firstChild is used as appWindow.iframe */
    var screenshotOverlay = document.createElement('div');
    screenshotOverlay.classList.add('screenshot-overlay');
    this.element.appendChild(screenshotOverlay);
    this.screenshotOverlay = screenshotOverlay;

    var fadeOverlay = document.createElement('div');
    fadeOverlay.classList.add('fade-overlay');
    this.element.appendChild(fadeOverlay);
    this.fadeOverlay = fadeOverlay;

    this._registerEvents();
    this._resize();
    this.publish('rendered');
  };

  HomescreenWindow.prototype._registerEvents = function hw_registerEvents() {
    var self = this;

    if (window.AppTransitionController) {
      this.transitionController =
        new AppTransitionController(this, 'zoom-out', 'zoom-in');
    }

    this.element.addEventListener('_opening', function onOpening() {
      self.ensure();
    });

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

    this.browser.element.addEventListener('mozbrowservisibilitychange',
      function(evt) {
        self._visibilityState = evt.detail.visible ?
          'foreground' : 'background';
        self.publish(self._visibilityState);
      });

    this.browser.element.addEventListener('mozbrowserloadend',
      function(evt) {
        this.loaded = true;
      }.bind(this));
  };

  HomescreenWindow.prototype.restart = function hw_restart() {
    // If the crashing app is the home screen app and it is the displaying app
    // we will need to relaunch it right away.
    // Alternatively, if home screen is not the displaying app,
    // we will not relaunch it until the foreground app is closed.
    // (to be dealt in setDisplayedApp(), not here)

    // If we're displayed, restart immediately.
    this.debug(this._visibilityState);
    if (this._visibilityState == 'foreground' ||
        this.element.classList.contains('active')) {
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
      this.browser.element.src = this.browser_config.url + new Date();
    }

    return this.element;
  };

  HomescreenWindow.prototype._DEBUG = true;

  window.HomescreenWindow = HomescreenWindow;
}(this));
