(function(window) {
  var currentManifestURL = '';
  var origin = '';
  var instance = undefined;

  var HomescreenLauncher = {
    ready: false,

    get origin() {
      return origin;
    },

    init: function hl_init() {
      var self = this;
      if (Applications.ready) {
        this.fetchSettings();
      } else {
        window.addEventListener('applicationready', function onAppReady() {
          window.removeEventListener('applicationready', onAppReady);
          self.fetchSettings();
        });
      }
    },

    fetchSettings: function hl_fetchSettings() {
      var self = this;
      SettingsListener.observe('homescreen.manifestURL', '',
        function onRetrievingHomescreenManifestURL(value) {
          var previousManifestURL = currentManifestURL;
          currentManifestURL = value;
          if (typeof(instance) !== 'undefined') {
            if (previousManifestURL !== '' &&
                previousManifestURL !== currentManifestURL) {
              // Kill and re-render homescreen if manifestURL is changed.
              instance.kill();
              instance.setBrowserConfig(value);
              instance.render();
              // Update origin;
              origin = instance.origin;
              window.dispatchEvent(new CustomEvent('homescreen-changed'));
            } else {
              instance.ensure();
            }
          } else {
            // Since there's no homescreen window instance now,
            // we have to caculate the origin on our own.
            origin = Applications.getByManifestURL(value).origin;
          }

          self.ready = true;
          window.dispatchEvent(new CustomEvent('homescreen-ready'));
        });
    },

    getHomescreen: function hl_getHomescreen() {
      if (currentManifestURL === '') {
        console.warn('HomescreenLauncher: not ready right now.');
        return null;
      }
      if (typeof instance == 'undefined') {
        instance = new HomescreenWindow(currentManifestURL);
        return instance;
      } else {
        instance.ensure();
        return instance;
      }
    }
  };

  window.HomescreenLauncher = HomescreenLauncher;
}(this));
