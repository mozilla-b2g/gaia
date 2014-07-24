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
    this.ready = false;
    this.gridItemsByIdentifier = {};
    this.recordsByManifestUrl = {};
    this.recordsByBookmarkUrl = {};
  }

  HomeIcons.prototype = {
    init: function init(force) {
      // first init call or forcing new init
      if (!initPromise || force) {
        initPromise =
          Promise.all([this.collectBookmarkURLs(), this.collectManifestURLs()])
                 .then(() => this.ready = true);
      }

      return initPromise;
    },

    collectBookmarkURLs: function collectBookmarkURLs() {
     return new Promise((resolve) => {
        BookmarksDatabase.getAll().then((systemBookmarks) => {
         for (var id in systemBookmarks) {
          this.processBookmark(systemBookmarks[id]);
         }
         resolve();
       });
      });
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
      var features = {
        isEditable: false,
        search: true
      };
      var bookmark = new GaiaGrid.Bookmark(eachBookmark, features);
      this.gridItemsByIdentifier[bookmark.identifier] = bookmark;
      this.recordsByBookmarkUrl[eachBookmark.bookmarkURL] = eachBookmark;
    },

    processMozApp: function(eachApp) {
      var manifest = eachApp.manifest || eachApp.updateManifest;
      var features = {
        isRemovable: true
      };

      if (HIDDEN_ROLES.indexOf(manifest.role) !== -1) {
        return;
      }

      function eachIcon(icon) {
        /* jshint validthis:true */

        // If there is no icon entry, do not push it onto items.
        if (!icon.icon) {
          return;
        }
        icon.isRemovable = () => true;
        this.gridItemsByIdentifier[icon.identifier] = icon;
      }

      this.recordsByManifestUrl[eachApp.manifestURL] = eachApp;

      if (manifest.entry_points) {
        for (var i in manifest.entry_points) {
          eachIcon.call(this, new GaiaGrid.Mozapp(eachApp, i, features));
        }
      } else {
        eachIcon.call(this, new GaiaGrid.Mozapp(eachApp, undefined, features));
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

  exports.HomeIcons = new HomeIcons();

}(window));
