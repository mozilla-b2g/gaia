/* global Search, DataGridProvider, GaiaGrid, Promise */

(function() {

  'use strict';

  function LocalApps() {
    this.apps = {};

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
    };
  }

  LocalApps.prototype = {

    __proto__: DataGridProvider.prototype,

    name: 'LocalApps',

    dedupes: true,
    dedupeStrategy: 'exact',

    search: function(input) {
      return new Promise((resolve, reject) => {
        this.getBlacklist().then((blacklist) => {
          var results = this.find(input);
          var formatted = [];
          results.forEach(function eachResult(result) {
            for (var i in blacklist) {
              if (blacklist[i] === result.launch_path) {
                return;
              }
            }
            formatted.push({
              dedupeId: result.app.manifestURL,
              data: new GaiaGrid.Mozapp(result.app, result.entryPoint)
            });
          }, this);

          resolve(formatted);
        });
      });
    },

    getBlacklist: function() {
      return new Promise((resolve, reject) => {
        var launchPathBlacklist = [];

        if (navigator.mozSettings) {
          var key = 'app.launch_path.blacklist';
          var req = navigator.mozSettings.createLock().get(key);
          req.onsuccess = function onsuccess() {
            launchPathBlacklist = req.result[key] || [];
            resolve(launchPathBlacklist);
          };
        } else {
          resolve(launchPathBlacklist);
        }
      });
    },

    find: function(query) {
      var results = [];

      // Create a list of manifestURLs for apps with names which match the query
      var manifestURLs = Object.keys(this.apps);
      manifestURLs.forEach(function eachManifest(manifestURL) {

        var app = this.apps[manifestURL];
        var manifest = app.manifest;

        var HIDDEN_ROLES = ['system', 'input', 'homescreen', 'search'];
        if (HIDDEN_ROLES.indexOf(manifest.role) !== -1) {
          return;
        }

        var appListing = [];
        var entryPoints = manifest.entry_points;

        if (entryPoints) {
          for (var i in entryPoints) {
            var entry = entryPoints[i];
            entry.entryPoint = i;
            appListing.push(entry);
          }
        } else {
          appListing.push(manifest);
        }

        appListing.forEach(function(manifest) {
          if (manifest.name.toLowerCase().indexOf(query.toLowerCase()) != -1) {
            results.push({
              app: app,
              entryPoint: manifest.entryPoint,
              launch_path: manifest.launch_path
            });
          }
        });
      }, this);

      return results;
    }
  };

  Search.provider(new LocalApps());

}());
