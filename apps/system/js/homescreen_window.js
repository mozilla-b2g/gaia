/* global BrowserConfigHelper, AppWindow */

'use strict';
(function(exports) {
  /**
   * HomescreenWindow creates a instance of homescreen by give manifestURL.
   *
   * ##### Flow chart
   * ![Boot to Homescreen flow chart](http://i.imgur.com/vLA8YEN.png)
   *
   * @class HomescreenWindow
   * @param {String} manifestURL The manifestURL of the homescreen app.
   */
  var HomescreenWindow = function HomescreenWindow(manifestURL) {
    this.instanceID = 'homescreen';
    this.setBrowserConfig(manifestURL);
    this.render();
    this.publish('created');
    this.createdTime = this.launchTime = Date.now();
    return this;
  };

  /**
   * Fired when the homescreen window is created.
   * @event HomescreenWindow#homescreencreated
   */
  /**
   * Fired when the homescreen window is removed.
   * @event HomescreenWindow#homescreenterminated
   */
  /**
   * Fired when the homescreen window is opening.
   * @event HomescreenWindow#homescreenopening
   */
  /**
   * Fired when the homescreen window is opened.
   * @event HomescreenWindow#homescreenopen
   */
  /**
   * Fired when the homescreen window is closed.
   * @event HomescreenWindow#homescreenclosed
   */
  /**
   * Fired when the homescreen window is closing.
   * @event HomescreenWindow#homescreenclosing
   */
  /**
   * Fired when the homescreen window is closed.
   * @event HomescreenWindow#homescreenclose
   */
  /**
   * Fired before the homescreen window is rendered.
   * @event HomescreenWindow#homescreenwillrender
   */
  /**
   * Fired when the homescreen window is rendered to the DOM tree.
   * @event HomescreenWindow#homescreenrendered
   */
  /**
   * Fired when the page visibility of the homescreen window is
   * changed to foreground.
   * @event HomescreenWindow#homescreenforeground
   */
  /**
   * Fired when the page visibility of the homescreen window is
   * changed to background.
   * @event HomescreenWindow#homescreenbackground
   */

  HomescreenWindow.prototype = Object.create(AppWindow.prototype);

  HomescreenWindow.prototype._DEBUG = false;

  HomescreenWindow.prototype.CLASS_NAME = 'HomescreenWindow';

  /**
   * Construct browser config object by manifestURL.
   * @param {String} manifestURL The manifestURL of homescreen.
   */
  HomescreenWindow.prototype.setBrowserConfig =
    function hw_setBrowserConfig(manifestURL) {
      var app = window.applications.getByManifestURL(manifestURL);
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
      this.config = this.browser_config;
      this.isHomescreen = true;
    };

  HomescreenWindow.REGISTERED_EVENTS =
    ['_opening', '_localized', 'mozbrowserclose', 'mozbrowsererror',
      'mozbrowservisibilitychange', 'mozbrowserloadend', '_orientationchange',
      '_focus'];

  HomescreenWindow.SUB_COMPONENTS = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog,
    'authDialog': window.AppAuthenticationDialog,
    'childWindowFactory': window.ChildWindowFactory
  };

  HomescreenWindow.prototype.openAnimation = 'zoom-out';
  HomescreenWindow.prototype.closeAnimation = 'zoom-in';

  HomescreenWindow.prototype._handle__opening = function hw__handle__opening() {
    this.ensure();
  };

  HomescreenWindow.prototype._handle_mozbrowserclose =
    function hw__handle_mozbrowserclose(evt) {
      this.restart();
    };

  HomescreenWindow.prototype._handle_mozbrowsererror =
    function hw__handle_mozbrowsererror(evt) {
      if (evt.detail.type == 'fatal') {
        this.loaded = false;
        this.publish('crashed');
        this.restart();
      }
    };

  HomescreenWindow.prototype.restart = function hw_restart() {
    // If the crashing app is the home screen app and it is the displaying app
    // we will need to relaunch it right away.
    // Alternatively, if home screen is not the displaying app,
    // we will not relaunch it until the foreground app is closed.
    // (to be dealt in setDisplayedApp(), not here)

    // If we're displayed, restart immediately.
    if (this.isActive()) {
      this.kill();

      // XXX workaround bug 810431.
      // we need this here and not in other situations
      // as it is expected that homescreen frame is available.
      setTimeout(function() {
        if (this.element) {
          return;
        }
        this.render();
        this.open();
      }.bind(this));
    } else {
      // Otherwise wait until next opening request.
      this.kill();
    }
  };

  HomescreenWindow.prototype.kill = function hw_kill() {
    this.destroy();
    this.publish('terminated');
  };

  HomescreenWindow.prototype.view = function hw_view() {
    return '<div class="appWindow homescreen" id="homescreen">' +
              '<div class="fade-overlay"></div>' +
           '</div>';
  };

  HomescreenWindow.prototype.eventPrefix = 'homescreen';

  HomescreenWindow.prototype.toggle = function hw_toggle(visible) {
    this.ensure();
    if (this.browser.element) {
      this.setVisible(visible);
    }
  };

  // Ensure the homescreen is loaded and return its frame.  Restarts
  // the homescreen app if it was killed in the background.
  HomescreenWindow.prototype.ensure = function hw_ensure(reset) {
    this.debug('ensuring homescreen...', this.frontWindow);
    if (!this.element) {
      this.render();
    } else if (reset) {
      if (this.frontWindow) {
        // Just kill front window but not switch to the first page.
        this.frontWindow.kill();
      } else {
        this.browser.element.src = this.browser_config.url + Date.now();
      }
    }

    return this.element;
  };

  /**
  *
  * The homescreen instance always resizes if it's needed.
  * (ie. the current layout is different from the current window dimensions)
  * This helps with the back-to-homescreen transition.
  *
  */
  HomescreenWindow.prototype.resize = function aw_resize() {
    this.debug('request RESIZE...');
    this.debug(' will resize... ');
    this._resize();
  };

  /**
   * Hide the overlay element of this window.
   *
   * this {HomescreenWindow}
   * memberof HomescreenWindow
   */
  HomescreenWindow.prototype.hideFadeOverlay = function hw_hideFadeOverlay() {
    this.fadeOverlay.classList.add('hidden');
  };

  /**
   * Show the overlay element of this window.
   *
   * this {HomescreenWindow}
   * memberof HomescreenWindow
   */
  HomescreenWindow.prototype.showFadeOverlay = function hw_showFadeOverlay() {
    this.fadeOverlay.classList.remove('hidden');
  };

  exports.HomescreenWindow = HomescreenWindow;
}(window));
