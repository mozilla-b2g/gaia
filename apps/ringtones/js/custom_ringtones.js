'use strict';

this.customRingtones = function() {
  var DBNAME = 'customRingtones';
  var DBVERSION = 1;
  var STORENAME = 'customRingtones';
  var db = null;

  function withStore(type, f) {
    if (db) {
      f(db.transaction(STORENAME, type).objectStore(STORENAME));
    } else {
      var openreq = indexedDB.open(DBNAME, DBVERSION);
      openreq.onerror = function withStoreOnError() {
        console.error("asyncStorage: can't open database:", openreq.error.name);
      };
      openreq.onupgradeneeded = function withStoreOnUpgradeNeeded() {
        openreq.result.createObjectStore(STORENAME, { autoIncrement: true });
      };
      openreq.onsuccess = function withStoreOnSuccess() {
        db = openreq.result;
        f(db.transaction(STORENAME, type).objectStore(STORENAME));
      };
    }
  }

  function add(name, callback) {
    withStore('readwrite', function addBody(store) {
      var req = store.add(name);
      if (callback) {
        req.onsuccess = function setItemOnSuccess() {
          callback();
        };
      }
      req.onerror = function setItemOnError() {
        console.error('Error in customRingtones.add(): ', req.error.name);
      };
    });
  }

  function list(callback) {
    withStore('readonly', function listBody(store) {
      var req = store.openCursor();
      req.onsuccess = function setItemOnSuccess(event) {
        var cursor = event.target.result;
        if (cursor) {
          callback(cursor.value);
          cursor.continue();
        }
      };
      req.onerror = function setItemOnError() {
        console.error('Error in customRingtones.list(): ', req.error.name);
      };
    });
  }

  return {
    add: add,
    list: list
  };
}();
