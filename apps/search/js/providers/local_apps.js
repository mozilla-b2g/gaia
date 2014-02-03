/* global Provider, Search */

(function() {

  'use strict';

  function LocalApps() {
    this.apps = {};
    navigator.mozApps.mgmt.getAll().onsuccess = (function(evt) {
      evt.target.result.forEach(function r_getApps(app) {
        this.apps[app.manifestURL] = app;
      }, this);
    }).bind(this);
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
          var a = document.createElement('a');
          a.href = result.origin;
          imgUrl = a.protocol + '//' + a.host + icons[i];
          break;
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
