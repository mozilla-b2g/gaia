/* global Search, DataGridProvider, GaiaGrid, Promise */

(function() {

  'use strict';

  function LocalApps() {
    this.apps = {};
    this.appListing = [];
    this.blacklist;

    var mozApps = navigator.mozApps.mgmt;

    mozApps.oninstall = e => {
      var app = e.application;
      var processApp = () => {
        this.apps[app.manifestURL] = app;
        this.createAppListing();
      };

      if (app.downloading) {
        app.ondownloadapplied = processApp;
      } else {
        processApp();
      }
    };

    mozApps.onuninstall = e => {
      delete this.apps[e.application.manifestURL];
      this.createAppListing();
    };

    mozApps.getAll().onsuccess = e => {
      e.target.result.forEach(app => {
        this.apps[app.manifestURL] = app;
      });
      this.createBlacklist().then(() => {
        this.createAppListing();
      });
    };
  }

  LocalApps.prototype = {

    __proto__: DataGridProvider.prototype,

    name: 'LocalApps',

    dedupes: true,
    dedupeStrategy: 'exact',

    createBlacklist: function() {
      return new Promise((resolve, reject) => {
        var self = this;
        var key = 'app.launch_path.blacklist';
        var req = navigator.mozSettings.createLock().get(key);
        req.onsuccess = function onsuccess() {
          self.blacklist = req.result[key] || [];
          resolve();
        };
      });
    },

    createAppListing: function() {
      var appListing = [];
      var blacklist = this.blacklist;

      var manifestURLs = Object.keys(this.apps);

      manifestURLs.forEach(function eachManifest(manifestURL) {
        var app = this.apps[manifestURL];
        var manifest = app.manifest || app.updateManifest;

        var HIDDEN_ROLES = [
          'system', 'input', 'homescreen', 'search', 'addon', 'langpack'
        ];
        if (HIDDEN_ROLES.indexOf(manifest.role) !== -1) {
          return;
        }

        var entryPoints = manifest.entry_points;
        if (entryPoints) {
          for (var i in entryPoints) {
            var entry = entryPoints[i];
            entry.entryPoint = i;
            entry.manifestURL = app.manifestURL;
            appListing.push(entry);
          }
        } else {
          manifest.manifestURL = app.manifestURL;
          appListing.push(manifest);
        }

        if (blacklist) {
          blacklist.forEach(function(blackentry) {
            for (var i in appListing) {
              var app = appListing[i];
              if (app.launch_path === blackentry) {
                appListing.splice(i, 1);
              }
            }
          });
        }
      }, this);

      this.appListing = appListing;
    },

    removeAppListing: function(app) {
      for (var i in this.appListing) {
        var manifest = this.appListing[i];
        if (manifest.manifestURL === app.manifestURL) {
          this.appListing.splice(i, 1);
        }
      }
    },

    search: function(input) {
      return new Promise((resolve, reject) => {
        var results = this.find(input);
        var formatted = [];

        results.forEach(function eachResult(result) {
          formatted.push({
            dedupeId: result.app.manifestURL,
            data: new GaiaGrid.Mozapp(result.app, result.entryPoint)
          });
        }, this);

        resolve(formatted);
      });
    },

    /**
     * Checks if an app manifest matches a query.
     */
    matches: function(manifest, query) {
      query = query.toLowerCase();

      // Get the localized name from the query.
      var shortName = manifest.short_name || '';
      var userLang = document.documentElement.lang;
      var locales = manifest.locales;
      var localized = locales && locales[userLang] && locales[userLang].name;
      localized = localized || '';

      return shortName.toLowerCase().indexOf(query) != -1 ||
        manifest.name.toLowerCase().indexOf(query) != -1 ||
        localized.toLowerCase().indexOf(query) != -1;
    },

    find: function(query) {
      var results = [];
      this.appListing.forEach(function(manifest) {
        if (this.matches(manifest, query)) {
          results.push({
            app: this.apps[manifest.manifestURL],
            entryPoint: manifest.entryPoint
          });
        }
      }, this);

      return results;
    }
  };

  Search.provider(new LocalApps());

}());
