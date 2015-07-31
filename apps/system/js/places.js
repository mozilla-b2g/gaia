'use strict';
/* globals Promise, asyncStorage, Service, BaseModule */
/* exported Places */

(function() {

  const DEBOUNCE_TIME = 2000;

  const SCREENSHOT_TIMEOUT = 5000;

  /**
   * Places is the browser history, bookmark and icon management system for
   * B2G. Places monitors app events and syncs information with the Places
   * datastore for consumption by apps like Search.
   * @requires BaseModule
   * @class Places
   */
  function Places() {}
  Places.SUB_MODULES = [
    'BrowserSettings'
  ];
  Places.SERVICES = [
    'clear', 'pin'
  ];

  BaseModule.create(Places, {
    name: 'Places',

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
    screenshotQueue: {},

    /**
     * Maximum number of top sites we display
     * @memberof Places.prototype
     * @type {Integer}
     */
    MAX_TOP_SITES: 6,

    topSites: [],

    /**
     * A list of debounced changes to places, keyed by URL.
     * @memberof Places.prototype
     * @type {Object}
     */
    _placeChanges: {},

    /**
     * Maps URLs to debounce save timeouts. The place is saved after the
     * timeout is reached, or on appload.
     * @memberof Places.prototype
     * @type {Object}
     */
    _timeouts: {},

    /**
     * Starts places.
     * Adds necessary event listeners and gets the datastore.
     * @param {Function} callback
     * @memberof Places.prototype
     */
    _start: function() {
      return new Promise(resolve => {
        window.addEventListener('applocationchange', this);
        window.addEventListener('apptitlechange', this);
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

      // If the app is not a browser, do not track places as tracking places
      // currently has a non-trivial startup cost.
      if (app && !app.isBrowser()) {
        return;
      }

      // Do not persist information for private browsers.
      if (app && app.isPrivateBrowser()) {
        return;
      }

      switch (evt.type) {
        case 'applocationchange':
          this.onLocationChange(app.config.url);
          break;
        case 'apptitlechange':
          this.onTitleChange(app.config.url, app.title);
          break;
        case 'appiconchange':
          this.onIconChange(app.config.url, app.favicons);
          break;
        case 'apploaded':
          if (app.config.url in this.screenshotQueue) {
            this.takeScreenshot(app.config.url);
          }
          this.debouncePlaceChanges(app.config.url);
          break;
      }
    },

    /**
     * Requests a screenshot of a URL.
     * @param {String} url The URL of a page.
     * @memberof Places.prototype
     */
    screenshotRequested: function(url) {
      var app = Service.query('getAppByURL', url);
      if (!app || app.loading) {
        this.screenshotQueue[url] = setTimeout(() => {
          this.takeScreenshot(url);
        }, SCREENSHOT_TIMEOUT);
      } else {
        this.takeScreenshot(url);
      }
    },

    takeScreenshot: function(url) {
      if (url in this.screenshotQueue) {
        clearTimeout(this.screenshotQueue[url]);
        delete this.screenshotQueue[url];
      }

      var app = Service.query('getAppByURL', url);
      if (!app) {
        console.error('Couldnt find app for:', url);
        return false;
      }

      app.getBottomMostWindow().getScreenshot(screenshot => {
        if (screenshot) {
          this.saveScreenshot(url, screenshot);
        }
      }, null, null, null, true);
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
     * Manually set the previous visits array of timestamps, used for
     * migrations
     */
    setVisits: function(url, visits) {
      return this.editPlace(url, (place, cb) => {
        place.visits = place.visits || [];
        place.visits = place.visits.concat(visits);
        place.visits.sort((a, b) => {
          return b - a;
        });
        cb(place);
      });
    },

    /**
     * Pin/un-pin a page.
     * 
     * @param {String} url The URL of the page to pin.
     * @param {Boolean} value true for pin, false for un-pin.
     * @returns {Promise} Promise of a response.
     */
    setPinned: function(url, value) {
      return this.editPlace(url, (place, callback) => {
        place.pinned = value;
        if (value) {
          place.pinTime = Date.now();
        }
        callback(place);
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
      return this.getStore().then(store => {
        store.clear();
      });
    },

    /**
     * Add visit.
     *
     * Updates our place cache. Currently this just increments frecency, but
     * eventually there should be a separate 'visits' DataStore to store a
     * record for every visit in order to render a history view.
     *
     * @param {String} url URL of visit to record.
     * @memberof Places.prototype
     */
    onLocationChange: function(url) {
      this._placeChanges[url] = this._placeChanges[url] || this.defaultPlace();
      this._placeChanges[url].visited = Date.now();
      this._placeChanges[url].frecency += 1;
      this.debounce(url);
    },

    /**
     * Set place title.
     *
     * @param {String} url URL of place to update.
     * @param {String} title Title of place to set.
     * @memberof Places.prototype
     */
    onTitleChange: function(url, title) {
      this._placeChanges[url] = this._placeChanges[url] || this.defaultPlace();
      this._placeChanges[url].title = title;
      this.debounce(url);
    },

    /**
     * Set place icon.
     *
     * @param {String} url URL of place to update.
     * @param {String} icon The icon object
     * @memberof Places.prototype
     */
    onIconChange: function(url, icons) {
      this._placeChanges[url] = this._placeChanges[url] || this.defaultPlace();
      for (var iconUri in icons) {
        this._placeChanges[url].icons[iconUri] = icons[iconUri];
      }
      this.debounce(url);
    },

    /**
     * Creates a timeout to save place data.
     *
     * @param {String} url URL of place.
     * @memberof Places.prototype
     */
    debounce: function(url) {
      clearTimeout(this._timeouts[url]);
      this._timeouts[url] = setTimeout(() => {
        this.debouncePlaceChanges(url);
      }, DEBOUNCE_TIME);
    },

    /**
     * Saves place data to datastore after the apploaded event, or a timeout.
     *
     * @param {String} url URL of place to update.
     * @param {String} icon The icon object
     * @memberof Places.prototype
     */
    debouncePlaceChanges: function(url) {
      clearTimeout(this._timeouts[url]);

      this.editPlace(url, (place, cb) => {
        var edits = this._placeChanges[url];
        if (!edits) {
          return;
        }

        // Update the title if it's not the default (matches the URL)
        if (edits.title !== url) {
          place.title = edits.title;
        }

        if (edits.visited) {
          place.visited = edits.visited;
        }
        if (!place.frecency) {
          place.frecency = 0;
        }
        place.frecency += edits.frecency;

        if (!place.icons) {
          place.icons = {};
        }
        for (var iconUri in edits.icons) {
          place.icons[iconUri] = edits.icons[iconUri];
        }

        place = this.addToVisited(place);
        this.checkTopSites(place);

        delete this._placeChanges[url];
        cb(place);
      });
    }
  });
}());
