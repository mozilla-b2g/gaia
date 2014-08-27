/* global Search, DataGridProvider, GaiaGrid, Promise */

(function() {

  'use strict';

  function LocalApps() {
    this.apps = {};
    this.appListing = [];
    this.blacklist;

    var mozApps = navigator.mozApps.mgmt;
    var self = this;

    mozApps.oninstall = function oninstall(e) {
      self.apps[e.application.manifestURL] = e.application;
    };

    mozApps.onuninstall = function oninstall(e) {
      delete self.apps[e.application.manifestURL];
    };

    mozApps.getAll().onsuccess = function r_getApps(e) {
      e.target.result.forEach(function r_AppsForEach(app) {
        self.apps[app.manifestURL] = app;
      });
      self.createBlacklist().then(() => {
        self.createAppListing();
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
        var manifest = app.manifest;

        var HIDDEN_ROLES = ['system', 'input', 'homescreen', 'search'];
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

    find: function(query) {
      var results = [];

      this.appListing.forEach(function(manifest) {
        if (manifest.name.toLowerCase().indexOf(query.toLowerCase()) != -1) {
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
