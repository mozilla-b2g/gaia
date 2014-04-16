'use strict';
/* global Icon */

(function(exports) {

  function ApplicationSource() {
    this.entries = [];
    this.entriesByManifestUrl = {};
  }

  ApplicationSource.prototype = {

    itemPosition: 0,

    /**
     * Populates the initial applicaiton data from mozApps.
     */
    populate: function(success) {
      navigator.mozApps.mgmt.getAll().onsuccess = function(event) {
        for (var i = 0, iLen = event.target.result.length; i < iLen; i++) {
          this.makeIcons(event.target.result[i]);
        }
        success(this.entries);
      }.bind(this);
    },

    /**
     * Creates entries for an app based on hidden roles and entry points.
     */
    makeIcons: function(eachApp) {
      if (app.HIDDEN_ROLES.indexOf(eachApp.manifest.role) !== -1) {
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

      if (eachApp.manifest.entry_points) {
        for (var i in eachApp.manifest.entry_points) {
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
