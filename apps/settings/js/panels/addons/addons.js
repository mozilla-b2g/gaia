define(function(require) {
  'use strict';

  var AppsCache = require('modules/apps_cache');
  var ManifestHelper = require('shared/manifest_helper');
  var ListView = require('modules/mvvm/list_view');
  var template = require('./layout_template');

  var Addons = function() {
    return {
      _container: null,
      _addons: [],

      onInit: function(panel) {
        this._container = panel.querySelector('.addon-list');
        this._settings = navigator.mozSettings;
      },

      onBeforeShow: function() {
        this._addons = [];
        this.getInstalledAddons(this.toggleAddon);
        navigator.mozApps.mgmt.addEventListener('enabledstatechange',
                                                this.stateChanged.bind(this));
      },

      toggleAddon: function(addon, checked) {
        navigator.mozApps.mgmt.setEnabled(addon.app, checked);
      },

      stateChanged: function(evt) {
        // Find the toggle for this manifest url, and update its state.
        var rule = 'input[value="' + evt.application.manifestURL + '"]'
        var node = this._container.querySelector(rule);
        if (node && node.checked !== evt.application.enabled) {
          node.checked = evt.application.enabled;
        }
      },

      getInstalledAddons: function(callback) {
        AppsCache.apps().then(function(apps) {
          apps = apps.filter(function(app) {
            var manifest = app.manifest || app.updateManifest;
            return manifest && manifest.role && manifest.role === 'addon';
          });

          for (var app in apps) {
            var manifest = new ManifestHelper(apps[app].manifest);
            var addon = {
              'name': manifest.name,
              'manifestURL': apps[app].manifestURL,
              'onclick': callback.bind(this),
              'enabled': apps[app].enabled,
              'app': apps[app]
            };
            this._addons.push(addon);
          }

          this._addons.sort(function(a, b) {
            return a.name.localeCompare(b.name);
          });

          this._listView = ListView(this._container, this._addons, template);
        }.bind(this));
      }
    };
  };
  return Addons;
});
