(function() {

  'use strict';

  function LocalApps() {
    this.name = 'LocalApps';

    this.apps = {};
    navigator.mozApps.mgmt.getAll().onsuccess = (function(evt) {
      evt.target.result.forEach(function r_getApps(app) {
        this.apps[app.manifestURL] = app;
      }, this);
    }).bind(this);
  }

  LocalApps.prototype = {

    __proto__: Provider.prototype,

    click: function(target) {
      var manifestURL = target.getAttribute('data-manifest');
      if (manifestURL && this.apps[manifestURL]) {
        Search.close();
        this.apps[manifestURL].launch(
          target.getAttribute('data-entry-point')
        );
      }
    },

    search: function(input) {
      this.results = document.createElement('section');
      Search.suggestions.appendChild(this.results);

      var results = this.find(input);
      results.forEach(function eachResult(result) {
        var div = document.createElement('div');
        div.className = 'result';
        div.dataset.provider = this.name;
        div.dataset.manifest = result.manifestURL;

        if (result.entryPoint) {
          div.dataset.entryPoint = result.entryPoint;
        }

        div.textContent = result.manifest.name;
        this.results.appendChild(div);
      }, this);
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
        }
        appListing.push(manifest);

        appListing.forEach(function(manifest) {
          if (manifest.name.toLowerCase().indexOf(query.toLowerCase()) != -1 &&
              !entryPoints) {
            results.push({
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
