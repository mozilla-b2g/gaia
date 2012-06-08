'use strict';

var AlarmsTestDB = {

  query: function(dbName, storeName, func, callback, data) {

    var request = mozIndexedDB.open(dbName, 5);

    request.onsuccess = function(event) {
      func(request.result, storeName, callback, data);
    };

    request.onerror = function(event) {
      console.error('Can\'t open database', dbName, event);
    };

    // DB init
    request.onupgradeneeded = function(event) {
      console.log('Upgrading db');
      var db = event.target.result;
      if (db.objectStoreNames.contains(storeName))
        db.deleteObjectStore(storeName);
      db.createObjectStore(storeName, {keyPath: 'id', autoIncrement: true});
      console.log('Upgrading db done');
    };
  },

  put: function(database, storeName, callback, item) {
    var txn = database.transaction(storeName, 'readwrite');
    var store = txn.objectStore(storeName);

    var putreq = store.put(item);

    putreq.onsuccess = function(event) {
      item.id = event.target.result;
      callback(item);
    };

    putreq.onerror = function(e) {
      console.error('Add operation failure: ', database.name,
        storeName, e.message, putreq.errorCode);
    };
  },

  load: function(database, storeName, callback) {
    var alarms = [];

    var txn = database.transaction(storeName);
    var store = txn.objectStore(storeName);

    var cursor = store.openCursor(null, 'prev');
    cursor.onsuccess = function(event) {
      var item = event.target.result;
      if (item) {
        alarms.push(item.value);
        item.continue();
      } else {
        callback(alarms);
      }
    };

    cursor.onerror = function(event) {
      callback([]);
    };
  },

  get: function(database, storeName, callback, key) {
    var txn = database.transaction(storeName);
    var store = txn.objectStore(storeName);
    var request = store.get(key);

    request.onsuccess = function(event) {
      callback(request.result);
    };

    request.onerror = function(event) {
      console.error('Get operation failure: ', database.name,
        storeName, e.message, putreq.errorCode);
    };
  },

  delete: function(database, storeName, callback, key) {
      var txn = database.transaction(storeName, 'readwrite');
      var store = txn.objectStore(storeName);
      var request = store.delete(key);

      request.onsuccess = callback;

      request.onerror = function(e) {
        console.error('Delete operation failure: ', database.name,
          storeName, e.message, putreq.errorCode);
      };
  }
};
