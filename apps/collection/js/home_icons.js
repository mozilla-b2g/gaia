'use strict';
/* global Promise */
/* global GaiaGrid */
/* global BookmarksDatabase */

(function(exports) {
  /*
    Manages apps and bookmarks that are visible on the homescreen
   */

  // Hidden manifest roles that we do not show
  const HIDDEN_ROLES = ['system', 'input', 'homescreen', 'search'];

  var appMgr = navigator.mozApps.mgmt;
  var initPromise;

  function HomeIcons() {
    this.gridItemsByIdentifier = {};
    this.recordsByManifestUrl = {};
    this.recordsByBookmarkUrl = {};
  }

  HomeIcons.prototype = {
    init: function init() {
      initPromise = Promise.all([this.collectBookmarkURLs(),
                                 this.collectManifestURLs()]);

      this.init = function noop() {
        return initPromise;
      };

      return initPromise;
    },

    collectBookmarkURLs: function collectBookmarkURLs() {
     return BookmarksDatabase.getAll().then(function success(systemBookmarks) {
       for (var id in systemBookmarks) {
        this.processBookmark(systemBookmarks[id]);
       }
     }.bind(this));
    },

    collectManifestURLs: function collectManifestURLs() {
      return new Promise(function ready(resolve) {
        appMgr.getAll().onsuccess = function onsuccess(event) {
          for (var i = 0, iLen = event.target.result.length; i < iLen; i++) {
            this.processMozApp(event.target.result[i]);
          }
          resolve();
        }.bind(this);

      }.bind(this));
    },

    processBookmark: function(eachBookmark) {
      var bookmark = new GaiaGrid.Bookmark(eachBookmark);
      this.gridItemsByIdentifier[bookmark.identifier] = bookmark;
      this.recordsByBookmarkUrl[eachBookmark.bookmarkURL] = eachBookmark;
    },

    processMozApp: function(eachApp) {
      var manifest = eachApp.manifest || eachApp.updateManifest;

      if (HIDDEN_ROLES.indexOf(manifest.role) !== -1) {
        return;
      }

      function eachIcon(icon) {
        /* jshint validthis:true */

        // If there is no icon entry, do not push it onto items.
        if (!icon.icon) {
          return;
        }
        this.gridItemsByIdentifier[icon.identifier] = icon;
      }

      this.recordsByManifestUrl[eachApp.manifestURL] = eachApp;

      if (manifest.entry_points) {
        for (var i in manifest.entry_points) {
          eachIcon.call(this, new GaiaGrid.Mozapp(eachApp, i));
        }
      } else {
        eachIcon.call(this, new GaiaGrid.Mozapp(eachApp));
      }
    },

    get: function get(identifier) {
      return this.gridItemsByIdentifier[identifier];
    },

    getIdentifier: function getIdentifier(guid) {
      var gridItem = this.gridItemsByIdentifier[guid];
      return  gridItem ? gridItem.identifier : null;
    },

    get bookmarkURLs() {
      return Object.keys(this.recordsByBookmarkUrl);
    },

    get manifestURLs() {
      return Object.keys(this.recordsByManifestUrl);
    }

  };

  exports.HomeIcons = HomeIcons;

}(window));
