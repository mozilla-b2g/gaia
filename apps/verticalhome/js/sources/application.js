'use strict';
/* global GaiaGrid, configurator */

(function(exports) {

  /**
   * ApplicationSource is responsible for populating the iniial application
   * results as well as mapping indexedDB records to app objects for launching.
   * @param {Object} store The backing database store class.
   */
  function ApplicationSource(store) {
    this.store = store;
    this.entries = [];
    this.entriesByManifestUrl = {};
    this.svPreviouslyInstalledApps = [];
    // Store the pending apps to be installed until SingleVariant conf is loaded
    var pendingInstallRequests = [];

    function addSVEventListener() {
      window.addEventListener('singlevariant-ready', function svFileReady(ev) {
        window.removeEventListener('singlevariant-ready', svFileReady);
        for (var i = 0; i < pendingInstallRequests; i++) {
          pendingInstallRequests[i]();
        }
      });
    }

    addSVEventListener();

    var appMgr = navigator.mozApps.mgmt;

    appMgr.getAll().onsuccess = function onsuccess(event) {
      for (var i = 0, iLen = event.target.result.length; i < iLen; i++) {
        this.makeIcons(event.target.result[i]);
      }
    }.bind(this);

    /**
     * Adds a new application to the layout when the user installed it
     * from market
     *
     * @param {Application} application - The application object
     */
    function install(application) {
      /* jshint validthis: true */

      var manifest = application.manifest || application.updateManifest;
      if (manifest.role && app.HIDDEN_ROLES.indexOf(manifest.role) !== -1) {
        return;
      }

      // There is a last divider that is always in the list, but not rendered
      // unless in edit mode.
      // Remove this divider, append the app, then re-append the divider.
      var lastDivider = app.grid.removeUntilDivider();
      this.addIconToGrid(application);
      var svApp = configurator.getSingleVariantApp(application.manifestURL);
      var lastElem = app.grid.getIndexLastIcon();
      if (configurator.isSimPresentOnFirstBoot && svApp &&
          svApp.location < lastElem &&
          !this.isPreviouslyInstalled(application.manifestURL)) {
        app.grid.removeNonVisualElements();
        lastElem = app.grid.getIndexLastIcon();
        app.grid.moveTo(lastElem, svApp.location);
        _moveAhead(svApp.location + 1);
        this.addPreviouslyInstalledSvApp(application.manifestURL);
        app.itemStore.savePrevInstalledSvApp(this.svPreviouslyInstalledApps);
      }
      app.grid.add(lastDivider);

      app.grid.render();
      app.itemStore.save(app.grid.getItems());
    }

    /**
     * Goes through all the items in the grid from startPos.
     * If it finds one whose desired position is lower than it's current
     * position then it'll switch it with the item ahead of it on the list
     * (it'll move ahead one position).
     * This is a auxiliary function, if the grid configuration is correct,
     * it'll be sorted after the last item is inserted, although at intermediate
     * steps it can and will be incorrectly sorted.
     * @param {number} startPos - Starting position
     */
    function _moveAhead(startPos) {
      var elems = app.grid.getItems();
      for (var i = startPos, iLen = elems.length; i < iLen; i++) {
        var item = elems[i];
        //At the moment SV only configures apps
        if (item instanceof GaiaGrid.Mozapp) {
          //elems[i].identifier returns manifestURL IDENTIFIER_SEP entry_point
          var svApp = configurator.getSingleVariantApp(elems[i].identifier);
          if (svApp && i > svApp.location) {
            app.grid.moveTo(i, i - 1);
          }
        }
      }
    }

    appMgr.oninstall = function oninstall(event) {
      if (configurator.isSingleVariantReady) {
        install.bind(this)(event.application);
      } else {
        pendingInstallRequests.push(install.bind(this, event.application));
      }
    }.bind(this);

    appMgr.onuninstall = function onuninstall(event) {
      this.removeIconFromGrid(event.application.manifestURL);
      app.itemStore.save(app.grid.getItems());
    }.bind(this);

  }

  ApplicationSource.prototype = {

    /**
     * Synchronizes our local result set with mozApps.
     */
    synchronize: function() {
      var storeItems = this.store._allItems;
      var toAdd = [];

      var appIconsByManifestUrl = {};
      for (var i = 0, iLen = storeItems.length; i < iLen; i++) {
        var item = storeItems[i];
        if (!(item instanceof GaiaGrid.Mozapp)) {
          continue;
        }
        appIconsByManifestUrl[item.detail.manifestURL] = item;
      }

      for (i = 0, iLen = this.entries.length; i < iLen; i++) {
        var entry = this.entries[i];
        if (!appIconsByManifestUrl[entry.detail.manifestURL] &&
            !entry.app.manifest.entry_points) {
          toAdd.push(entry);
        } else {
          delete appIconsByManifestUrl[entry.detail.manifestURL];
        }
      }

      // Check for icons we need to delete
      for (i in appIconsByManifestUrl) {
        this.removeIconFromGrid(i);
      }

      toAdd.forEach(function _toAdd(newApp) {
        this.addIconToGrid(newApp.app);
      }, this);

      app.itemStore.save(app.grid.getItems());
    },

    /**
     * Adds a new icon to the grid
     */
    addIconToGrid: function(application) {
      this.makeIcons(application);
      var appObject = this.mapToApp({
        manifestURL: application.manifestURL
      });
      app.grid.add(appObject);
      app.grid.render();
    },

    /**
     * Removes an icon from the grid.
     * @param {String} manifestURL
     */
    removeIconFromGrid: function(manifestURL) {
      var icons = app.grid.getIcons();
      var appObject = icons[manifestURL];
      app.grid.removeIconByIdentifier(manifestURL);

      var items = app.grid.getItems();
      var itemIndex = items.indexOf(appObject);
      app.grid.removeItemByIndex(itemIndex);
      app.grid.render();

      if (appObject && appObject.element) {
        appObject.element.parentNode.removeChild(appObject.element);
      }
    },

    /**
     * Populates the initial application data from mozApps.
     * @param {Function} success Called after we fetch all initial data.
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
        icon.setPosition(this.store.getNextPosition());
        this.entries.push(icon);
      }

      this.entriesByManifestUrl[eachApp.manifestURL] = eachApp;

      if (manifest.entry_points) {
        for (var i in manifest.entry_points) {
          eachIcon.call(this, new GaiaGrid.Mozapp(eachApp, i));
        }
      } else {
        eachIcon.call(this, new GaiaGrid.Mozapp(eachApp));
      }
    },

    /**
     * Maps a database entry to a mozApps application
     */
    mapToApp: function(entry) {
      // Handle non app objects for applications which exist in our local store
      // but not mozApps.
      var app = this.entriesByManifestUrl[entry.manifestURL];
      app = app || {
        manifestURL: entry.manifestURL,
        manifest: {
          name: '',
          icons: []
        }
      };

      return new GaiaGrid.Mozapp(app, entry.entryPoint, {
        // cached icon blob in case of network failures
        defaultIconBlob: entry.defaultIconBlob
      });
    },

    /**
     * Add a reference to singleVariant app previously installed
     */
    addPreviouslyInstalledSvApp: function(manifest) {
      this.svPreviouslyInstalledApps.push({manifestURL: manifest});
    },

    /*
     * Return true if manifest is in the array of installed singleVariant apps,
     * false otherwise
     * @param {string} app's manifest consulted
     */
    isPreviouslyInstalled: function(manifest) {
      for (var i = 0, elemNum = this.svPreviouslyInstalledApps.length;
           i < elemNum; i++) {
        if (this.svPreviouslyInstalledApps[i].manifestURL === manifest) {
          return true;
        }
      }
      return false;
    }

  };

  exports.ApplicationSource = ApplicationSource;

}(window));
