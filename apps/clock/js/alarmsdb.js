'use strict';

// extend function from Angus Crolls article about mixins
function extend(destination, source) {
  for (var k in source) {
    if (source.hasOwnProperty(k)) {
      destination[k] = source[k];
    }
  }
  return destination;
}

var BaseIndexDB = function(objectStoreOptions) {
  this.query = function ad_query(dbName, storeName, func, callback, data) {
    var indexedDB = window.indexedDB || window.webkitIndexedDB ||
        window.mozIndexedDB || window.msIndexedDB;

    var request = indexedDB.open(dbName, 5);

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
      db.createObjectStore(storeName, objectStoreOptions);
      console.log('Upgrading db done');
    };
  };

  this.put = function ad_put(database, storeName, callback, item) {
    var txn = database.transaction(storeName, 'readwrite');
    var store = txn.objectStore(storeName);

    var putreq = store.put(item);

    putreq.onsuccess = function(event) {
      item.id = event.target.result;
      if (typeof callback === 'function')
        callback(item);
    };

    putreq.onerror = function(e) {
      console.error('Add operation failure: ', database.name,
        storeName, e.message, putreq.errorCode);
    };
  };

  this.load = function ad_load(database, storeName, callback) {
    if (typeof callback !== 'function')
      callback = function() {};

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
  };

  this.get = function ad_get(database, storeName, callback, key) {
    if (typeof callback !== 'function')
      callback = function() {};

    var txn = database.transaction(storeName);
    var store = txn.objectStore(storeName);
    var request = store.get(key);

    request.onsuccess = function(event) {
      callback(request.result);
    };

    request.onerror = function(event) {
      console.error('Get operation failure: ', database.name,
        storeName, event.message, request.errorCode);
    };
  };

  this.delete = function ad_delete(database, storeName, callback, key) {
    if (typeof callback !== 'function')
      callback = function() {};

    var txn = database.transaction(storeName, 'readwrite');
    var store = txn.objectStore(storeName);
    var request = store.delete(key);

    request.onsuccess = callback;

    request.onerror = function(e) {
      console.error('Delete operation failure: ', database.name,
        storeName, e.message, request.errorCode);
    };
  };
};

var AlarmsDB = {
  DBNAME: 'alarms',
  STORENAME: 'alarms',

  // Database methods
  getAlarmList: function ad_getAlarmList(callback) {
    this.query(this.DBNAME, this.STORENAME, this.load, callback);
  },

  putAlarm: function ad_putAlarm(alarm, callback) {
    this.query(this.DBNAME, this.STORENAME, this.put, callback, alarm);
  },

  getAlarm: function ad_getAlarm(key, callback) {
    this.query(this.DBNAME, this.STORENAME, this.get, callback, key);
  },

  deleteAlarm: function ad_deleteAlarm(key, callback) {
    this.query(this.DBNAME, this.STORENAME, this.delete, callback, key);
  }
};

extend(AlarmsDB, new BaseIndexDB({keyPath: 'id', autoIncrement: true}));
