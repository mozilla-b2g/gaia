/* global Dedupe, Provider, Search, UrlHelper */

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

    __proto__: Provider.prototype,

    name: 'LocalApps',

    click: function(e) {
      var target = e.target;

      var manifestURL = target.dataset.manifest;
      if (manifestURL && this.apps[manifestURL]) {
        if (target.dataset.entryPoint) {
          this.apps[manifestURL].launch(
            target.dataset.entryPoint
          );
        } else {
          this.apps[manifestURL].launch();
        }
      }
    },

    search: function(input) {
      this.clear();

      var results = this.find(input);
      var formatted = [];

      Dedupe.reset();
      Dedupe.add({
        key: 'manifestURL',
        objects: results
      });

      results.forEach(function eachResult(result) {
        var dataset = {
          manifest: result.manifestURL
        };

        if (result.entryPoint) {
          dataset.entryPoint = result.entryPoint;
        }

        var icons = result.manifest.icons || {};
        var imgUrl = '';
        for (var i in icons) {
          var eachUrl = icons[i];
          if (UrlHelper.hasScheme(eachUrl)) {
            imgUrl = eachUrl;
          } else {
            // For relative URLs
            var a = document.createElement('a');
            a.href = result.origin;
            imgUrl = a.protocol + '//' + a.host + eachUrl;
          }
        }

        // Only display results which have icons.
        if (!imgUrl) {
          return;
        }

        formatted.push({
          title: result.manifest.name,
          icon: imgUrl,
          dataset: dataset
        });
      }, this);
      this.render(formatted);
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
              origin: app.origin,
              manifestURL: manifestURL,
              app: app,
              manifest: manifest,
              entryPoint: manifest.entryPoint
            });
          }
        });
      }, this);

      return results;
    }
  };

  Search.provider(new LocalApps());

}());
