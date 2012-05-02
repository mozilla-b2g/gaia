var indexedDB = window.indexedDB || window.webkitIndexedDB ||
  window.mozIndexedDB || window.msIndexedDB;

var GlobalHistory = {
  addPlace: function gh_addPlace(uri) {
    var place = {
      uri: uri,
      // Set the title to the URI for now, until a real title is received.
      title: uri
    };
    this.db.savePlace(place);
  },

  addVisit: function gh_addVisit(uri) {
    this.addPlace(uri);
    var visit = {
      uri: uri,
      timestamp: new Date().getTime()
    };
    this.db.saveVisit(visit);
  },

  setPageTitle: function gh_setPageTitle(uri, title) {
    var place = {
      uri: uri,
      title: title
    };
    this.db.updatePlace(place);
  }

};

GlobalHistory.db = {
  _db: null,

  open: function db_open() {
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
      console.log('Successfully opened browser database');
    }).bind(this);

    request.onerror = (function onDatabaseError(e) {
      console.log('Error opening browser database: ' + e.target.errorCode);
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

    console.log("Initialised browser's global history database");
  },

  savePlace: function db_savePlace(place) {
    var transaction = this._db.transaction(['places'],
      IDBTransaction.READ_WRITE);
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to save place: ' +
        place.uri);
    };

    var objectStore = transaction.objectStore('places');
    var request = objectStore.add(place);

    request.onsuccess = function onsuccess(e) {
      console.log('Successfully wrote place to global history store: ' +
        place.uri);
    };

    request.onerror = function onerror(e) {
      console.log('Error while adding place to global history store: ' +
        place.uri);
    };
  },

  updatePlace: function db_updatePlace(place) {
    var transaction = this._db.transaction(['places'],
      IDBTransaction.READ_WRITE);
    transaction.onerror = function dbTransactionError(e) {
      console.log('Transaction error while trying to update place: ' +
        place.uri);
    };

    var objectStore = transaction.objectStore('places');
    var request = objectStore.put(place);

    request.onsuccess = function onsuccess(e) {
      console.log('Successfully updated place in global history store: ' +
        place.uri);
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

     request.onsuccess = function onsuccess(e) {
       console.log('Successfully wrote visit to global history store');
     };

     request.onerror = function onerror(e) {
       console.log('Error while adding visit to global history store');
     };
  }

};
