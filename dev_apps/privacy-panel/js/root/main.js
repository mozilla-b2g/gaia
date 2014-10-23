(function() {
  'use strict';

  function PanelRoot() {}

  PanelRoot.prototype = {

    /**
     * Initialize Root panel
     * 
     * @method init
     * @constructor
     */
    init: function() {
      this.panel = document.getElementById('root');
      this.backBtn = this.panel.querySelector('#back-to-settings');

      this.settingsApp = null;
      this.settingsManifestURL = document.location.protocol +
        '//settings.gaiamobile.org' + (location.port ? (':' +
        location.port) : '') + '/manifest.webapp';

      this.observers();
      this.events();
    },

    events: function() {
      window.pp.panel.registerEvents([this.panel]);

      // Reset launch flag when app is not active.
      window.addEventListener('blur', function() {
        window.SettingsHelper('pp.launched.by.settings').set(false);
      });

      this.backBtn.addEventListener('click', function(event) {
        event.preventDefault();
        this.getSettingsApp().then(function(app) {
          app.launch();
        });
      }.bind(this));
    },

    observers: function() {
      // Observe 'privacy-panel.launched-by-settings' setting to be able to
      // detect launching point.
      window.SettingsListener.observe('pp.launched.by.settings', false,
        function(value) {
          this.panel.dataset.settings = value;
        }.bind(this)
      );
    },

    searchApp: function(appURL, callback) {
      navigator.mozApps.mgmt.getAll().onsuccess = function gotApps(evt) {
        var app = null, apps = evt.target.result;
        for (var i = 0; i < apps.length && app === null; i++) {
          if (apps[i].manifestURL === appURL) {
            app = apps[i];
            return callback(app);
          }
        }
      };
    },

    getSettingsApp: function() {
      var promise = new Promise(function(resolve) {
        if (this.settingsApp) {
          resolve(this.settingApp);
        } else {
          this.searchApp(this.settingsManifestURL, function(app) {
            resolve(app);
          });
        }
      }.bind(this));

      return promise;
    }

  };

  window.pp = window.pp || {};
  window.pp.root = new PanelRoot();
})();
