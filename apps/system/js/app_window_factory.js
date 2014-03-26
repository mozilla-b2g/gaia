/**
 * AppWindowFactory creates/destroys the app window instance on demand.
 */

'use strict';

(function(window) {

  var AppWindowFactory = {
    init: function awf_init() {
      /**
       * Wait for applicationready event to do the following work.
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
          this.publish('launchapp', config);
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
          this.publish('launchapp', config);
          break;
        case 'webapps-close':
          this.publish('killapp', config);
          break;
      }
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
