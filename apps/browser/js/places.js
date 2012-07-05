'use strict';

// Support different versions of IndexedDB
var idb = window.indexedDB || window.webkitIndexedDB ||
  window.mozIndexedDB || window.msIndexedDB;
IDBTransaction = IDBTransaction || {};
IDBTransaction.READ_WRITE = IDBTransaction.READ_WRITE || 'readwrite';
IDBTransaction.READ = IDBTransaction.READ || 'readonly';

var Places = {
  DEFAULT_ICON_EXPIRATION: 86400000, // One day

  init: function gh_init(callback) {
    this.db.open(callback);
  },

  addPlace: function gh_addPlace(uri, callback) {
    var place = {
      uri: uri,
      // Set the title to the URI for now, until a real title is received.
      title: uri
    };
    this.db.getPlace(place.uri, (function(existingPlace) {
      if (!existingPlace)
        this.db.savePlace(place, callback);
    }).bind(this));
  },

  addVisit: function gh_addVisit(uri, callback) {
    this.addPlace(uri);
    var visit = {
      uri: uri,
      timestamp: new Date().getTime()
    };
    this.db.saveVisit(visit, callback);
  },

  addBookmark: function gh_addBookmark(uri, title, callback) {
    if (!title)
      title = uri;
    var bookmark = {
      uri: uri,
      title: title,
      timestamp: new Date().getTime()
    };
    this.db.saveBookmark(bookmark, callback);
  },

  getBookmark: function gh_getBookmark(uri, callback) {
    this.db.getBookmark(uri, callback);
  },

  removeBookmark: function gh_removeBookmark(uri, callback) {
    this.db.deleteBookmark(uri, callback);
  },

  setPageTitle: function gh_setPageTitle(uri, title, callback) {
    this.db.getPlace(uri, (function(place) {
      // If place already exists, just set title
      if (place) {
        place.title = title;
      // otherwise create new place
      } else {
        place = {
          uri: uri,
          title: title
        };
      }
      this.db.updatePlace(place, callback);
    }).bind(this));

  },

  setPageIconUri: function gh_setPageIconUri(uri, iconUri, callback) {
    // Set icon URI for corresponding place URI
    this.db.getPlace(uri, (function(place) {
      // if place already exists, just set icon
      if (place) {
        place.iconUri = iconUri;
      // otherwise create a new place
      } else {
        place = {
          uri: uri,
          title: uri,
          iconUri: iconUri
        };
      }
      if (callback) {
        this.db.updatePlace(place, callback);
      } else {
        this.db.updatePlace(place);
      }
    }).bind(this));
  },

  setIconData: function gh_setIconData(iconUri, data, callback, failed) {
    var now = new Date().valueOf();
    var iconEntry = {
      uri: iconUri,
      data: data,
      expiration: now + this.DEFAULT_ICON_EXPIRATION,
      failed: failed
    };
    this.db.saveIcon(iconEntry, callback);
  },

  setAndLoadIconForPage: function gh_setAndLoadIconForPage(uri,
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

  getHistory: function gh_getHistory(callback) {
    // Just get the most recent 20 for now
    this.db.getHistory(20, callback);
  }

};

Places.db = {
  _db: null,

  open: function db_open(callback) {
    const DB_VERSION = 3;
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
    db.createObjectStore('places', { keyPath: 'uri' });

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

  savePlace: function db_savePlace(place, callback) {
    var transaction = this._db.transaction(['places'],
      IDBTransaction.READ_WRITE);
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save place: ' +
        place.uri);
    };

    var objectStore = transaction.objectStore('places');

    var request = objectStore.add(place);

    request.onsuccess = function onsuccess(e) {
      if (callback)
        callback();
    };

    request.onerror = function onerror(e) {
      if (e.target.error.name == 'ConstraintError') {
        e.preventDefault();
      } else {
        console.log(e.target.error.name +
          ' error while adding place to global history store with URL ' +
          place.uri);
      }
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
  }

};
