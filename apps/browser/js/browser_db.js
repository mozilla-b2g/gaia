'use strict';

/* global Browser */

// https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabaseException
// IDBDatabaseException obselete
/* global IDBDatabaseException */

/** Support different browser versions of IndexedDB */
var idb = window.indexedDB || window.webkitIndexedDB ||
  window.mozIndexedDB || window.msIndexedDB;

/**
 * Provide access to bookmarks, topsites, history, search engines and settings
 * in IndexedDB.
 * @namespace BrowserDB
 */
var BrowserDB = {
  /**
   * How long is a icon expired in database in miliseconds.
   * Default to 1 day.
   */
  DEFAULT_ICON_EXPIRATION: 86400000, // One day
  /**
   * Maximum icon file size allowed.
   * Default to 100kB.
   */
  MAX_ICON_SIZE: 102400, // 100kB
  /** Number of top sites to keep screenshots for. Default to 4. */
  TOP_SITE_SCREENSHOTS: 4,
  variantObserver: null,

  /**
   * Init system message handler of 'first-run-with-sim'.
   * On 'first-run-with-sim' populates bookmarks from configuration data to
   * database.
   */
  waitFirstRunWithSim: function browserDB_waitFirstRunWithSim() {
    window.navigator.mozSetMessageHandler('first-run-with-sim', (function(msg) {
      Browser.getConfigurationData({ mcc: msg.mcc, mnc: msg.mnc },
                                   this.populateBookmarks);
    }).bind(this));
  },

  /**
   * Initialization. Open a database.
   * @param {Function} callback The callback to be run on success
   */
  init: function browserDB_init(callback) {
    this.db.open(callback);
  },

  /**
   * Listen for mozSettingsEvent on 'operatorResources.data.topsites'.
   * Populate topsites data from mozSettings to database.
   */
  initSingleVariant: function browserDB_initSingleVariant() {
    this.variantObserver = this.handleSingleVariant.bind(this);
    navigator.mozSettings.addObserver('operatorResources.data.topsites',
                                      this.variantObserver);

    var request = navigator.mozSettings.createLock()
                  .get('operatorResources.data.topsites');
    request.onsuccess = (function() {
      this.handleTopSites(request.result['operatorResources.data.topsites']);
    }.bind(this));
  },

  /**
   * Listener of mozSettingsEvent on 'operatorResources.data.topsites'.
   * Populate topsites data with event.settingValue.
   */
  handleSingleVariant: function browserDB_handleSingleVariant(event) {
    this.handleTopSites(event.settingValue);
  },

  /**
   * Remove listener of mozSettingsEvent on 'operatorResources.data.topsites'.
   * Populate topsites data to database and empty
   * 'operatorResources.data.topsites' in mozSettings.
   * @param {Object} data Topsites data
   */
  handleTopSites: function browserDB_handleTopSites(data) {
    if (data && Object.keys(data).length !== 0) {
      navigator.mozSettings.removeObserver('operatorResources.data.topsites',
                                           this.variantObserver);

      this.populateTopSites(data.topSites, -1);

      navigator.mozSettings.createLock()
               .set({'operatorResources.data.topsites': {}});
      return;
    }
  },

  /**
   * Populate browser database with top sites data.
   *
   * @param {Object} data Top sites data
   * @param {Number} frequency
   */
  populateTopSites: function browserDB_populateTopSites(data, frequency) {
    var index = frequency;

    data.forEach(function(topSite) {
      if (!topSite.uri || ! topSite.title) {
        return;
      }
      this.addTopSite(topSite.uri, topSite.title, index);
      index--;
      if (topSite.iconUri) {
        if (topSite.iconUri instanceof Blob) {
          var reader = new FileReader();
          reader.onloadend = (function() {
            topSite.iconUri = reader.result;
            this.setAndLoadIconForPage(topSite.uri, topSite.iconUri);
          }.bind(this));
          reader.onerror = function() {
            console.error('Unable to read iconUri from blob');
          };
          reader.readAsDataURL(topSite.iconUri);
          return;
        }

        this.setAndLoadIconForPage(topSite.uri, topSite.iconUri);
      }
    }, this);
  },

  /**
   * Populate browser database with top site and bookmark configuration data
   * specified at build time.
   *
   * @param {Integer} upgradeFrom Version of database being upgraded from.
   * @param {Function} callback Runs on addBookmark or addSearchEngine,
   *                            might run more than once... Not being used.
   */
  populate: function browserDB_populate(upgradeFrom, callback) {
    console.log('Populating browser database.');

    var self = this;
    this.populateBookmarks = function(data) {
      // Populate bookmarks if upgrading from version 0 or below
      if (upgradeFrom < 1 && data.bookmarks) {
        data.bookmarks.forEach(function(bookmark) {
          if (!bookmark.uri || !bookmark.title) {
            return;
          }
          self.addBookmark(bookmark.uri, bookmark.title, callback);
          if (bookmark.iconUri) {
            self.setAndLoadIconForPage(bookmark.uri, bookmark.iconUri);
          }
        }, self);
      }
      // Populate search engines & settings if upgrading from below version 7
      if (upgradeFrom < 7 && data.searchEngines && data.settings) {
        var defaultSearchEngine = data.settings.defaultSearchEngine;
        if (defaultSearchEngine) {
          self.updateSetting(defaultSearchEngine, 'defaultSearchEngine');
        }
        self.db.clearSearchEngines(function browserDB_addSearchEngines() {
          data.searchEngines.forEach(function(searchEngine) {
            if (!searchEngine.uri || !searchEngine.title ||
                !searchEngine.iconUri) {
              return;
            }
            self.addSearchEngine(searchEngine, callback);
            if (searchEngine.uri == defaultSearchEngine) {
              Browser.searchEngine = searchEngine;
            }
            self.setAndLoadIconForPage(searchEngine.uri, searchEngine.iconUri);
          }, self);
        });
      }
    };

    Browser.getDefaultData(function(data) {
      if (!data) {
        return;
      }
      // Populate top sites if upgrading from below version 7
      if (upgradeFrom < 7 && data.topSites) {
        self.populateTopSites(data.topSites, -20);
      }

    });

    Browser.getConfigurationData({ mcc: '000', mnc: '000' },
                                 this.populateBookmarks);
  },

  /**
   * Add a 'places' entry for the uri.
   * @param {String} uri The uri to be added
   * @param {Function} callback Runs when it finishs
   */
  addPlace: function browserDB_addPlace(uri, callback) {
    this.db.createPlace(uri, callback);
  },

  /**
   * Get a place by URI from 'places' object store.
   * @param {String} uri URI query parameter
   * @param {Function} callback Invoked with an icon object as argument on
   *                            success. Invoked without arguments on error.
   */
  getPlace: function browserDB_getPlace(uri, callback) {
    this.db.getPlace(uri, callback);
  },

  /**
   * Save the current time of the visit and update frequency (view count).
   * @param {String} uri A visited URI to be saved
   * @param {Function} callback Runs on frequency (view count) updated
   */
  addVisit: function browserDB_addVisit(uri, callback) {
    var visit = {
      uri: uri,
      timestamp: new Date().getTime()
    };
    this.addPlace(uri, (function() {
      this.db.saveVisit(visit, (function() {
        this.updateFrecency(uri, callback);
      }).bind(this));
    }).bind(this));
  },

  /**
   * Update the frequency(view count) of the specified URI,
   * if the URI has been visited.
   * @param {String} uri The URI to be updated
   * @param {Function} callback Runs if the URI is the start page or
   *                            the update process is successful
   */
  updateFrecency: function browserDB_updateFrecency(uri, callback) {
    this.db.updatePlaceFrecency(uri, callback);
  },

  /**
   * Update a screenshot by URI if the URI is in top sites.
   * @param {String} uri URI query parameter
   * @param {Blob} screenshot A webpage screenshot taken using
   *                          HTMLIFrameElement.getScreenshot
   * @param {Function} callback Runs on success
   */
  updateScreenshot: function place_updateScreenshot(uri, screenshot, callback) {
    var maximum = this.TOP_SITE_SCREENSHOTS;
    this.db.getPlaceUrisByFrecency(maximum + 1, (function(topSites) {
      var runnerUp;
      // Get the site that isn't quite a top site, if there is one
      if (topSites.length > maximum) {
        runnerUp = topSites.pop();
      }

      // If uri is not one of the top sites, don't store the screenshot
      if (topSites.indexOf(uri) == -1) {
        return;
      }

      this.db.updatePlaceScreenshot(uri, screenshot);

      // If more top sites than we need screenshots, expire old screenshot
      if (runnerUp) {
        this.db.updatePlaceScreenshot(runnerUp, null);
      }

    }).bind(this));
  },

  /**
   * Add a bookmark into database.
   * @param {String} uri URI
   * @param {String} title Title
   * @param {Function} callback Runs on success
   */
  addBookmark: function browserDB_addBookmark(uri, title, callback) {
    if (!title) {
      title = uri;
    }
    var bookmark = {
      uri: uri,
      title: title,
      timestamp: new Date().getTime()
    };
    this.addPlace(uri, (function() {
      this.db.saveBookmark(bookmark, callback);
    }).bind(this));
  },

  /**
   * Get a bookmark by URI from database.
   * @param {String} uri URI query parameter
   * @param {Function} callback Runs with a bookmark object on success. Runs
   *                            without arguments on error.
   */
  getBookmark: function browserDB_getBookmark(uri, callback) {
    this.db.getBookmark(uri, callback);
  },

  /**
   * Get all bookmarks.
   * @param {Function} callback Runs on success with an array of bookmarks
   */
  getBookmarks: function browserDB_getBookmarks(callback) {
    this.db.getAllBookmarks(callback);
  },

  /**
   * Get all search engines.
   * @param {Function} callback Runs on success with an array of search engines
   */
  getSearchEngines: function browserDB_getAllSearchEngines(callback) {
    this.db.getAllSearchEngines(callback);
  },

  /**
   * Delete a bookmark by URI
   * @param {String} uri URI
   * @param {Function} callback
   */
  removeBookmark: function browserDB_removeBookmark(uri, callback) {
    this.db.deleteBookmark(uri, callback);
  },

  /**
   * Add/Update a bookmark in database.
   * @param {String} uri URI
   * @param {String} title Title
   * @param {Function} callback Runs on success
   */
  updateBookmark: function browserDB_updateBookmark(uri, title, callback) {
    this.db.getBookmark(uri, (function(bookmark) {
      if (bookmark) {
        bookmark.title = title;
        this.db.saveBookmark(bookmark, callback);
      } else {
        this.addBookmark(uri, title, callback);
      }
    }).bind(this));
  },

  /**
   * Create/Update page title in database.
   * @param {String} uri URI query parameter
   * @param {String} title Page title
   * @param {Function} callback Runs on success
   */
  setPageTitle: function browserDB_setPageTitle(uri, title, callback) {
    this.db.updatePlaceTitle(uri, title, callback);
  },

  /**
   * Save iconUri in 'places' object store in database.
   * @param {String} uri URI
   * @param {String} iconUri Base64 encoded image string
   * @param {Function} callback Runs on success
   */
  setPageIconUri: function browserDB_setPageIconUri(uri, iconUri, callback) {
    this.db.updatePlaceIconUri(uri, iconUri, callback);
  },

  /**
   * Create a 'icons' object store entry and save it in database.
   * @param {String} iconUri Base64 encoded image string
   * @param {Blob} data Image Blob
   * @param {Function} callback Runs on success
   * @param {Boolean} failed Specify if the image Blob data is successfully
   *                         saved
   */
  setIconData: function browserDB_setIconData(iconUri, data, callback, failed) {
    var now = new Date().valueOf();
    var iconEntry = {
      uri: iconUri,
      data: data,
      expiration: now + this.DEFAULT_ICON_EXPIRATION,
      failed: failed
    };
    this.db.saveIcon(iconEntry, callback);
  },

  /**
   * Load the image icon and save it to IndexedDB.
   * @param {String} uri URI
   * @param {String} iconUri Base64 encoded image string
   * @param {Function} callback Run on saving to IndexedDB successful
   */
  setAndLoadIconForPage: function browserDB_setAndLoadIconForPage(uri,
    iconUri, callback) {
    this.setPageIconUri(uri, iconUri);
    // If icon is not already cached or has expired, load it
    var now = new Date().valueOf();
    this.db.getIcon(iconUri, (function(icon) {
      if (icon && icon.expiration > now) {
        return;
      }
      var xhr = new XMLHttpRequest({mozSystem: true});
      xhr.open('GET', iconUri, true);
      xhr.responseType = 'blob';
      xhr.addEventListener('load', (function() {
        // Check icon was successfully downloded
        // 0 is due to https://bugzilla.mozilla.org/show_bug.cgi?id=716491
        if (!(xhr.status === 200 || xhr.status === 0)) {
          this.setIconData(iconUri, null, callback, true);
          console.log('error downloading icon: ' + xhr.status);
          return;
        }

        var blob = xhr.response;
        // Check the file is served as an image and isn't too big
        if (blob.type.split('/')[0] != 'image' ||
        blob.size > this.MAX_ICON_SIZE) {
          this.setIconData(iconUri, null, callback, true);
          console.log('Icon was not an image or was too big');
          return;
        }

        // Only save the icon if it can be loaded as an image bigger than 0px
        var img = document.createElement('img');
        var src = window.URL.createObjectURL(blob);
        img.src = src;
        img.onload = (function() {
          if (img.naturalWidth > 0) {
            this.setIconData(iconUri, blob, callback);
          } else {
           this.setIconData(iconUri, null, callback, true);
           console.log('Icon not saved because less than 1px wide');
          }
          window.URL.revokeObjectURL(src);
        }).bind(this);
        img.onerror = (function() {
          this.setIconData(iconUri, null, callback, true);
          console.log('Icon not saved because can not be decoded');
          window.URL.revokeObjectURL(src);
        }).bind(this);

      }).bind(this), false);
      xhr.onerror = function getIconError() {
        console.log('Error fetching icon');
      };
      xhr.send();
    }).bind(this));
  },

  /**
   * Add a 'places' entry of the URI.
   * @param {String} uri The URI to be added in DB
   * @param {String} title
   * @param {Number} frequency View count of the specified URI
   * @param {Function} callback Runs when it finishs
   */
  addTopSite: function browserDB_addTopSite(uri, title, frequency, callback) {
    this.addPlace(uri, (function() {
      this.db.initPlaceFrecency(uri, title, frequency, callback);
    }).bind(this));
  },

  /**
   * Get top sites.
   * @param {Number} maximum The maximum number of top sites to get
   * @param {String} filter URI filter. Pass in null to ignore.
   * @param {Function} callback Run on success with topsites array and filter
   *                            as arguments.
   */
  getTopSites: function browserDB_getTopSites(maximum, filter, callback) {
    // Get the top 20 sites
    this.db.getPlacesByFrecency(maximum, filter, callback);
  },

  /**
   * Get default configured top sites.
   * @param {Function} callback Run on success with default top sites array.
   */
  getDefaultTopSites: function browserDB_getDefaultTopSites(callback) {
    this.db.getDefaultPlaces(callback);
  },

  /**
   * Get the latest 20 history entries.
   * @param {Function} callback Run with array of history entries
   */
  getHistory: function browserDB_getHistory(callback) {
    // Just get the most recent 20 for now
    this.db.getHistory(20, callback);
  },

  /**
   * Clear history and keep bookmarks.
   * @param {Function} callback Runs on success
   */
  clearHistory: function browserDB_clearHistory(callback) {
    // Get a list of bookmarks
    this.db.getAllBookmarkUris((function(bookmarks) {
      this.db.clearHistoryExcluding(bookmarks, callback);
    }).bind(this));
  },

  /**
   * Add an search_engines object store entry in database
   * @param {Object} data A search_engines entry
   * @param {Function} callback Runs on success
   */
  addSearchEngine: function browserDB_addSearchEngine(data, callback) {
    if (!data.uri || !data.title) {
      return;
    }
    this.db.saveSearchEngine(data, callback);
  },

  /**
   * Get a search_engine entry by URI from database.
   * @param {String} uri URI query parameter
   * @param {Function} callback Runs with a bookmark object on success. Runs
   *                            without arguments on database not found error.
   */
  getSearchEngine: function browserDB_getSearchEngine(uri, callback) {
    this.db.getSearchEngine(uri, callback);
  },

  /**
   * Update the settings value of the specified key.
   * @param {String} value Value
   * @param {String} key Key
   * @param {Function} callback Runs on success
   */
  updateSetting: function browserDB_updateSetting(key, value, callback) {
    this.db.updateSetting(key, value, callback);
  },

  /**
   * Get a setting by key from 'settings' object store.
   * @param {String} key Settings key query parameter
   * @param {Function} callback Invoked with an icon object as argument on
   *                            success. Invoked without arguments on error.
   */
  getSetting: function browserDB_getSetting(key, callback) {
    this.db.getSetting(key, callback);
  }

};

/**
 * @memberOf BrowserDB
 * @namespace BrowserDB.db
 */
BrowserDB.db = {
  _db: null,
  START_PAGE_URI: document.location.protocol + '//' + document.location.host +
    '/start.html',
  /** Version of database being upgraded from */
  upgradeFrom: -1,

  /**
   * Open a IndexedDB database with name as 'browser' and version as 7.
   * @param {Function} callback The callback to be run on success
   */
  open: function db_open(callback) {
    const DB_VERSION = 7;
    const DB_NAME = 'browser';
    var request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (function onUpgradeNeeded(e) {
      console.log('Browser database upgrade needed, upgrading.');
      this.upgradeFrom = e.oldVersion;
      this._db = e.target.result;
      this.upgrade();
    }).bind(this);

    request.onsuccess = (function onSuccess(e) {
      this._db = e.target.result;

      callback();
      if (this.upgradeFrom != -1) {
        BrowserDB.populate(this.upgradeFrom);
      }

      BrowserDB.initSingleVariant();

    }).bind(this);

    request.onerror = (function onDatabaseError(e) {
      console.log('Error opening browser database');
    }).bind(this);
  },

  /**
   * Create/Update object stores:
   *  places
   *  visits
   *  icons
   *  bookmarks
   *  settings
   *  search_engines
   */
  upgrade: function db_upgrade() {
    var db = this._db;
    var upgradeFrom = this.upgradeFrom;

    if (upgradeFrom < 1) {
      var placesStore = db.createObjectStore('places', { keyPath: 'uri' });
      // Index places by frecency
      placesStore.createIndex('frecency', 'frecency', { unique: false });
      var visitStore = db.createObjectStore('visits', { autoIncrement: true });
      // Index visits by timestamp
      visitStore.createIndex('timestamp', 'timestamp', { unique: false });
      db.createObjectStore('icons', { keyPath: 'uri' });
      var bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'uri' });
      // Index bookmarks by timestamp
      bookmarkStore.createIndex('timestamp', 'timestamp', { unique: false });
    }
    if (upgradeFrom < 6) {
      db.createObjectStore('settings');
      db.createObjectStore('search_engines', { keyPath: 'uri' });
    }
  },

  /**
   * Create a new 'places' entry of the URI if there's none.
   * @param {String} uri The uri to be inserted
   * @param {Function} callback Runs when the entry exists or a new entry
   *                            created
   */
  createPlace: function db_createPlace(uri, callback) {
    var transaction = this._db.transaction(['places'], 'readwrite');

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);
    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (place) {
        if (callback) {
          callback();
        }
        return;
      } else {
        place = {
          uri: uri,
          title: uri
        };
      }

      var writeRequest = objectStore.add(place);

      writeRequest.onsuccess = function onWriteSuccess(event) {
        if (callback) {
          callback();
        }
      };

      writeRequest.onerror = function onError(event) {
        console.log('error writing place');
      };
    };

    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save place ' +
        uri);
    };
  },

  /**
   * Get a place by URI from 'places' object store.
   * @param {String} uri URI query parameter
   * @param {Function} callback Invoked with an icon object as argument on
   *                            success. Invoked without arguments on error.
   */
  getPlace: function db_getPlace(uri, callback) {
    var db = this._db;
    var request = db.transaction('places').objectStore('places').get(uri);

    request.onsuccess = function onSuccess(event) {
      callback(event.target.result);
    };

    request.onerror = function onError(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR) {
        callback();
      }
    };
  },

  /**
   * Update a places entry.
   * @param {Object} place A place entry
   * @param {Function} callback Runs on success
   */
  updatePlace: function db_updatePlace(place, callback) {
    var transaction = this._db.transaction(['places'], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to update place: ' +
        place.uri);
    };

    var objectStore = transaction.objectStore('places');
    var request = objectStore.put(place);

    request.onsuccess = function onSuccess(e) {
      if (callback) {
        callback();
      }
    };

    request.onerror = function onError(e) {
      console.log('Error while updating place in global history store: ' +
        place.uri);
    };
  },

  /**
   * Save an visits object store entry in database
   * @param {Object} visit A visits entry
   * @param {Function} callback Runs on success
   */
  saveVisit: function db_saveVisit(visit, callback) {
    var transaction = this._db.transaction(['visits'], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save visit');
    };

     var objectStore = transaction.objectStore('visits');
     var request = objectStore.add(visit);

     request.onerror = function onError(e) {
       console.log('Error while adding visit to global history store');
     };

     request.onsuccess = function onSuccess(e) {
       if (callback) {
         callback();
       }
     };
  },

  /**
   * Get latest visits entries.
   * @param {Number} maximum Maximum number of history entries to get
   * @param {Function} callback Run with array of history entries
   */
  getHistory: function db_getHistory(maximum, callback) {
    var history = [];
    var db = this._db;

    function makeVisitProcessor(visit) {
      return function(e) {
          var place = e.target.result;
          visit.title = place.title;
          visit.iconUri = place.iconUri;
          history.push(visit);
        };
    }

    var transaction = db.transaction(['visits', 'places']);
    var visitsStore = transaction.objectStore('visits');
    var placesStore = transaction.objectStore('places');
    visitsStore.openCursor(null, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor && history.length < maximum) {
        var visit = cursor.value;
        placesStore.get(visit.uri).onsuccess = makeVisitProcessor(visit);
        cursor.continue();
      } else {
        callback(history);
      }
    };
  },

  /**
   * Get default configured places entries. This is possibly broken. Need
   * confirmation.
   * @param {Function} callback Run on success with default top sites array.
   */
  getDefaultPlaces: function db_defaultPlaces(callback) {
    var topSites = [];
    var transaction = this._db.transaction('places');
    var placesStore = transaction.objectStore('places');
    var frecencyIndex = placesStore.index('frecency');
    frecencyIndex.openCursor(null, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor && cursor.value && cursor.value.frecency < 0) {
        topSites.push(cursor.value);
        cursor.continue();
      } else {
        callback(topSites);
      }
    };
  },

  /**
   * Get places entries ordered by frequency(view count).
   * @param {Number} maximum The maximum number of top sites to get
   * @param {String} filter URI filter. Pass in null to ignore.
   * @param {Function} callback Run on success with topsites array and filter
   *                            as arguments.
   */
  getPlacesByFrecency: function db_placesByFrecency(maximum, filter, callback) {
    var topSites = [];
    var self = this;
    var transaction = self._db.transaction('places');
    var placesStore = transaction.objectStore('places');
    var frecencyIndex = placesStore.index('frecency');
    frecencyIndex.openCursor(null, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor && topSites.length < maximum) {
        var place = cursor.value;
        var matched = false;
        if (filter) {
          matched = self.matchesFilter(place.uri, filter) ||
            self.matchesFilter(place.title, filter);
        }
        if (matched || !filter) {
          topSites.push(cursor.value);
        }
        cursor.continue();
      } else {
        callback(topSites, filter);
      }
    };
  },

  /**
   * Check if the URI matches the regular expression filter.
   * @param {String} uri
   * @param {String} filter
   * @returns {Boolean}
   */
  matchesFilter: function db_matchesFilter(uri, filter) {
    return uri.match(new RegExp(filter, 'i')) !== null;
  },

  /**
   * Get places URIs ordered by frequency(view count).
   * @param {Number} maximum The maximum number of URIs to get
   * @param {Function} callback Run on success with a URI array
   */
  getPlaceUrisByFrecency: function db_getPlaceUrisByFrecency(maximum,
    callback) {
    var topSites = [];
    var transaction = this._db.transaction('places');
    var placesStore = transaction.objectStore('places');
    var frecencyIndex = placesStore.index('frecency');
    frecencyIndex.openCursor(null, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor && topSites.length < maximum) {
        topSites.push(cursor.value.uri);
        cursor.continue();
      } else {
        callback(topSites);
      }
    };
  },

  /**
   * Clear places object store.
   * @param {Function} callback Runs on success
   */
  clearPlaces: function db_clearPlaces(callback) {
    var db = BrowserDB.db._db;
    var transaction = db.transaction('places', 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to clear places');
    };
    var objectStore = transaction.objectStore('places');
    var request = objectStore.clear();
    request.onsuccess = function onSuccess() {
      callback();
    };
    request.onerror = function onError(e) {
      console.log('Error clearing places object store');
    };
  },

  /**
   * Clear visits object store.
   * @param {Function} callback Runs on success
   */
  clearVisits: function db_clearVisits(callback) {
    var db = BrowserDB.db._db;
    var transaction = db.transaction('visits', 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to clear visits');
    };
    var objectStore = transaction.objectStore('visits');
    var request = objectStore.clear();
    request.onsuccess = function onSuccess() {
      if (callback) {
        callback();
      }
    };
    request.onerror = function onError(e) {
      console.log('Error clearing visits object store');
    };
  },

  /**
   * Clear icons object store.
   * @param {Function} callback Runs on success
   */
  clearIcons: function db_clearIcons(callback) {
    var db = BrowserDB.db._db;
    var transaction = db.transaction('icons', 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to clear icons');
    };
    var objectStore = transaction.objectStore('icons');
    var request = objectStore.clear();
    request.onsuccess = function onSuccess() {
      callback();
    };
    request.onerror = function onError(e) {
      console.log('Error clearing icons object store');
    };
  },

  /**
   * Clear bookmarks object store.
   * @param {Function} callback Runs on success
   */
  clearBookmarks: function db_clearBookmarks(callback) {
    var db = BrowserDB.db._db;
    var transaction = db.transaction('bookmarks', 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to clear bookmarks');
    };
    var objectStore = transaction.objectStore('bookmarks');
    var request = objectStore.clear();
    request.onsuccess = function onSuccess() {
      callback();
    };
    request.onerror = function onError(e) {
      console.log('Error clearing bookmarks object store');
    };
  },

  /**
   * Save an icon object store entry in database
   * @param {Object} iconEntry
   * @param {Function} callback Runs on success
   */
  saveIcon: function db_saveIcon(iconEntry, callback) {
    var transaction = this._db.transaction(['icons'], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save icon');
    };

    var objectStore = transaction.objectStore('icons');
    var request = objectStore.put(iconEntry);

    request.onsuccess = function onSuccess(e) {
      if (callback) {
        callback();
      }
    };

    request.onerror = function onError(e) {
      console.log('Error while saving icon');
    };
  },

  /**
   * Get a icon by iconUri from 'icons' object store.
   * @param {String} iconUri Base64 encoded icon image string
   * @param {Function} callback Invoked with an icon object as argument on
   *                            success. Invoked without arguments on error.
   */
  getIcon: function db_getIcon(iconUri, callback) {
    var request = this._db.transaction('icons').objectStore('icons').
      get(iconUri);

    request.onsuccess = function onSuccess(event) {
      callback(event.target.result);
    };

    request.onerror = function onError(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR) {
        callback();
      }
    };
  },

  /**
   * Save a bookmarks object store entry in database
   * @param {Object} bookmark A bookmarks object store entry
   * @param {Function} callback Runs on success
   */
  saveBookmark: function db_saveBookmark(bookmark, callback) {
    var transaction = this._db.transaction(['bookmarks'], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save bookmark');
    };

    var objectStore = transaction.objectStore('bookmarks');

    var request = objectStore.put(bookmark);

    request.onsuccess = function onSuccess(e) {
      if (callback) {
        callback();
      }
    };

    request.onerror = function onError(e) {
      console.log('Error while saving bookmark');
    };
  },

  /**
   * Get a bookmark by URI from database.
   * @param {String} uri URI
   * @param {Function} callback Runs with a bookmark object on success. Runs
   *                            without arguments on error.
   */
  getBookmark: function db_getBookmark(uri, callback) {
    var request = this._db.transaction('bookmarks').objectStore('bookmarks').
      get(uri);

    request.onsuccess = function onSuccess(event) {
      callback(event.target.result);
    };

    request.onerror = function onError(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR) {
        callback();
      }
    };
  },

  /**
   * Delete a bookmark by URI from database.
   * @param {String} uri URI query parameter
   * @param {Function} callback Runs on success
   */
  deleteBookmark: function db_deleteBookmark(uri, callback) {
    var transaction = this._db.transaction(['bookmarks'], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to delete bookmark');
    };

    var objectStore = transaction.objectStore('bookmarks');
    var request = objectStore.delete(uri);

    request.onsuccess = function onSuccess(event) {
      if (callback) {
        callback();
      }
    };

    request.onerror = function onError(e) {
      console.log('Error while deleting bookmark');
    };
  },

  /**
   * Get bookmarks
   * @param {Function} callback Runs on complete with an array of bookmarks
   */
  getAllBookmarks: function db_getAllBookmarks(callback) {
    var bookmarks = [];
    var db = this._db;

    function makeBookmarkProcessor(bookmark) {
      return function(e) {
        var place = e.target.result;
        bookmark.iconUri = place.iconUri;
        bookmarks.push(bookmark);
      };
    }

    var transaction = db.transaction(['bookmarks', 'places']);
    var bookmarksStore = transaction.objectStore('bookmarks');
    var bookmarksIndex = bookmarksStore.index('timestamp');
    var placesStore = transaction.objectStore('places');
    bookmarksIndex.openCursor(null, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor) {
        var bookmark = cursor.value;
        placesStore.get(bookmark.uri).onsuccess =
          makeBookmarkProcessor(bookmark);
        cursor.continue();
      }
    };
    transaction.oncomplete = function db_bookmarkTransactionComplete() {
      callback(bookmarks);
    };
  },

  /**
   * Get all URIs of bookmarks
   * @param {Function} callback Runs on complete with an array of URIs
   */
  getAllBookmarkUris: function db_getAllBookmarks(callback) {
    var uris = [];
    var db = this._db;

    var transaction = db.transaction('bookmarks');
    var objectStore = transaction.objectStore('bookmarks');

    objectStore.openCursor(null, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor) {
        uris.push(cursor.value.uri);
        cursor.continue();
      }
    };
    transaction.oncomplete = function db_bookmarkTransactionComplete() {
      callback(uris);
    };
  },

  /**
   * Init the frequency(view count) of the specified URI,
   * if the URI is in 'places'.
   * @param {String} uri The URI to be init
   * @param {String} title
   * @param {Number} frequency View count of the specified URI
   * @param {Function} callback Runs when init finishs
   */
  initPlaceFrecency: function db_initPlaceFrecency(uri, title,
                                                   frecency, callback) {
    // Don't assign frecency to the start page
    if (uri == this.START_PAGE_URI) {
      if (callback) {
        callback();
      }
      return;
    }

    var transaction = this._db.transaction(['places'], 'readwrite');
    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);
    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (!place || (place.frecency && place.frecency > frecency)) {
        return;
      }

      place.title = title;
      place.frecency = frecency;

      var writeRequest = objectStore.put(place);
      writeRequest.onerror = function onError() {
        console.log('Error while saving new frecency for ' + uri);
      };

      writeRequest.onsuccess = function onWriteSuccess() {
        if (callback) {
          callback();
        }
      };
    };

    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to update place: ' +
        uri);
    };
  },

  /**
   * Update the frequency(view count) of the specified URI,
   * if the URI is in 'places'.
   * @param {String} uri The URI to be updated
   * @param {Function} callback Runs if the URI is the start page or
   *                            the update process is successful
   */
  updatePlaceFrecency: function db_updatePlaceFrecency(uri, callback) {
    // Don't assign frecency to the start page
    if (uri == this.START_PAGE_URI) {
      if (callback) {
        callback();
      }
      return;
    }

    var transaction = this._db.transaction(['places'], 'readwrite');

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (!place) {
        return;
      }

      if (!place.frecency) {
        place.frecency = 1;
      } else {
        if (place.frecency < 0) {
          place.frecency = 0;
        }
        // currently just frequency
        place.frecency++;
      }

      var writeRequest = objectStore.put(place);

      writeRequest.onerror = function onError() {
        console.log('Error while saving new frecency for ' + uri);
      };

      writeRequest.onsuccess = function onWriteSuccess() {
        if (callback) {
          callback();
        }
      };

    };

    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to update place: ' +
        uri);
    };
  },

  /**
   * Set the frequency(view count) to null of the specified URI,
   * if the URI is in 'places'.
   * @param {String} uri The URI to be reset
   * @param {Function} callback Runs if the reset process is successful
   */
  resetPlaceFrecency: function db_resetPlaceFrecency(uri, callback) {
    var transaction = this._db.transaction(['places'], 'readwrite');

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (!place) {
        return;
      }

      place.frecency = null;

      var writeRequest = objectStore.put(place);

      writeRequest.onerror = function onError() {
        console.log('Error while resetting frecency for ' + uri);
      };

      writeRequest.onsuccess = function onWriteSuccess() {
        if (callback) {
          callback();
        }
      };

    };

    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to reset frecency: ' +
        uri);
    };
  },

  /**
   * Create/Update iconUri in 'places' object store.
   * @param {String} uri URI query parameter
   * @param {String} iconUri Base64 encoded image string
   * @param {Function} callback Runs on success
   */
  updatePlaceIconUri: function db_updatePlaceIconUri(uri, iconUri, callback) {
    var transaction = this._db.transaction(['places'], 'readwrite');

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (place) {
        place.iconUri = iconUri;
      } else {
        place = {
          uri: uri,
          title: uri,
          iconUri: iconUri
        };
      }

      var writeRequest = objectStore.put(place);

      writeRequest.onerror = function onError() {
        console.log('Error while saving iconUri for ' + uri);
      };

    };

    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save iconUri for ' +
        uri);
    };

    transaction.onsuccess = function dbTransactionSuccess(e) {
      if (callback) {
        callback();
      }
    };
  },

  /**
   * Create/Update title in 'places' object store.
   * @param {String} uri URI query parameter
   * @param {String} title Page title
   * @param {Function} callback Runs on success
   */
  updatePlaceTitle: function db_updatePlaceTitle(uri, title, callback) {
    var transaction = this._db.transaction(['places'], 'readwrite');

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (place) {
        place.title = title;
      } else {
        place = {
          uri: uri,
          title: title
        };
      }

      var writeRequest = objectStore.put(place);

      writeRequest.onerror = function onError() {
        console.log('Error while saving title for ' + uri);
      };

      writeRequest.onsuccess = function onWriteSuccess() {
        if (callback) {
          callback();
        }
      };

    };

    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save title for ' +
        uri);
    };
  },

  /**
   * Update a screenshot of a places entry by URI.
   * @param {String} uri URI query parameter
   * @param {Blob} screenshot A webpage screenshot taken using
   *                          HTMLIFrameElement.getScreenshot
   * @param {Function} callback Runs on success
   */
  updatePlaceScreenshot: function db_updatePlaceScreenshot(uri, screenshot,
    callback) {
    var transaction = this._db.transaction(['places'], 'readwrite');

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (place) {
        place.screenshot = screenshot;
      } else {
        place = {
          uri: uri,
          title: uri,
          screenshot: screenshot
        };
      }

      var writeRequest = objectStore.put(place);

      writeRequest.onerror = function onError() {
        console.log('Error while saving screenshot for ' + uri);
      };

      writeRequest.onsuccess = function onWriteSuccess() {
        if (callback) {
          callback();
        }
      };

    };

    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save screenshot for ' +
        uri);
    };
  },

  /**
   * Clear places and icons entries. For exceptions reset frequency only.
   * @param {Array} exceptions URIs to be excluded from clearing
   * @param {Function} callback Runs on success
   */
  clearHistoryExcluding: function db_clearHistoryExcluding(exceptions,
    callback) {
    // Clear all visits
    this.clearVisits();

    var transaction = this._db.transaction(['places', 'icons'], 'readwrite');
    var placesStore = transaction.objectStore('places');
    var iconStore = transaction.objectStore('icons');

    placesStore.openCursor(null, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor) {
        var place = cursor.value;
        // If not one of the exceptions then delete place and icon
        if (exceptions.indexOf(place.uri) == -1) {
          placesStore.delete(place.uri);
          if (place.iconUri) {
            iconStore.delete(place.iconUri);
          }
        } else {
          // For exceptions, just reset frecency
          BrowserDB.db.resetPlaceFrecency(place.uri);
        }
        cursor.continue();
      }
    };
    transaction.oncomplete = function db_bookmarkTransactionComplete() {
      if (callback) {
        callback();
      }
    };

  },

  /**
   * Save an search_engines object store entry in database
   * @param {Object} data A search_engines entry
   * @param {Function} callback Runs on success
   */
  saveSearchEngine: function db_saveSearchEngine(data, callback) {
    var transaction = this._db.transaction(['search_engines'], 'readwrite');
    var objectStore = transaction.objectStore('search_engines');
    var request = objectStore.put(data);

    transaction.oncomplete = function onComplete(e) {
      if (callback) {
        callback();
      }
    };

    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save search engine');
    };

    request.onerror = function onError(e) {
      console.log('Error while saving search engine');
    };
  },

  /**
   * Get a search_engine entry by URI from database.
   * @param {String} uri URI query parameter
   * @param {Function} callback Runs with a bookmark object on success. Runs
   *                            without arguments on database not found error.
   */
  getSearchEngine: function db_getSearchEngine(uri, callback) {
    var transaction = this._db.transaction('search_engines');
    var request = transaction.objectStore('search_engines').get(uri);

    request.onsuccess = function onSuccess(event) {
      callback(event.target.result);
    };

    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to get search engine');
    };

    request.onerror = function onError(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR) {
        callback();
      }
    };
  },

  /**
   * Get all search_engines entries.
   * @param {Function} callback Runs on success with an array of search_engines
   *                            entries
   */
  getAllSearchEngines: function db_getAllSearchEngines(callback) {
    var result = [];
    var db = this._db;

    var transaction = db.transaction('search_engines');
    var objectStore = transaction.objectStore('search_engines');

    objectStore.openCursor(null, 'next').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor) {
        result.push(cursor.value);
        cursor.continue();
      }
    };
    transaction.oncomplete = function db_bookmarkTransactionComplete() {
      callback(result);
    };
  },

  /**
   * Clear search_engines object store.
   * @param {Function} callback Runs on success
   */
  clearSearchEngines: function db_clearSearchEngines(callback) {
    var db = BrowserDB.db._db;
    var transaction = db.transaction('search_engines', 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to clear search engines');
    };
    var objectStore = transaction.objectStore('search_engines');
    var request = objectStore.clear();
    request.onsuccess = function onSuccess() {
      callback();
    };
    request.onerror = function onError(e) {
      console.log('Error clearing search engines object store');
    };
  },

  /**
   * Update the settings value of the specified key.
   * @param {String} value Value
   * @param {String} key Key
   * @param {Function} callback Runs on success
   */
  updateSetting: function db_updateSetting(value, key, callback) {
    var transaction = this._db.transaction(['settings'], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to update setting');
    };

    var objectStore = transaction.objectStore('settings');

    var request = objectStore.put(value, key);

    request.onsuccess = function onSuccess(e) {
      if (callback) {
        callback();
      }
    };

    request.onerror = function onError(e) {
      console.log('Error while updating setting');
    };
  },

  /**
   * Get a setting by key from 'settings' object store.
   * @param {String} key Settings key query parameter
   * @param {Function} callback Invoked with an icon object as argument on
   *                            success. Invoked without arguments on error.
   */
  getSetting: function db_getSetting(key, callback) {
    var request = this._db.transaction('settings').
      objectStore('settings').get(key);

    request.onsuccess = function onSuccess(event) {
      callback(event.target.result);
    };

    request.onerror = function onError(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR) {
        callback();
      }
    };
  },

  /**
   * Clear settings object store.
   * @param {Function} callback Runs on success
   */
  clearSettings: function db_clearSettings(callback) {
    var db = BrowserDB.db._db;
    var transaction = db.transaction('settings', 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to clear settings');
    };
    var objectStore = transaction.objectStore('settings');
    var request = objectStore.clear();
    request.onsuccess = function onSuccess() {
      callback();
    };
    request.onerror = function onError(e) {
      console.log('Error clearing settings object store');
    };
  }

};
