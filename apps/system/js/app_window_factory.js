'use strict';

(function(window) {

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
   * ActivityWindowFactory for it to do instantiation via event
   * <code>launchactivity</code>.
   *
   * ![app and activity launch flow](http://i.imgur.com/ZyMcgft.png)
   *
   * @module AppWindowFactory
   */
  var AppWindowFactory = {
    init: function awf_init() {
      /**
       * Wait for applicationready event to do the following work.
       *
       * @listens webapps-launch
       */
      if (Applications.ready) {
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
      } else if (!AppWindowManager.isRunning(config) &&
           config.origin !== HomescreenLauncher.origin) {
        new AppWindow(config);
      } else if (config.origin == HomescreenLauncher.origin) {
        HomescreenLauncher.getHomescreen().ensure();
      }
      this.publish('launchapp', config);
    },

    publish: function awf_publish(event, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, true, false, detail);
      window.dispatchEvent(evt);
    }
  };

  window.AppWindowFactory = AppWindowFactory;
  AppWindowFactory.init();
}(this));
