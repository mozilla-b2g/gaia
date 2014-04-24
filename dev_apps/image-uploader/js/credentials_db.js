'use strict';

function CredentialsDB(provider) {
  this.ready = false;
  this.indexes = [];
  this.provider = provider;
  this.version = 3;
  var credsdb = this;

  // Set up IndexedDB
  var indexedDB = window.indexedDB || window.mozIndexedDB;
  if (IDBObjectStore && IDBObjectStore.prototype.mozGetAll) {
    IDBObjectStore.prototype.getAll = IDBObjectStore.prototype.mozGetAll;
  }

  this.dbname = 'ImageUploader/' + this.provider;
  var openRequest = indexedDB.open(this.dbname, this.version);

  openRequest.onerror = function(e) {
    console.error('CredentialsDB():', openRequest.error.name);
  };

  openRequest.onblocked = function(e) {
    console.error('indexedDB.open() is blocked in CredentialsDB()');
  };

  // This is where we create (or delete and recreate) the database
  openRequest.onupgradeneeded = function(e) {
    var db = openRequest.result;

    // If there are already existing object stores, delete them all
    // If the version number changes we just want to start over.
    var existingStoreNames = db.objectStoreNames;
    for (var i = 0; i < existingStoreNames.length; i++) {
      db.deleteObjectStore(existingStoreNames);
    }

    // Now build the database
    var filestore = db.createObjectStore(
      'credentials', { keyPath: 'provider' }
    );
    credsdb.indexes.forEach(function(indexName)  {
      // the index name is also the keypath
      filestore.createIndex(indexName, indexName);
    });
  }

  // This is called when we've got the database open and ready.
  // Call the onready callback
  openRequest.onsuccess = function(e) {
    credsdb.db = openRequest.result;

    // Log any errors that propagate up to here
    credsdb.db.onerror = function(event) {
      console.error('CredentialsDB: ',
        event.target.error && event.target.error.name);
    }

    // We're ready now. Call the onready callback function
    credsdb.ready = true;
    if (credsdb.onready)
      credsdb.onready();
  };
}

CredentialsDB.prototype = {
  get onready() {
    return this._onready;
  },

  set onready(cb) {
    this._onready = cb;
    if (this.ready)
      setTimeout(cb.bind(this), 0);
  },

  getcreds: function(callback) {
    var all = [];
    this.enumerate(function(value) {
      if (value != null) {
        all.push(value);
      } else {
        callback(all);
      }
    });
  },

  setcreds: function(creds, callback) {
    var trans = this.db.transaction('credentials', 'readwrite');
    var store = trans.objectStore('credentials');
    var addRequest = store.add(creds);
    addRequest.onsuccess = function() {
      callback(null);
    };
    addRequest.onerror = function(e) {
      e.stopPropagation();
      callback(e);
    };
  },

  delcreds: function(screenName, callback) {
    var trans = this.db.transaction('credentials', 'readwrite');
    var store = trans.objectStore('credentials');
    var delRequest = store.delete(screenName);
    delRequest.onerror = function(e) {
      callback(e);
    };
    delRequest.onsuccess = function() {
      callback(null);
    };
  },

  enumerate: function(callback) {
    if (!this.db)
      throw Error('CredentialsDB is not ready yet. Use the onready callback');

    var store = this.db.transaction('credentials').objectStore('credentials');

    // Now create a cursor for the store or index.
    var cursorRequest = store.openCursor(null, 'next');

    cursorRequest.onsuccess = function() {
      var cursor = cursorRequest.result;
      if (cursor) {
        callback(cursor.value);
        cursor.continue();
      }
      else {
        // Final time, tell the callback that there are no more.
        callback(null);
      }
    };
  }
};
