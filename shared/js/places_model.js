/* exported placesModel */

(function(exports) {
  'use strict';

  exports.placesModel = {
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
        screenshot: null,
        themeColor: null
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
              // Since we just checked that store.revisionId === rev, this
              // should not throw any 'RevisionId is not up-to-date' errors:
              store.put(newPlace, url, rev).then(() => {
                this.writeInProgress = false;
                resolve(newPlace);
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
     * Pin/unpin a page.
     *
     * @param {String} url The URL of the page to pin.
     * @param {Boolean} value true for pin, false for unpin.
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

    /**
     * Is a page currently pinned?
     *
     * @param {String} url The URL of the page to check.
     * @returns {Promise} Promise of a response.
     */
    isPinned: function(url) {
      return new Promise((resolve, reject) => {
        return this.getStore()
          .then(store => {
            return store.get(url);
          })
          .then(place => {
            return resolve(!!place.pinned);
          })
          .catch(e => {
            console.error(`Error getting the page details: ${e}`);
            return reject(e);
          });
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

    saveScreenshot: function(url, screenshot) {
      return this.editPlace(url, function(place, cb) {
        place.screenshot = screenshot;
        cb(place);
      });
    },

    /**
     * Update the theme color of a page in the places db.
     *
     * @param {String} url The URL of the page
     * @param {String} color The CSS color
     */
    saveThemeColor: function(url, color) {
      return this.editPlace(url, function(place, cb) {
        place.themeColor = color;
        cb(place);
      });
    },

    /**
     * Clear all the visits in the store but the pinned pages.
     *
     * @return Promise
     */
    clearHistory: function() {
      return new Promise((resolve, reject) => {
        return this.getStore().then(store => {
          store.getLength().then((storeLength) => {
            if (!storeLength) {
              return resolve();
            }

            new Promise((resolveInner, rejectInner) => {
              var urls = new Map();
              var cursor = store.sync();

              function cursorResolve(task) {
                switch (task.operation) {
                  case 'update':
                  case 'add':
                    urls.set(task.id, task.data);
                    break;

                  case 'remove':
                    urls.delete(task.id, task.data);
                    break;

                  case 'clear':
                    urls.clear();
                    break;

                  case 'done':
                    return resolveInner(urls);
                }

                cursor.next().then(cursorResolve, rejectInner);
              }

              cursor.next().then(cursorResolve, rejectInner);
            })
              .then((urls) => {
                var promises = [];

                urls.forEach((val, key) => {
                  if (val.pinned) {
                    // Clear the visit history of pinned pages.
                    promises.push(this.editPlace(key, function(place, cb) {
                      place.visits = [];
                      cb(place);
                    }));
                  } else {
                    // Remove all other pages from history.
                    promises.push(store.remove(key));
                  }
                });

                Promise.all(promises).then(resolve, reject);
              })
              .catch((e) => {
                console.error(`Error trying to clear browsing history: ${e}`);
                reject(e);
              });
          });
        });
      });
    }
  };
})(this);
