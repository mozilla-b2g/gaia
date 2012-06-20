
'use strict';

const HomeState = (function() {
  const DB_NAME = 'HomeScreen';
  const STORE_NAME = 'HomeScreen';
  const VERSION = 1;

  var database = null;

  function openDB(success, error) {
    try {
      var indexedDB = window.indexedDB || window.webkitIndexedDB ||
                      window.mozIndexedDB || window.msIndexedDB;
    } catch (e) {
      error(e);
      return;
    }

    if (!indexedDB) {
      error('Indexed DB is not available!!!');
      return;
    }

    try {
      var request = indexedDB.open(DB_NAME, VERSION);
      request.onsuccess = function(event) {
        database = event.target.result;
        success();
      };

      request.onerror = function(event) {
        error('Database error: ' + event.target.errorCode);
      };

      request.onupgradeneeded = function(event) {
        var db = event.target.result;
        var objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('byPage', 'id', { unique: true });
      };
    } catch (ex) {
      error(ex.message);
    }
  }

  function newTxn(txn_type, callback, successCb, failureCb) {
    var txn = database.transaction([STORE_NAME], txn_type);
    var store = txn.objectStore(STORE_NAME);

    txn.oncomplete = function(event) {
      if (successCb) {
        successCb(event);
      }
    };

    txn.onerror = function(event) {
      var target = event.target;
      console.warn('Caught error on transaction: ' + target.error.name);

      if (failureCb) {
        failureCb(target.errorCode);
      }
    };

    callback(txn, store);
  }

  return {
    init: function(success, error) {
      openDB(success, error);
    },

    save: function(pages, success, error) {
      if (!database) {
        if (error) {
          error('Database is not available');
        }
        return;
      }

      newTxn('readwrite', function(txn, store) {
        if (Object.prototype.toString.call(pages) === '[object Array]') {
          store.clear();
          var len = pages.length;
          for (var i = 0; i < len; i++) {
            var page = pages[i];
            store.put({
              id: i,
              apps: page.getAppsList()
            });
          }
        } else {
          // Only one page
          store.put(pages);
        }
      }, success, error);
    },

    getAppsByPage: function(iteratee, success, error) {
      if (!database) {
        if (error) {
          error('Database is not available');
        }
        return;
      }

      var results = 0;
      newTxn('readonly', function(txn, store) {
        var index = store.index('byPage');
        var request = index.openCursor();
        request.onsuccess = function(event) {
          var cursor = event.target.result;
          if (cursor) {
            iteratee(cursor.value.apps);
            results++;
            cursor.continue();
          }
        };
      }, function() { success(results) }, error);
    }
  };
})();

