'use strict';
/* globals Promise, asyncStorage, Service, BaseModule, indexedDB */
/* exported Places */

(function() {

  const DEBOUNCE_TIME = 2000;

  const SCREENSHOT_TIMEOUT = 5000;

  /**
   * The Places database stores pinned sites, pinned pages,
   * browsing history and icons.
   *
   * @requires BaseModule
   * @class Places
   */
  function Places() {}

  Places.SUB_MODULES = [
    'BrowserSettings'
  ];

  Places.SERVICES = [
    'clearHistory', 'pinSite', 'getPinnedSites'
  ];

  BaseModule.create(Places, {
    name: 'Places',

    /**
     * The places store name.
     * @memberof Places.prototype
     * @type {String}
     */
    DB_NAME: 'places',
    DB_VERSION: 1,
    SITES_STORE: 'sites',
    PAGES_STORE: 'pages',

    /**
     * A reference to the places datastore.
     * @memberof Places.prototype
     * @type {Object}
     */
    db: null,

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
     * Start places.
     * 
     * Adds event listeners and opens the database.
     * 
     * @memberof Places.prototype
     * @returns {Promise} Promise which resolves when everything started up.
     */
    _start: function() {
      return new Promise(resolve => {
        window.addEventListener('applocationchange', this);
        window.addEventListener('apptitlechange', this);
        window.addEventListener('appiconchange', this);
        window.addEventListener('appmetachange', this);
        window.addEventListener('apploaded', this);

        this.openDb().then((function() {
          // Get top sites cache from async storage
          asyncStorage.getItem('top-sites', results => {
            this.topSites = this._removeDupes(results || []);
            resolve();
          });
        }).bind(this), function(e) {
          console.error('Error starting Places database ' + e); 
        });
      });
    },

    /**
     * Open the database.
     *
     * @returns Promise which resolves upon successful database opening.
     */
    openDb: function() {
      return new Promise((function(resolve, reject) {
        var request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        request.onsuccess = (function(event) {
          this.db = event.target.result;
          resolve();
        }).bind(this);

        request.onerror = function() {
          reject(request.errorCode);
        };

        request.onupgradeneeded = this.upgrade.bind(this);
      }).bind(this));
     },

    /**
     * Upgrade database to new version.
     *
     * @param {Event} upgradeneeded event.
     */
    upgrade: function(event) {
      console.log('Upgrading Places database...');
      this.db = event.target.result;

      // Create sites store if it doesn't exist
      if(!this.db.objectStoreNames.contains(this.SITES_STORE)) {
        var sitesStore = this.db.createObjectStore(this.SITES_STORE,
          { keyPath: 'id', autoIncrement: false});
        sitesStore.createIndex('frecency', 'frecency', { unique: false });
        sitesStore.transaction.oncomplete = function() {
          console.log('Sites store created successfully');
        };
        sitesStore.transaction.onerror = function() {
          console.error('Error creating Sites store');
        };
      }
  
      // Create pages store if it doesn't exist
      if(!this.db.objectStoreNames.contains(this.PAGES_STORE)) {
        var pagesStore = this.db.createObjectStore(this.PAGES_STORE,
          { keyPath: 'id', autoIncrement: false});
        pagesStore.createIndex('frecency', 'frecency', { unique: false });
        pagesStore.transaction.oncomplete = function() {
          console.log('Pages store created successfully');
        };
        pagesStore.transaction.onerror = function() {
          console.error('Error creating Pages store');
        };
      }

    },

    /**
     * Remove duplicated entries.
     * @param {Array} topSites array of places object from asyncStorage()
     * @return {Array} of places object without duplicated entries
     */
    _removeDupes: function(ts) {
      var copy = [];
      var copied = {};
      ts.forEach(function(place) {
        // Copy everything except for places we already did the copy. Since
        // |checkTopSites()| does the ordering by decreasing frecency before
        // saving to asyncStorage, then we know the first one we will copy will
        // be the biggest frecency value.
        if (place.url && !(place.url in copied)) {
          copied[place.url] = true;
          copy.push(place);
        }
      });
      return copy;
    },

    /**
     * Get the database object.
     *
     * Opens the database if not already open.
     * @returns {Promise} Promise which resolves with dabase object.
     */
    getDb: function() {
      return new Promise(resolve => {
        if (this.db) {
          return resolve(this.db);
        }
        this.openDb().then(() => {
          return resolve(this.db);
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
        case 'appmetachange':
          this.onMetaChange(app.config.url, app.meta);
          break;
        case 'apploaded':
          // TODO: Re-enable once screenshots working 
          //if (app.config.url in this.screenshotQueue) {
          //  this.takeScreenshot(app.config.url);
          //}
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
        meta : {},
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
        this.getDb().then(db => {
          var transaction = db.transaction(this.PAGES_STORE, 'readwrite');
          var objectStore = transaction.objectStore(this.PAGES_STORE);
          var request = objectStore.get(url);
          request.onsuccess = () => {
            var place = request.result;
            place = place || this.defaultPlace(url);
            fun(place, newPlace => {
              if (this.writeInProgress) {
                return this.editPlace(url, fun);
              }
              this.writeInProgress = true;
              newPlace.id = newPlace.url;

              var requestUpdate = objectStore.put(newPlace);
              requestUpdate.onsuccess = () => {
                this.writeInProgress = false;
                resolve();
              };
            });
          };
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
        return this.getDb().then(db => {
          var transaction = db.transaction(this.PAGES_STORE, 'readonly');
          var objectStore = transaction.objectStore(this.PAGES_STORE);
          var request = objectStore.get(url);
          request.onsuccess = function() {
            var place = request.result;
            return resolve(!!place.pinned);
          };
          request.onerror = function(e) {
            console.error(`Error getting the page details: ${e}`);
            return reject(e);
          };
        });
      });
    },

    /**
     * Pin a site.
     *
     * @param {String} id Site ID.
     * @param {Object} siteObject Site object.
     */
    pinSite: function(id, siteObject) {
      return new Promise((function(resolve, reject) {
        this.getDb().then((function(db) {
          var transaction = db.transaction(this.SITES_STORE, 'readwrite');
          var objectStore = transaction.objectStore(this.SITES_STORE);
          var writeRequest = objectStore.put(siteObject);
        
          writeRequest.onsuccess = function() {
            console.log('Successfully pinned site ' + ' with id ' +
              siteObject.id);
            resolve();
          };
    
          writeRequest.onerror = function() {
            console.error('Error updating site with id ' + siteObject.id);
            reject();
          };
        }).bind(this));
      }).bind(this));
    },

    /**
     * Get all pinned sites.
     *.
     * @returns {Promise} A promise which resolves with the full set of results.
     */
    getPinnedSites: function() {
      var results = [];
      var transaction = this.db.transaction(this.SITES_STORE);
      var objectStore = transaction.objectStore(this.SITES_STORE);
      return new Promise((function(resolve, reject) {
        objectStore.openCursor().onsuccess = function(event) {
          var cursor = event.target.result;
          if (cursor) {
            if (cursor.value.pinned) {
              results.push(cursor.value);
            }
            cursor.continue();
          } else {
            resolve(results);
          }
        };
      }).bind(this));
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
        // Remove any pre-existing entry from topSites that matches that
        // specific place URL to avoid duplicates. We will push the new place
        // after.
        var newTopSites = [];
        this.topSites.forEach(e => {
          if (e.url !== place.url) {
            newTopSites.push(e);
          }
        });
        this.topSites = newTopSites;
        this.topSites.push(place);
        // this.screenshotRequested(place.url);
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
    // TODO: Make this work again.
    clearHistory: function() {
      return Promise.resolve(true);
      /*return new Promise((resolve, reject) => {
        return this.getDb().then(db => {
          db.getLength().then((storeLength) => {
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

                Promise.all(promises)
                  .then(() => {
                    console.log('Browsing history successfully cleared.');
                    resolve();
                  });
              })
              .catch((e) => {
                console.error(`Error trying to clear browsing history: ${e}`);
                reject(e);
              });
          });
        });
      });*/
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
     * Set place meta.
     *
     * @param {String} url URL of place to update.
     * @param {Object} meta The meta object
     * @memberof Places.prototype
     */
    onMetaChange: function(url, meta) {
      this._placeChanges[url] = this._placeChanges[url] || this.defaultPlace();
      this._placeChanges[url].meta = meta;
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
        if (edits.title && edits.title !== url) {
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

        place.meta = edits.meta || {};

        for (var iconUri in edits.icons) {
          place.icons[iconUri] = edits.icons[iconUri];
        }

        place = this.addToVisited(place);
        this.checkTopSites(place);

        cb(place);
      }).then(() => {
        // Remove pending changes after successfully saving
        delete this._placeChanges[url];
      });
    }
  });
}());
