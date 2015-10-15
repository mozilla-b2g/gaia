/**
* Root panel.
*
* @module RootPanel
* @return {Object}
*/
define([
  'panels'
],

function(panels) {
  'use strict';

  function RootPanel() {}

  RootPanel.prototype = {

    /**
    * Initialize Root panel
    *
    * @method init
    * @constructor
    */
    init: function() {
      document.querySelector('body').dataset.ready = true;

      this.panel = document.getElementById('root');
      this.backBtn = this.panel.querySelector('#back-to-settings');

      this.settingsApp = null;
      this.settingsManifestURL = document.location.protocol +
      '//settings.gaiamobile.org' + (location.port ? (':' +
                       location.port) : '') + '/manifest.webapp';

      this.events();
    },

    events: function() {
      panels.registerEvents([this.panel]);

      this.backBtn.addEventListener('click', (event) => {
        event.preventDefault();
        // We have to make sure settings key is cleaned up before jumping
        // back to settings app
        this.getSettingsApp().then((app) => {
          app.launch();
        });
      });

      window.addEventListener('visibilitychange', () => {
        // If users click on `home` button to go back to desktop or to
        // open task manager we have to close the application
        window.close();
      });
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
    },
  };
  return new RootPanel();
});
