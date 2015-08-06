/**
 * Root panel.
 * 
 * @module RootPanel
 * @return {Object}
 */
define([
  'panels',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(panels, SettingsListener, SettingsHelper) {
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

      this.observers();
      this.events();
    },

    events: function() {
      panels.registerEvents([this.panel]);

      // Reset launch flag when app is not active.
      window.addEventListener('blur', function() {
        SettingsHelper('privacypanel.launched.by.settings').set(false);
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
      SettingsListener.observe('privacypanel.launched.by.settings', false,
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

  return new RootPanel();

});
