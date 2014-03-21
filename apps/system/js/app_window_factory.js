'use strict';
/* global applications, BrowserConfigHelper, AppWindowManager,
          homescreenLauncher, AppWindow */
/* jshint nonew: false */

(function(exports) {

  /**
   * AppWindowFactory handle the launch request from gecko and
   * wrap the config with properer parameters.
   *
   * If gecko is asking us to open a webapp,
   * AppWindowFactory would do the instantiation and let
   * AppWindowManager to do the following app opening control via
   * event <code>launchapp</code>.
   *
   * If gecko is asking us to open an inline activity page,
   * AppWindowFactory would wrap the configuration and sent it to
   * AppWindowFactory for it to do instantiation via event
   * <code>launchactivity</code>.
   *
   * ![app and activity launch flow](http://i.imgur.com/ZyMcgft.png)
   *
   * @class AppWindowFactory
   */
  function AppWindowFactory() {
  }

  AppWindowFactory.prototype = {
    /**
     * Indicate whether this class is started or not.
     * @access private
     * @type {Boolean}
     * @memberof AppWindowFactory.prototype
     */
    _started: false,

    /**
     * Register all event handlers.
     * @memberof AppWindowFactory.prototype
     */
    start: function awf_start() {
      if (this._started) {
        return;
      }
      this._started = true;

      /**
       * Wait for applicationready event to do the following work.
       *
       * @listens webapps-launch
       */
      if (applications.ready) {
        window.addEventListener('webapps-launch', this);
        window.addEventListener('webapps-close', this);
        window.addEventListener('open-app', this);
      } else {
        var self = this;
        window.addEventListener('applicationready', function appReady(e) {
          window.removeEventListener('applicationready', appReady);
          window.addEventListener('webapps-launch', self);
          window.addEventListener('webapps-close', self);
          window.addEventListener('open-app', self);
        });
      }
    },

    /**
     * Unregister all event handlers.
     * @memberof AppWindowFactory.prototype
     */
    stop: function awf_stop() {
      if (!this._started) {
        return;
      }
      this._started = false;

      window.removeEventListener('webapps-launch', this);
      window.removeEventListener('webapps-close', this);
      window.removeEventListener('open-app', this);
    },

    handleEvent: function awf_handleEvent(evt) {
      var detail = evt.detail;
      var manifestURL = detail.manifestURL;
      if (!manifestURL) {
        return;
      }

      var config = new BrowserConfigHelper(detail.url, detail.manifestURL);

      if (!config.manifest) {
        return;
      }

      switch (evt.type) {
        case 'webapps-launch':
          // TODO: Look up current opened window list,
          // and then create a new instance here.
          this.launch(config);
          break;
        case 'open-app':
          // System Message Handler API is asking us to open the specific URL
          // that handles the pending system message.
          // We will launch it in background if it's not handling an activity.
          config.isSystemMessage = true;
          if (detail.isActivity) {
            config.isActivity = true;
            if (detail.target.disposition &&
                detail.target.disposition == 'inline') {
              config.inline = true;
            }
          }
          config.changeURL = !detail.onlyShowApp;
          config.stayBackground = !detail.showApp;
          // TODO: Create activity window instance
          // or background app window instance for system message here.
          this.launch(config);
          break;
        case 'webapps-close':
          this.publish('killapp', config);
          break;
      }
    },

    /**
     * Browser Configuration
     * @typedef {Object} BrowserConfig
     * @property {String} origin the same as appURL.
     * @property {String} manifestURL the same as manifestURL.
     * @property {Object} manifest the parsed manifest object.
     *                    If the app is not an entry point app,
     *                    the manifest would be the reference of application
     *                    manifest stored in Applications module. But if the app
     *                    is an entry point app, we will do deep clone to
     *                    generate a new object and replace the properties of
     *                    entry point to proper position.
     * @property {String} name the name of the app, retrieved from manifest.
     * @property {Boolean} oop Indicate it's running out of process or in
     *                     process.
     */

    /**
     * Launch an app window.
     * @param  {BrowserConfig} config Generated by BrowserConfigHelper.
     * @memberof AppWindowFactory.prototype
     */
    launch: function awf_launch(config) {
      if (config.url === window.location.href) {
        return;
      }
      if (config.isActivity && config.inline) {
        this.publish('launchactivity', config);
        return;
      }

      // The rocketbar currently handles the management of
      // the search app
      if (config.manifest.role === 'search') {
        return;
      }
      var app = AppWindowManager.getApp(config.origin);
      if (app) {
        app.reviveBrowser();
      } else if (config.origin !== homescreenLauncher.origin) {
        new AppWindow(config);
      } else if (config.origin == homescreenLauncher.origin) {
        homescreenLauncher.getHomescreen().ensure();
      }
      this.publish('launchapp', config);
    },

    /**
     * Publish a CustomEvent.
     * @param  {String} event The name of the event.
     * @param  {Object} detail The data passed when initializing the event.
     * @memberof AppWindowFactory.prototype
     */
    publish: function awf_publish(event, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, true, false, detail);
      window.dispatchEvent(evt);
    }
  };

  exports.AppWindowFactory = AppWindowFactory;
}(window));
