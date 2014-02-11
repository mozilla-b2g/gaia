'use strict';

this.customRingtones = function() {
  function CustomRingtone(name, id, blob) {
    this.name = name;
    this.id = id;
    this._blob = blob;
  }

  CustomRingtone.prototype = {
    get url() {
      // Lazily get the URL for the blob, but once we've done it once, we don't
      // need to use the getter again. XXX: We could be smarter here and have a
      // way of revoking URLs when we're done with them.
      return this.url = URL.createObjectURL(this.blob);
    },

    getBlob: function(callback) {
      callback(this._blob);
    }
  };

  var DBNAME = 'customRingtones';
  var DBVERSION = 1;
  var STORENAME = 'customRingtones';
  var db = null;

  function makeToneId(id) {
    return 'custom:' + id;
  }

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

  function add(name, blob, callback) {
    withStore('readwrite', function addBody(store) {
      var req = store.add({name: name, blob: blob});
      if (callback) {
        req.onsuccess = function addOnSuccess(event) {
          var id = makeToneId(event.target.result);
          callback(new CustomRingtone(name, id, blob));
        };
      }
      req.onerror = function addOnError() {
        console.error('Error in customRingtones.add(): ', req.error.name);
      };
    });
  }

  function list(callback) {
    withStore('readonly', function listBody(store) {
      var req = store.openCursor();
      req.onsuccess = function listOnSuccess(event) {
        var cursor = event.target.result;
        if (cursor) {
          callback(new CustomRingtone(
            cursor.value.name, makeToneId(cursor.key), cursor.value.blob
          ));
          cursor.continue();
        }
      };
      req.onerror = function listOnError() {
        console.error('Error in customRingtones.list(): ', req.error.name);
      };
    });
  }

  return {
    add: add,
    list: list
  };
}();
