define(function(require, exports) {
'use strict';

var Utils = require('utils');

var BaseIndexDB = function(objectStoreOptions) {
  this.query = function ad_query(dbName, storeName, func, callback, data) {
    var indexedDB = window.indexedDB || window.webkitIndexedDB ||
        window.mozIndexedDB || window.msIndexedDB;

    var request = indexedDB.open(dbName, 6);

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
      callback && callback(null, item);
    };

    putreq.onerror = function(e) {
      callback && callback({
        database: database,
        store: storeName,
        message: e.message,
        code: putreq.errorCode
      });
    };
  };

  this.load = function ad_load(database, storeName, callback) {
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
        callback && callback(null, alarms);
      }
    };

    cursor.onerror = function(event) {
      callback && callback(event);
    };
  };

  this.get = function ad_get(database, storeName, callback, key) {
    var txn = database.transaction(storeName);
    var store = txn.objectStore(storeName);
    var request = store.get(key);

    request.onsuccess = function(event) {
      callback && callback(null, request.result);
    };

    request.onerror = function(event) {
      callback && callback({
        database: database,
        store: storeName,
        message: event.message,
        code: request.errorCode
      });
    };
  };

  this.delete = function ad_delete(database, storeName, callback, key) {

    var txn = database.transaction(storeName, 'readwrite');
    var store = txn.objectStore(storeName);
    var request = store.delete(key);

    request.onsuccess = function(e) {
      callback && callback(null, e);
    };

    request.onerror = function(e) {
      callback && callback({
        database: database,
        store: storeName,
        message: event.message,
        code: request.errorCode
      });
    };
  };
};

exports.DBNAME = 'alarms';
exports.STORENAME = 'alarms';

  // Database methods
  exports.getAlarmList = function ad_getAlarmList(callback) {
    function getAlarmList_mapper(err, list) {
      callback(err, (list || []).map(function(x) {
        return new (require('alarm'))(x);
      }));
    }
    this.query(this.DBNAME, this.STORENAME, this.load, getAlarmList_mapper);
  };

  exports.putAlarm = function ad_putAlarm(alarm, callback) {
    this.query(this.DBNAME, this.STORENAME, this.put, callback,
      alarm.toSerializable());
  };

  exports.getAlarm = function ad_getAlarm(key, callback) {
    this.query(this.DBNAME, this.STORENAME, this.get,
      function(err, result) {
        callback(err, new (require('alarm'))(result));
      }, key);
  };

  exports.deleteAlarm = function ad_deleteAlarm(key, callback) {
    this.query(this.DBNAME, this.STORENAME, this.delete, callback, key);
  };

Utils.extend(exports, new BaseIndexDB({keyPath: 'id', autoIncrement: true}));

});
