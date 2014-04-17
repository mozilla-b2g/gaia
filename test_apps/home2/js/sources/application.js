'use strict';
/* global Icon */

(function(exports) {

  function ApplicationSource() {
    this.entries = [];
    this.entriesByManifestUrl = {};

    var appMgr = navigator.mozApps.mgmt;

    appMgr.getAll().onsuccess = function onsuccess(event) {
      for (var i = 0, iLen = event.target.result.length; i < iLen; i++) {
        this.makeIcons(event.target.result[i]);
      }
    }.bind(this);

    appMgr.oninstall = function oninstall(event) {
      this.makeIcons(event.application);

      var appObject = this.mapToApp({
        manifestURL: event.application.manifestURL
      });
      app.icons[appObject.identifier] = appObject;
      app.items.push(appObject);
      app.render();
      app.itemStore.save(app.items);
    }.bind(this);

    appMgr.onuninstall = function onuninstall(event) {
      var appObject = app.icons[event.application.origin];
      delete app.icons[appObject.identifier];
      app.items.splice(appObject.index, 1);
      app.itemStore.save(app.items);
    };

  }

  ApplicationSource.prototype = {

    itemPosition: 0,

    /**
     * Populates the initial application data from mozApps.
     */
    populate: function(success) {
      success(this.entries);
    },

    /**
     * Creates entries for an app based on hidden roles and entry points.
     */
    makeIcons: function(eachApp) {
      var manifest = eachApp.manifest || eachApp.updateManifest;

      if (app.HIDDEN_ROLES.indexOf(manifest.role) !== -1) {
        return;
      }

      function eachIcon(icon) {
        /* jshint validthis:true */

        // If there is no icon entry, do not push it onto items.
        if (!icon.icon) {
          return;
        }

        icon.setPosition(this.itemPosition);
        this.itemPosition++;

        this.entries.push(icon);
      }

      this.entriesByManifestUrl[eachApp.manifestURL] = eachApp;

      if (manifest.entry_points) {
        for (var i in manifest.entry_points) {
          eachIcon.call(this, new Icon(eachApp, i));
        }
      } else {
        eachIcon.call(this, new Icon(eachApp));
      }
    },

    /**
     * Maps a database entry to a mozApps application
     */
    mapToApp: function(entry) {
      return new Icon(this.entriesByManifestUrl[entry.manifestURL],
        entry.entryPoint);
    }

  };

  exports.ApplicationSource = ApplicationSource;

}(window));
