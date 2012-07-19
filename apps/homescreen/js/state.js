
'use strict';

const HomeState = (function() {
  const DB_NAME = 'HomeScreen';
  const GRID_STORE_NAME = 'Grid';
  const DOCK_STORE_NAME = 'Dock';
  const VERSION = 2;

  var database = null;

  var onUpgradeNeeded = false;

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
        success(onUpgradeNeeded);
      };

      request.onerror = function(event) {
        error('Database error: ' + event.target.errorCode);
      };

      request.onupgradeneeded = function(event) {
        var db = event.target.result;
        var gridStore = db.createObjectStore(GRID_STORE_NAME,
                                               { keyPath: 'id' });
        gridStore.createIndex('byPage', 'id', { unique: true });
        var dockStore = db.createObjectStore(DOCK_STORE_NAME,
                                               { keyPath: 'id' });
        dockStore.createIndex('byId', 'id', { unique: true });
        onUpgradeNeeded = true;
      };
    } catch (ex) {
      error(ex.message);
    }
  }

  function newTxn(txn_type, callback, successCb, failureCb, storeName) {
    var txn = database.transaction([storeName || GRID_STORE_NAME], txn_type);
    var store = txn.objectStore(storeName || GRID_STORE_NAME);

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

    saveGrid: function(pages, success, error) {
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
    },

    saveShortcuts: function(list, success, error) {
      if (!database) {
        if (error) {
          error('Database is not available');
        }
        return;
      }

      newTxn('readwrite', function(txn, store) {
        store.put({
          id: 'shortcuts',
          shortcuts: list
        });
      }, success, error, DOCK_STORE_NAME);
    },

    getShortcuts: function(success, error) {
      if (!database) {
        if (error) {
          error('Database is not available');
        }
        return;
      }

      var result = [];
      newTxn('readonly', function(txn, store) {
        var index = store.index('byId');
        var request = index.get('shortcuts');
        request.onsuccess = function(event) {
          if (event.target.result) {
            result = event.target.result.shortcuts;
          }
        };
      }, function() { success(result) }, error, DOCK_STORE_NAME);
    }
  };
})();
