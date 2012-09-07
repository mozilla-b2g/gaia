/**
 * This file defines an asynchronous version of the localStorage API, backed
 * by an IndexedDB database.  It creates a global asyncStorage object that
 * has methods like the localStorage object.
 *
 * To store a value use setItem:
 *
 *   asyncStorage.setItem('key', 'value');
 *
 * If you want confirmation that the value has been stored, pass a callback
 * function as the third argument:
 *
 *  asyncStorage.setItem('key', 'newvalue', function() {
 *    console.log('new value stored');
 *  });
 *
 * To read a value, call getItem(), but note that you must supply a callback
 * function that the value will be passed to asynchronously:
 *
 *  asyncStorage.getItem('key', function(value) {
 *    console.log('The value of key is:', value);
 *  });
 *
 * removeItem(), clear(), length(), and key() are similar.
 *
 * Unit tests are in apps/gallery/test/unit/asyncStorage_test.js
 */
this.asyncStorage = (function() {

  var DBNAME = 'asyncStorage';
  var DBVERSION = 1;
  var STORENAME = 'keyvaluepairs';
  var db = null;

  function withStore(type, f) {
    if (db) {
      f(db.transaction(STORENAME, type).objectStore(STORENAME));
    } else {
      var openreq = indexedDB.open(DBNAME, DBVERSION);
      openreq.onerror = function() {
        console.error("asyncStorage: can't open database:", openreq.error.name);
      };
      openreq.onupgradeneeded = function() {
        // First time setup: create an empty object store
        openreq.result.createObjectStore(STORENAME);
      };
      openreq.onsuccess = function() {
        db = openreq.result;
        f(db.transaction(STORENAME, type).objectStore(STORENAME));
      };
    }
  }

  function getItem(key, callback) {
    withStore('readonly', function(store) {
      var req = store.get(key);
      req.onsuccess = function() {
        var value = req.result;
        if (value === undefined)
          value = null;
        callback(value);
      };
      req.onerror = function() {
        console.error('Error in asyncStorage.getItem(): ', req.error.name);
      };
    });
  }

  function setItem(key, value, callback) {
    withStore('readwrite', function(store) {
      var req = store.put(value, key);
      req.onsuccess = function() {
        callback();
      };
      req.onerror = function() {
        console.error('Error in asyncStorage.setItem(): ', req.error.name);
      };
    });
  }

  function removeItem(key, callback) {
    withStore('readwrite', function(store) {
      var req = store.delete(key);
      req.onsuccess = function() {
        callback();
      };
      req.onerror = function() {
        console.error('Error in asyncStorage.removeItem(): ', req.error.name);
      };
    });
  }

  function clear(callback) {
    withStore('readwrite', function(store) {
      var req = store.clear();
      req.onsuccess = function() {
        callback();
      };
      req.onerror = function() {
        console.error('Error in asyncStorage.clear(): ', req.error.name);
      };
    });
  }

  function length(callback) {
    withStore('readonly', function(store) {
      var req = store.count();
      req.onsuccess = function() {
        callback(req.result);
      };
      req.onerror = function() {
        console.error('Error in asyncStorage.length(): ', req.error.name);
      };
    });
  }

  function key(n, callback) {
    if (n < 0) {
      callback(null);
      return;
    }

    withStore('readonly', function(store) {
      var advanced = false;
      var req = store.openCursor();
      req.onsuccess = function() {
        var cursor = req.result;
        if (!cursor) {
          // this means there weren't enough keys
          callback(null);
          return;
        }
        if (n === 0) {
          // We have the first key, return it if that's what they wanted
          callback(cursor.key);
        } else {
          if (!advanced) {
            // Otherwise, ask the cursor to skip ahead n records
            advanced = true;
            cursor.advance(n);
          } else {
            // When we get here, we've got the nth key.
            callback(cursor.key);
          }
        }
      };
      req.onerror = function() {
        console.error('Error in asyncStorage.key(): ', req.error.name);
      };
    });
  }

  return {
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    clear: clear,
    length: length,
    key: key
  };
}());
