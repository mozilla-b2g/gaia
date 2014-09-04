'use strict';
/* globals Promise, AppWindowManager, asyncStorage */
/* exported Places */

(function(exports) {

  /**
   * Places is the browser history, bookmark and icon management system for
   * B2G. Places monitors app events and syncs information with the Places
   * datastore for consumption by apps like Search.
   * @requires AppWindowManager
   * @class Places
   */
  function Places() {}

  Places.prototype = {

    /**
     * The places store name.
     * @memberof Places.prototype
     * @type {String}
     */
    STORE_NAME: 'places',

    /**
     * A reference to the places datastore.
     * @memberof Places.prototype
     * @type {Object}
     */
    dataStore: null,

    /**
     * Set when we are editing a place record in the datastore.
     * @memberof Places.prototype
     * @type {Boolean}
     */
    writeInProgress: false,

    /**
     * A queue of screenshot URLs that we are loading.
     * @memberof Places.prototype
     * @type {Array}
     */
    screenshotQueue: [],

    /**
     * Maximum number of top sites we display
     * @memberof Places.prototype
     * @type {Integer}
     */
    MAX_TOP_SITES: 6,

    topSites: [],

    /**
     * Starts places.
     * Adds necessary event listeners and gets the datastore.
     * @param {Function} callback
     * @memberof Places.prototype
     */
    start: function() {
      return new Promise(resolve => {
        window.addEventListener('apptitlechange', this);
        window.addEventListener('applocationchange', this);
        window.addEventListener('appiconchange', this);
        window.addEventListener('apploaded', this);

        asyncStorage.getItem('top-sites', results => {
          this.topSites = results || [];
          resolve();
        });
      });
    },

    getStore: function() {
      return new Promise(resolve => {
        if (this.dataStore) {
          return resolve(this.dataStore);
        }
        navigator.getDataStores(this.STORE_NAME).then(stores => {
          this.dataStore = stores[0];
          return resolve(this.dataStore);
        });
      });
    },

    /**
     * General event handler interface.
     * @param {Event} evt The event.
     * @memberof Places.prototype
     */
    handleEvent: function(evt) {
      var app = evt.detail;
      switch (evt.type) {
      case 'apptitlechange':
        this.setPlaceTitle(app.config.url, app.title);
        break;
      case 'applocationchange':
        this.addVisit(app.config.url);
        break;
      case 'appiconchange':
        this.addPlaceIcons(app.config.url, app.favicons);
        break;
      case 'apploaded':
        var index = this.screenshotQueue.indexOf(app.config.url);
        if (index !== -1) {
          this.screenshotRequested(app.config.url);
          this.screenshotQueue.splice(index, 1);
        }
        break;
      }
    },

    /**
     * Requests a screenshot of a URL.
     * @param {String} url The URL of a page.
     * @memberof Places.prototype
     */
    screenshotRequested: function(url) {
      var self = this;
      var app = AppWindowManager.getApp(url);
      if (!app) {
        return false;
      }
      if (app.loading) {
        this.screenshotQueue.push(url);
        return;
      }
      app.getScreenshot(function(screenshot) {
        if (screenshot) {
          self.saveScreenshot(url, screenshot);
        }
      });
    },

    /**
     * Formats a URL as a place object.
     * @param {String} url The URL of a place.
     * @return {Object}
     * @memberof Places.prototype
     */
    defaultPlace: function(url) {
      return {
        url: url,
        title: url,
        icons: {},
        frecency: 0,
        // An array containing previous visits to this url
        visits: [],
        screenshot: null
      };
    },

    /**
     * Helper function to edit a place record in the datastore.
     * @param {String} url The URL of a place.
     * @param {Function} fun Handles place updates.
     * @memberof Places.prototype
     */
    editPlace: function(url, fun) {
      return new Promise(resolve => {
        this.getStore().then(store => {
          var rev = store.revisionId;
          store.get(url).then(place => {
            place = place || this.defaultPlace(url);
            fun(place, newPlace => {
              if (this.writeInProgress || store.revisionId !== rev) {
                return this.editPlace(url, fun);
              }
              this.writeInProgress = true;
              store.put(newPlace, url).then(() => {
                this.writeInProgress = false;
                resolve();
              });
            });
          });
        });
      });
    },

    /**
     * Add visit.
     *
     * Record visit to place. Currently this just increments frecency, but
     * eventually there should be a separate 'visits' DataStore to store a
     * record for every visit in order to render a history view.
     *
     * @param {String} url URL of visit to record.
     * @memberof Places.prototype
     */
    addVisit: function(url) {
      return this.editPlace(url, (place, cb) => {
        place.visited = Date.now();
        place.frecency++;
        place = this.addToVisited(place);
        this.checkTopSites(place);
        cb(place);
      });
    },

    /**
     * Manually set the previous visits array of timestamps, used for
     * migrations
     */
    setVisits: function(url, visits) {
      return this.editPlace(url, (place, cb) => {
        place.visits = place.visits || [];
        place.visits.concat(visits);
        place.visits.sort((a, b) => { return b - a; });
        cb(place);
      });
    },

    /*
     * Add a recorded visit to the history, we prune them to the last
     * TRUNCATE_VISITS number of visits and store them in a low enough
     * resolution to render the view (one per day)
     */
    TRUNCATE_VISITS: 10,

    addToVisited: function(place) {

      place.visits = place.visits || [];

      if (!place.visits.length) {
        place.visits.unshift(place.visited);
        return place;
      }

      // If the last visit was within the last 24 hours, remove
      // it as we only need a resolution of one day
      var lastVisit = place.visits[0];
      if (lastVisit > (Date.now() - 60 * 60 * 24 * 1000)) {
        place.visits.shift();
      }

      place.visits.unshift(place.visited);

      if (place.visits.length > this.TRUNCATE_VISITS) {
        place.visits.length = this.TRUNCATE_VISITS;
      }

      return place;
    },

    /**
     * Check if we need to render a screenshot of the current visit
     * in the case that it is in the top most visited sites
     */
    checkTopSites: function(place) {
      var numTopSites = this.topSites.length;
      var lastTopSite = this.topSites[numTopSites - 1];
      if (numTopSites < this.MAX_TOP_SITES ||
          place.frecency > lastTopSite.frecency) {
        this.topSites.push(place);
        this.screenshotRequested(place.url);
        this.topSites.sort(function(a, b) {
          return b.frecency - a.frecency;
        });
        if (this.topSites.length > this.MAX_TOP_SITES) {
          this.topSites.length = this.MAX_TOP_SITES;
        }
        asyncStorage.setItem('top-sites', this.topSites);
      }
    },

    saveScreenshot: function(url, screenshot) {
      return this.editPlace(url, function(place, cb) {
        place.screenshot = screenshot;
        cb(place);
      });
    },

    /**
     * Clear all the visits in the store.
     * @memberof Places.prototype
     */
    clear: function() {
      return this.getStore().then(store => { store.clear(); });
    },

    /**
     * Set place title.
     *
     * @param {String} url URL of place to update.
     * @param {String} title Title of place to set.
     * @memberof Places.prototype
     */
    setPlaceTitle: function(url, title) {
      return this.editPlace(url, function(place, cb) {
        place.title = title;
        cb(place);
      });
    },

    /**
     * Set place icon.
     *
     * @param {String} url URL of place to update.
     * @param {String} icon The icon object
     * @memberof Places.prototype
     */
    addPlaceIcons: function(url, icons) {
      return this.editPlace(url, (place, cb) => {
        for (var iconUri in icons) {
          place.icons[iconUri] = icons[iconUri];
        }
        cb(place);
      });
    }
  };

  exports.Places = Places;

}(window));
