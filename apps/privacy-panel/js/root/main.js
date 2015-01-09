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
     window.addEventListener('blur', () => {
      // If users click on `home` button to go back to desktop,
      // we have to cleanupSettingsMark(). While on the other hand,
      // if we click back button to jump back to Settings app,
      // we should cleanupSettingsMark() before jumping back.
      if (!this._jumpBackToSettingsApp) {
        this.cleanupSettingsMark();
      }
      this._jumpBackToSettingsApp = false;
     });

     this.backBtn.addEventListener('click', (event) => {
       this._jumpBackToSettingsApp = true;

       event.preventDefault();
       // We have to make sure settings key is cleaned up before jumping
       // back to settings app
       this.getSettingsApp().then((app) => {
         this.cleanupSettingsMark().then(() => {
           app.launch();
         });
       });
      });
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
    },

    cleanupSettingsMark: function() {
      var promise = new Promise(function(resolve) {
        SettingsHelper('privacypanel.launched.by.settings').set(false, () => {
          resolve();
        });
      });
      return promise;
    }
  };
  return new RootPanel();
});
