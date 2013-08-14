/**
 * AppWindowFactory creates/destroys the app window instance on demand.
 */

(function(window) {
  'use strict';

  var AppWindowFactory = {
    init: function awf_init() {
      /**
       * Wait for applicationready event to do the following work.
       */
      if (Applications.ready) {
        window.addEventListener('mozChromeEvent', this);
        InitLogoHandler.animate();
        //this.launchFTU();
        this.launchHomescreen();
      } else {
        window.addEventListener('applicationready', this);
      }
    },

    handleEvent: function awf_handleEvent(evt) {
      switch (evt.type) {
        case 'mozChromeEvent':
          var manifestURL = evt.detail.manifestURL;
          if (!manifestURL)
            break;

          var config = new BrowserConfig(evt.detail.url,
                            evt.detail.manifestURL);
          switch (evt.detail.type) {
            case 'webapps-close':
              // TODO: where to put this?
              break;

            case 'webapps-launch':
              if (config.origin == this._homescreenWindow.getConfig('origin')) {
              } else {
                if (!(AppWindowManager.isRunning(config.origin))) {
                  new AppWindow(evt.detail.url, evt.detail.manifestURL);
                } else {
                  AppWindowManager.setDisplayedApp(config.origin);
                }
              }
              break;
            }
          break;

        case 'applicationready':
          window.removeEventListener('applicationready', this);
          window.addEventListener('mozChromeEvent', this);
          InitLogoHandler.animate();
          this.launchHomescreen();
          break;
      }
    },

    setDisplayedApp: function awf_setDisplayedApp() {
      // TODO
    },

    launchFTU: function awf_launchFTU() {
      this._FTUWindow = new FTUWindow();
    },

    launchHomescreen: function awf_launchHomescreen() {
      this._homescreenWindow = new HomescreenWindow();
    }
  };

  window.AppWindowFactory = AppWindowFactory;
  AppWindowFactory.init();
}(this));
