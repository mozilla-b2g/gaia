(function(window) {
  var currentManifestURL = '';
  var instance = undefined;
  var _inited = false;

  var HomescreenLauncher = {
    ready: false,

    get origin() {
      // We don't really care the origin of homescreen,
      // and it may change when we swap the homescreen app.
      // So we use a fixed string here.
      // XXX: We shall change WindowManager to use manifestURL
      // to identify an app.
      // See http://bugzil.la/913323
      return 'homescreen';
    },

    init: function hl_init() {
      if (_inited)
        return;

      _inited = true;

      var self = this;
      if (Applications.ready) {
        this.fetchSettings();
      } else {
        window.addEventListener('applicationready', function onAppReady() {
          window.removeEventListener('applicationready', onAppReady);
          self.fetchSettings();
        });
      }

      window.addEventListener('trusteduishow', this);
      window.addEventListener('trusteduihide', this);
    },

    handleEvent: function hl_handleEvent(evt) {
      switch (evt.type) {
        case 'trusteduishow':
          this.getHomescreen().toggle(true);
          break;
        case 'trusteduihide':
          this.getHomescreen().toggle(false);
          break;
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
              instance.kill();
              instance = new HomescreenWindow(value);
              // Dispatch 'homescreen is changed' event.
              window.dispatchEvent(new CustomEvent('homescreen-changed'));
            } else {
              instance.ensure();
            }
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
