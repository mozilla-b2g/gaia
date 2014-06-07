'use strict';

// Support different versions of IndexedDB
var idb = window.indexedDB || window.webkitIndexedDB ||
  window.mozIndexedDB || window.msIndexedDB;

var BrowserDB = {
  DEFAULT_ICON_EXPIRATION: 86400000, // One day
  MAX_ICON_SIZE: 102400, // 100kB
  TOP_SITE_SCREENSHOTS: 4, // Number of top sites to keep screenshots for

  init: function browserDB_init(callback) {
    this.db.open(callback);
  },

  /**
   * Populate browser database with configuration data specified at build time.
   *
   * @param {Integer} upgradeFrom Version of database being upgraded from.
   */
  populate: function browserDB_populate(upgradeFrom, callback) {
    console.log('Populating browser database.');

    SimpleOperatorVariantHelper.getOperatorVariant((function(mcc, mnc) {
      Browser.getConfigurationData({ mcc: mcc, mnc: mnc }, (function(data) {

        // Populate bookmarks if upgrading from version 0 or below
        if (upgradeFrom < 1 && data.bookmarks) {
          data.bookmarks.forEach(function(bookmark) {
            if (!bookmark.uri || !bookmark.title)
              return;
            this.addBookmark(bookmark.uri, bookmark.title, callback);
            if (bookmark.iconUri)
              this.setAndLoadIconForPage(bookmark.uri, bookmark.iconUri);
          }, this);
        }

        // Populate search engines & settings if upgrading from below version 7
        if (upgradeFrom < 7 && data.searchEngines && data.settings) {
          var defaultSearchEngine = data.settings.defaultSearchEngine;
          if (defaultSearchEngine) {
            this.updateSetting(defaultSearchEngine,
              'defaultSearchEngine');
          }

          this.db.clearSearchEngines((function browserDB_addSearchEngines() {
            data.searchEngines.forEach(function(searchEngine) {
              if (!searchEngine.uri || !searchEngine.title ||
                !searchEngine.iconUri)
                return;
              this.addSearchEngine(searchEngine, callback);
              if (searchEngine.uri == defaultSearchEngine) {
                Browser.searchEngine = searchEngine;
              }
              this.setAndLoadIconForPage(searchEngine.uri,
                searchEngine.iconUri);
            }, this);
          }).bind(this));

        }

      }).bind(this));
    }).bind(this));
  },

  addPlace: function browserDB_addPlace(uri, callback) {
    this.db.createPlace(uri, callback);
  },

  getPlace: function browserDB_getPlace(uri, callback) {
    this.db.getPlace(uri, callback);
  },

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

  updateFrecency: function browserDB_updateFrecency(uri, callback) {
    this.db.updatePlaceFrecency(uri, callback);
  },

  updateScreenshot: function place_updateScreenshot(uri, screenshot, callback) {
    var maximum = this.TOP_SITE_SCREENSHOTS;
    this.db.getPlaceUrisByFrecency(maximum + 1, (function(topSites) {
      // Get the site that isn't quite a top site, if there is one
      if (topSites.length > maximum)
        var runnerUp = topSites.pop();

      // If uri is not one of the top sites, don't store the screenshot
      if (topSites.indexOf(uri) == -1)
        return;

      this.db.updatePlaceScreenshot(uri, screenshot);

      // If more top sites than we need screenshots, expire old screenshot
      if (runnerUp)
        this.db.updatePlaceScreenshot(runnerUp, null);

    }).bind(this));
  },

  addBookmark: function browserDB_addBookmark(uri, title, callback) {
    if (!title)
      title = uri;
    var bookmark = {
      uri: uri,
      title: title,
      timestamp: new Date().getTime()
    };
    this.addPlace(uri, (function() {
      this.db.saveBookmark(bookmark, callback);
    }).bind(this));
  },

  getBookmark: function browserDB_getBookmark(uri, callback) {
    this.db.getBookmark(uri, callback);
  },

  getBookmarks: function browserDB_getBookmarks(callback) {
    this.db.getAllBookmarks(callback);
  },

  getSearchEngines: function browserDB_getAllSearchEngines(callback) {
    this.db.getAllSearchEngines(callback);
  },

  removeBookmark: function browserDB_removeBookmark(uri, callback) {
    this.db.deleteBookmark(uri, callback);
  },

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

  setPageTitle: function browserDB_setPageTitle(uri, title, callback) {
    this.db.updatePlaceTitle(uri, title, callback);
  },

  setPageIconUri: function browserDB_setPageIconUri(uri, iconUri, callback) {
    this.db.updatePlaceIconUri(uri, iconUri, callback);
  },

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

  setAndLoadIconForPage: function browserDB_setAndLoadIconForPage(uri,
    iconUri, callback) {
    this.setPageIconUri(uri, iconUri);
    // If icon is not already cached or has expired, load it
    var now = new Date().valueOf();
    this.db.getIcon(iconUri, (function(icon) {
      if (icon && icon.expiration > now)
        return;
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

  getTopSites: function browserDB_getTopSites(maximum, filter, callback) {
    // Get the top 20 sites
    this.db.getPlacesByFrecency(maximum, filter, callback);
  },

  getHistory: function browserDB_getHistory(callback) {
    // Just get the most recent 20 for now
    this.db.getHistory(20, callback);
  },

  clearHistory: function browserDB_clearHistory(callback) {
    // Get a list of bookmarks
    this.db.getAllBookmarkUris((function(bookmarks) {
      this.db.clearHistoryExcluding(bookmarks, callback);
    }).bind(this));
  },

  addSearchEngine: function browserDB_addSearchEngine(data, callback) {
    if (!data.uri || !data.title)
      return;
    this.db.saveSearchEngine(data, callback);
  },

  getSearchEngine: function browserDB_getSearchEngine(uri, callback) {
    this.db.getSearchEngine(uri, callback);
  },

  updateSetting: function browserDB_updateSetting(key, value, callback) {
    this.db.updateSetting(key, value, callback);
  },

  getSetting: function browserDB_getSetting(key, callback) {
    this.db.getSetting(key, callback);
  }

};

BrowserDB.db = {
  _db: null,
  START_PAGE_URI: document.location.protocol + '//' + document.location.host +
    '/start.html',
  upgradeFrom: -1,

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
      if (this.upgradeFrom != -1)
        BrowserDB.populate(this.upgradeFrom);
    }).bind(this);

    request.onerror = (function onDatabaseError(e) {
      console.log('Error opening browser database');
    }).bind(this);
  },

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

  createPlace: function db_createPlace(uri, callback) {
    var transaction = this._db.transaction(['places'], 'readwrite');

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);
    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (place) {
        if (callback)
          callback();
        return;
      } else {
        place = {
          uri: uri,
          title: uri
        };
      }

      var writeRequest = objectStore.add(place);

      writeRequest.onsuccess = function onWriteSuccess(event) {
        if (callback)
          callback();
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

  getPlace: function db_getPlace(uri, callback) {
    var db = this._db;
    var request = db.transaction('places').objectStore('places').get(uri);

    request.onsuccess = function onSuccess(event) {
      callback(event.target.result);
    };

    request.onerror = function onError(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR)
        callback();
    };

  },

  updatePlace: function db_updatePlace(place, callback) {
    var transaction = this._db.transaction(['places'], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to update place: ' +
        place.uri);
    };

    var objectStore = transaction.objectStore('places');
    var request = objectStore.put(place);

    request.onsuccess = function onSuccess(e) {
      if (callback)
        callback();
    };

    request.onerror = function onError(e) {
      console.log('Error while updating place in global history store: ' +
        place.uri);
    };
  },

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
       if (callback)
         callback();
     };
  },

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
        if (filter)
          matched = self.matchesFilter(place.uri, filter) ||
            self.matchesFilter(place.title, filter);
        if (matched || !filter) {
          topSites.push(cursor.value);
        }
        cursor.continue();
      } else {
        callback(topSites, filter);
      }
    };
  },

  matchesFilter: function db_matchesFilter(uri, filter) {
    return uri.match(new RegExp(filter, 'i')) !== null;
  },

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

  clearVisits: function db_clearVisits(callback) {
    var db = BrowserDB.db._db;
    var transaction = db.transaction('visits', 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to clear visits');
    };
    var objectStore = transaction.objectStore('visits');
    var request = objectStore.clear();
    request.onsuccess = function onSuccess() {
      if (callback)
        callback();
    };
    request.onerror = function onError(e) {
      console.log('Error clearing visits object store');
    };
  },

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

  saveIcon: function db_saveIcon(iconEntry, callback) {
    var transaction = this._db.transaction(['icons'], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save icon');
    };

    var objectStore = transaction.objectStore('icons');
    var request = objectStore.put(iconEntry);

    request.onsuccess = function onSuccess(e) {
      if (callback)
        callback();
    };

    request.onerror = function onError(e) {
      console.log('Error while saving icon');
    };
  },

  getIcon: function db_getIcon(iconUri, callback) {
    var request = this._db.transaction('icons').objectStore('icons').
      get(iconUri);

    request.onsuccess = function onSuccess(event) {
      callback(event.target.result);
    };

    request.onerror = function onError(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR)
        callback();
    };
  },

  saveBookmark: function db_saveBookmark(bookmark, callback) {
    var transaction = this._db.transaction(['bookmarks'], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save bookmark');
    };

    var objectStore = transaction.objectStore('bookmarks');

    var request = objectStore.put(bookmark);

    request.onsuccess = function onSuccess(e) {
      if (callback)
        callback();
    };

    request.onerror = function onError(e) {
      console.log('Error while saving bookmark');
    };
  },

  getBookmark: function db_getBookmark(uri, callback) {
    var request = this._db.transaction('bookmarks').objectStore('bookmarks').
      get(uri);

    request.onsuccess = function onSuccess(event) {
      callback(event.target.result);
    };

    request.onerror = function onError(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR)
        callback();
    };
  },

  deleteBookmark: function db_deleteBookmark(uri, callback) {
    var transaction = this._db.transaction(['bookmarks'], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to delete bookmark');
    };

    var objectStore = transaction.objectStore('bookmarks');
    var request = objectStore.delete(uri);

    request.onsuccess = function onSuccess(event) {
      if (callback)
        callback();
    };

    request.onerror = function onError(e) {
      console.log('Error while deleting bookmark');
    };
  },

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

  updatePlaceFrecency: function db_updatePlaceFrecency(uri, callback) {
    // Don't assign frecency to the start page
    if (uri == this.START_PAGE_URI) {
      if (callback)
        callback();
      return;
    }

    var transaction = this._db.transaction(['places'], 'readwrite');

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (!place)
        return;

      if (!place.frecency) {
        place.frecency = 1;
      } else {
        // currently just frequency
        place.frecency++;
      }

      var writeRequest = objectStore.put(place);

      writeRequest.onerror = function onError() {
        console.log('Error while saving new frecency for ' + uri);
      };

      writeRequest.onsuccess = function onWriteSuccess() {
        if (callback)
          callback();
      };

    };

    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to update place: ' +
        place.uri);
    };
  },

  resetPlaceFrecency: function db_resetPlaceFrecency(uri, callback) {
    var transaction = this._db.transaction(['places'], 'readwrite');

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (!place)
        return;

      place.frecency = null;

      var writeRequest = objectStore.put(place);

      writeRequest.onerror = function onError() {
        console.log('Error while resetting frecency for ' + uri);
      };

      writeRequest.onsuccess = function onWriteSuccess() {
        if (callback)
          callback();
      };

    };

    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to reset frecency: ' +
        place.uri);
    };
  },

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
        place.uri);
    };

    transaction.onsuccess = function dbTransactionSuccess(e) {
      if (callback)
        callback();
    };
  },

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
        if (callback)
          callback();
      };

    };

    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save title for ' +
        place.uri);
    };
  },

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
        if (callback)
          callback();
      };

    };

    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save screenshot for ' +
        place.uri);
    };
  },

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
      if (callback)
        callback();
    };

  },

  saveSearchEngine: function db_saveSearchEngine(data, callback) {
    var transaction = this._db.transaction(['search_engines'], 'readwrite');
    var objectStore = transaction.objectStore('search_engines');
    var request = objectStore.put(data);

    transaction.oncomplete = function onComplete(e) {
      if (callback)
        callback();
    };

    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save search engine');
    };

    request.onerror = function onError(e) {
      console.log('Error while saving search engine');
    };
  },

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
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR)
        callback();
    };
  },

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

  updateSetting: function db_updateSetting(value, key, callback) {
    var transaction = this._db.transaction(['settings'], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to update setting');
    };

    var objectStore = transaction.objectStore('settings');

    var request = objectStore.put(value, key);

    request.onsuccess = function onSuccess(e) {
      if (callback)
        callback();
    };

    request.onerror = function onError(e) {
      console.log('Error while updating setting');
    };
  },

 getSetting: function db_getSetting(key, callback) {
    var request = this._db.transaction('settings').
      objectStore('settings').get(key);

    request.onsuccess = function onSuccess(event) {
      callback(event.target.result);
    };

    request.onerror = function onError(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR)
        callback();
    };
  },

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
