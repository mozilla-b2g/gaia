/**
 * ALA app list module.
 * 
 * @module AppList
 * @return {Object}
 */
define([],

function() {
  'use strict';

  function AppList() {
    this.mozApps = navigator.mozApps;
  }

  AppList.prototype = {

    get: function(filter, callback) {
      var list = [];

      callback = callback || function() {};
      this.mozApps.mgmt.getAll().onsuccess = function(event) {
        var apps = event.target.result;
        apps.forEach(function(app) {
          var manifest = app.manifest || app.updateManifest;
          if (manifest.permissions && manifest.permissions[filter]) {
            list.push(app);
          }
        });
        callback(list);
      };
    },

    icon: function(app) {
      var manifest = app.manifest || app.updateManifest;

      if (!manifest.icons || !Object.keys(manifest.icons).length) {
        return '../style/images/default.png';
      }

      // The preferred size is 30 by the default. If we use HDPI device, we may
      // use the image larger than 30 * 1.5 = 45 pixels.
      var preferredIconSize = 30 * (window.devicePixelRatio || 1);
      var preferredSize = Number.MAX_VALUE;
      var max = 0;

      for (var size in manifest.icons) {
        if (manifest.icons.hasOwnProperty(size)) {
          size = parseInt(size, 10);
          if (size > max) {
            max = size;
          }

          if (size >= preferredIconSize && size < preferredSize) {
            preferredSize = size;
          }
        }
      }
      // If there is an icon matching the preferred size, we return the result,
      // if there isn't, we will return the maximum available size.
      if (preferredSize === Number.MAX_VALUE) {
        preferredSize = max;
      }

      var url = manifest.icons[preferredSize];

      if (url) {
        return !(/^(http|https|data):/.test(url)) ? app.origin + url : url;
      } else {
        return '../style/images/default.png';
      }
    }
  };

  return new AppList();

});
