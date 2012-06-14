'use strict';

var indexedDB = window.indexedDB || window.webkitIndexedDB ||
  window.mozIndexedDB || window.msIndexedDB;

var GlobalHistory = {
  init: function gh_init(callback) {
    this.db.open(callback);
  },

  addPlace: function gh_addPlace(uri, callback) {
    var place = {
      uri: uri,
      // Set the title to the URI for now, until a real title is received.
      title: uri
    };
    this.db.savePlace(place, callback);
  },

  addVisit: function gh_addVisit(uri) {
    this.addPlace(uri);
    var visit = {
      uri: uri,
      timestamp: new Date().getTime()
    };
    this.db.saveVisit(visit);
  },

  setPageTitle: function gh_setPageTitle(uri, title, callback) {
    var place = {
      uri: uri,
      title: title
    };
    this.db.updatePlace(place, callback);
  },

  setPageIcon: function gh_setPageIcon(uri, icon, callback) {
    this.db.getPlace(uri, function(place) {
      // if place already exists, just set icon
      if (place) {
        place.icon = icon;
      } else { // otherwise create a new place
        place = {
          uri: uri,
          title: uri,
          icon: icon
        };
      }
      GlobalHistory.db.updatePlace(place, callback);
    });
  },

  getHistory: function gh_getHistory(callback) {
    // Just get the most recent 20 for now
    this.db.getHistory(20, callback);
  }

};

GlobalHistory.db = {
  _db: null,

  open: function db_open(callback) {
    const DB_VERSION = 1;
    const DB_NAME = 'browser';
    var request = indexedDB.open(DB_NAME, DB_VERSION);

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
    var placeStore = db.createObjectStore('places', { keyPath: 'uri' });

    // Create or overwrite visits object store
    if (db.objectStoreNames.contains('visits'))
      db.deleteObjectStore('visits');
    var visitStore = db.createObjectStore('visits', { autoIncrement: true });

    // Index visits by timestamp
    visitStore.createIndex('timestamp', 'timestamp', { unique: false });
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

  saveVisit: function db_saveVisit(visit) {
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
  },

  getHistory: function db_getHistory(maximum, callback) {
    var history = [];
    var db = this._db;

    function makeVisitProcessor(visit) {
      return function(e) {
          var place = e.target.result;
          visit.title = place.title;
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
    var db = GlobalHistory.db._db;
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
    var db = GlobalHistory.db._db;
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
  }

};
