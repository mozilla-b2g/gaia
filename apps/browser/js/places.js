'use strict';

// Support different versions of IndexedDB
var idb = window.indexedDB || window.webkitIndexedDB ||
  window.mozIndexedDB || window.msIndexedDB;
IDBTransaction = IDBTransaction || {};
IDBTransaction.READ_WRITE = IDBTransaction.READ_WRITE || 'readwrite';
IDBTransaction.READ = IDBTransaction.READ || 'readonly';

var Places = {
  DEFAULT_ICON_EXPIRATION: 86400000, // One day
  TOP_SITE_SCREENSHOTS: 6, // Number of top sites to keep screenshots for

  init: function places_init(callback) {
    this.db.open(callback);
  },

  addPlace: function places_addPlace(uri, callback) {
    this.db.createPlace(uri, callback);
  },

  addVisit: function places_addVisit(uri, callback) {
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

  updateFrecency: function places_updateFrecency(uri, callback) {
    this.db.updatePlaceFrecency(uri, callback);
  },

  updateScreenshot: function place_updateScreenshot(uri, screenshot, callback) {
    this.db.getPlaceUrisByFrecency(this.TOP_SITE_SCREENSHOTS,
      (function(topSites) {
      // If uri is not one of the top sites, don't store the screenshot
      if (topSites.indexOf(uri) == -1)
        return;

      this.db.updatePlaceScreenshot(uri, screenshot);
    }).bind(this));
  },

  addBookmark: function places_addBookmark(uri, title, callback) {
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

  getBookmark: function places_getBookmark(uri, callback) {
    this.db.getBookmark(uri, callback);
  },

  getBookmarks: function places_getBookmarks(callback) {
    this.db.getAllBookmarks(callback);
  },

  removeBookmark: function places_removeBookmark(uri, callback) {
    this.db.deleteBookmark(uri, callback);
  },

  setPageTitle: function places_setPageTitle(uri, title, callback) {
    this.db.updatePlaceTitle(uri, title, callback);
  },

  setPageIconUri: function places_setPageIconUri(uri, iconUri, callback) {
    this.db.updatePlaceIconUri(uri, iconUri, callback);
  },

  setIconData: function places_setIconData(iconUri, data, callback, failed) {
    var now = new Date().valueOf();
    var iconEntry = {
      uri: iconUri,
      data: data,
      expiration: now + this.DEFAULT_ICON_EXPIRATION,
      failed: failed
    };
    this.db.saveIcon(iconEntry, callback);
  },

  setAndLoadIconForPage: function places_setAndLoadIconForPage(uri,
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
        // 0 is due to https://bugzilla.mozilla.org/show_bug.cgi?id=716491
        if (xhr.status === 200 || xhr.status === 0) {
          this.setIconData(iconUri, xhr.response, callback);
        } else {
          this.setIconData(iconUri, null, callback, true);
          console.log('error fetching icon: ' + xhr.status);
        }
      }).bind(this), false);
      xhr.onerror = function getIconError() {
        console.log('Error fetching icon');
      };
      xhr.send();
    }).bind(this));
  },

  getTopSites: function places_getTopSites(maximum, callback) {
    // Get the top 20 sites
    this.db.getPlacesByFrecency(maximum, callback);
  },

  getHistory: function places_getHistory(callback) {
    // Just get the most recent 20 for now
    this.db.getHistory(20, callback);
  },

  clearHistory: function places_clearHistory(callback) {
    // Get a list of bookmarks
    this.db.getAllBookmarkUris((function(bookmarks) {
      this.db.clearHistoryExcluding(bookmarks, callback);
    }).bind(this));
  }

};

Places.db = {
  _db: null,
  START_PAGE_URI: document.location.protocol + '//' + document.location.host +
    '/start.html',

  open: function db_open(callback) {
    const DB_VERSION = 4;
    const DB_NAME = 'browser';
    var request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (function onUpgradeNeeded(e) {
      console.log('Browser database upgrade needed, upgrading.');
      this._db = e.target.result;
      this._initializeDB();
    }).bind(this);

    request.onsuccess = (function onSuccess(e) {
      this._db = e.target.result;
      callback();
    }).bind(this);

    request.onerror = (function onDatabaseError(e) {
      console.log('Error opening browser database');
    }).bind(this);
  },

  _initializeDB: function db_initializeDB() {
    var db = this._db;

    // Create or overwrite places object store
    if (db.objectStoreNames.contains('places'))
      db.deleteObjectStore('places');
    var placesStore = db.createObjectStore('places', { keyPath: 'uri' });

    // Index places by frecency
    placesStore.createIndex('frecency', 'frecency', { unique: false });

    // Create or overwrite visits object store
    if (db.objectStoreNames.contains('visits'))
      db.deleteObjectStore('visits');
    var visitStore = db.createObjectStore('visits', { autoIncrement: true });

    // Index visits by timestamp
    visitStore.createIndex('timestamp', 'timestamp', { unique: false });

    // Create or overwrite icon cache
    if (db.objectStoreNames.contains('icons'))
      db.deleteObjectStore('icons');
    db.createObjectStore('icons', { keyPath: 'uri' });

    // Create or overwrite bookmarks object store
    if (db.objectStoreNames.contains('bookmarks'))
      db.deleteObjectStore('bookmarks');
    var bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'uri' });

    // Index bookmarks by timestamp
    bookmarkStore.createIndex('timestamp', 'timestamp', { unique: false });
  },

  createPlace: function db_createPlace(uri, callback) {
    var transaction = this._db.transaction(['places'],
      IDBTransaction.READ_WRITE);

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);
    readRequest.onsuccess = function(event) {
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

      writeRequest.onsuccess = function onsucess(event) {
        if (callback)
          callback();
      };

      writeRequest.onerror = function onerror(event) {
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

    request.onsuccess = function(event) {
      callback(event.target.result);
    };

    request.onerror = function(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR)
        callback();
    };

  },

  updatePlace: function db_updatePlace(place, callback) {
    var transaction = this._db.transaction(['places'],
      IDBTransaction.READ_WRITE);
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to update place: ' +
        place.uri);
    };

    var objectStore = transaction.objectStore('places');
    var request = objectStore.put(place);

    request.onsuccess = function onsuccess(e) {
      if (callback)
        callback();
    };

    request.onerror = function onerror(e) {
      console.log('Error while updating place in global history store: ' +
        place.uri);
    };
  },

  saveVisit: function db_saveVisit(visit, callback) {
    var transaction = this._db.transaction(['visits'],
      IDBTransaction.READ_WRITE);
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save visit');
    };

     var objectStore = transaction.objectStore('visits');
     var request = objectStore.add(visit);

     request.onerror = function onerror(e) {
       console.log('Error while adding visit to global history store');
     };

     request.onsuccess = function onsuccess(e) {
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
    visitsStore.openCursor(null, IDBCursor.PREV).onsuccess = function(e) {
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

  getPlacesByFrecency: function db_getPlacesByFrecency(maximum, callback) {
    var topSites = [];
    var db = this._db;
    var transaction = db.transaction('places');
    var placesStore = transaction.objectStore('places');
    var frecencyIndex = placesStore.index('frecency');
    frecencyIndex.openCursor(null, IDBCursor.PREV).onsuccess = function(e) {
      var cursor = e.target.result;
      if (cursor && topSites.length < maximum) {
        var place = cursor.value;
        topSites.push(cursor.value);
        cursor.continue();
      } else {
        callback(topSites);
      }
    };
  },

  getPlaceUrisByFrecency: function db_getPlaceUrisByFrecency(maximum,
    callback) {
    var topSites = [];
    var transaction = this._db.transaction('places');
    var placesStore = transaction.objectStore('places');
    var frecencyIndex = placesStore.index('frecency');
    frecencyIndex.openCursor(null, IDBCursor.PREV).onsuccess = function(e) {
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
    var db = Places.db._db;
    var transaction = db.transaction('places',
      IDBTransaction.READ_WRITE);
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to clear places');
    };
    var objectStore = transaction.objectStore('places');
    var request = objectStore.clear();
    request.onsuccess = function() {
      callback();
    };
    request.onerror = function(e) {
      console.log('Error clearing places object store');
    };
  },

  clearVisits: function db_clearVisits(callback) {
    var db = Places.db._db;
    var transaction = db.transaction('visits',
      IDBTransaction.READ_WRITE);
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to clear visits');
    };
    var objectStore = transaction.objectStore('visits');
    var request = objectStore.clear();
    request.onsuccess = function() {
      if (callback)
        callback();
    };
    request.onerror = function(e) {
      console.log('Error clearing visits object store');
    };
  },

  clearIcons: function db_clearIcons(callback) {
    var db = Places.db._db;
    var transaction = db.transaction('icons',
      IDBTransaction.READ_WRITE);
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to clear icons');
    };
    var objectStore = transaction.objectStore('icons');
    var request = objectStore.clear();
    request.onsuccess = function() {
      callback();
    };
    request.onerror = function(e) {
      console.log('Error clearing icons object store');
    };
  },

  clearBookmarks: function db_clearBookmarks(callback) {
    var db = Places.db._db;
    var transaction = db.transaction('bookmarks',
      IDBTransaction.READ_WRITE);
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to clear bookmarks');
    };
    var objectStore = transaction.objectStore('bookmarks');
    var request = objectStore.clear();
    request.onsuccess = function() {
      callback();
    };
    request.onerror = function(e) {
      console.log('Error clearing bookmarks object store');
    };
  },

  saveIcon: function db_saveIcon(iconEntry, callback) {
    var transaction = this._db.transaction(['icons'],
      IDBTransaction.READ_WRITE);
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save icon');
    };

    var objectStore = transaction.objectStore('icons');
    var request = objectStore.put(iconEntry);

    request.onsuccess = function onsuccess(e) {
      if (callback)
        callback();
    };

    request.onerror = function onerror(e) {
      console.log('Error while saving icon');
    };
  },

  getIcon: function db_getIcon(iconUri, callback) {
    var request = this._db.transaction('icons').objectStore('icons').
      get(iconUri);

    request.onsuccess = function(event) {
      callback(event.target.result);
    };

    request.onerror = function(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR)
        callback();
    };
  },

  saveBookmark: function db_saveBookmark(bookmark, callback) {
    var transaction = this._db.transaction(['bookmarks'],
      IDBTransaction.READ_WRITE);
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save bookmark');
    };

    var objectStore = transaction.objectStore('bookmarks');

    var request = objectStore.put(bookmark);

    request.onsuccess = function onsuccess(e) {
      if (callback)
        callback();
    };

    request.onerror = function onerror(e) {
      console.log('Error while saving bookmark');
    };
  },

  getBookmark: function db_getBookmark(uri, callback) {
    var request = this._db.transaction('bookmarks').objectStore('bookmarks').
      get(uri);

    request.onsuccess = function(event) {
      callback(event.target.result);
    };

    request.onerror = function(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR)
        callback();
    };
  },

  deleteBookmark: function db_deleteBookmark(uri, callback) {
    var transaction = this._db.transaction(['bookmarks'],
      IDBTransaction.READ_WRITE);
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to delete bookmark');
    };

    var objectStore = transaction.objectStore('bookmarks');
    var request = objectStore.delete(uri);

    request.onsuccess = function(event) {
      callback();
    };

    request.onerror = function onerror(e) {
      console.log('Error while deleting bookmark');
    };
  },

  getAllBookmarks: function db_getAllBookmarks(callback) {
    var bookmarks = [];
    var db = this._db;

    function makeBookmarkProcessor(bookmark) {
      return function(e) {
        var place = e.target.result;
        bookmark.title = place.title;
        bookmark.iconUri = place.iconUri;
        bookmarks.push(bookmark);
      };
    }

    var transaction = db.transaction(['bookmarks', 'places']);
    var bookmarksStore = transaction.objectStore('bookmarks');
    var placesStore = transaction.objectStore('places');
    bookmarksStore.openCursor(null, IDBCursor.PREV).onsuccess = function(e) {
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

    objectStore.openCursor(null, IDBCursor.PREV).onsuccess = function(e) {
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

    var transaction = this._db.transaction(['places'],
      IDBTransaction.READ_WRITE);

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function(event) {
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

      writeRequest.onerror = function() {
        console.log('Error while saving new frecency for ' + uri);
      };

      writeRequest.onsuccess = function() {
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
    var transaction = this._db.transaction(['places'],
      IDBTransaction.READ_WRITE);

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function(event) {
      var place = event.target.result;
      if (!place)
        return;

      place.frecency = null;

      var writeRequest = objectStore.put(place);

      writeRequest.onerror = function() {
        console.log('Error while resetting frecency for ' + uri);
      };

      writeRequest.onsuccess = function() {
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
    var transaction = this._db.transaction(['places'],
      IDBTransaction.READ_WRITE);

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function(event) {
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

      writeRequest.onerror = function() {
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
    var transaction = this._db.transaction(['places'],
      IDBTransaction.READ_WRITE);

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function(event) {
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

      writeRequest.onerror = function() {
        console.log('Error while saving title for ' + uri);
      };

      writeRequest.onsuccess = function() {
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
    var transaction = this._db.transaction(['places'],
      IDBTransaction.READ_WRITE);

    var objectStore = transaction.objectStore('places');
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function(event) {
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

      writeRequest.onerror = function() {
        console.log('Error while saving screenshot for ' + uri);
      };

      writeRequest.onsuccess = function() {
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

    var transaction = this._db.transaction(['places', 'icons'],
      IDBTransaction.READ_WRITE);
    var placesStore = transaction.objectStore('places');
    var iconStore = transaction.objectStore('icons');

    placesStore.openCursor(null, IDBCursor.PREV).onsuccess = function(e) {
      var cursor = e.target.result;
      if (cursor) {
        var place = cursor.value;
        // If not one of the exceptions then delete place and icon
        if (exceptions.indexOf(place.uri) == -1) {
          placesStore.delete(place.uri);
          iconStore.delete(place.iconUri);
        } else {
          // For exceptions, just reset frecency
          Places.db.resetPlaceFrecency(place.uri);
        }
        cursor.continue();
      }
    };
    transaction.oncomplete = function db_bookmarkTransactionComplete() {
      if (callback)
        callback();
    };

  }

};
