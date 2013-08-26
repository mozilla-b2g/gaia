
'use strict';

const HomeState = (function() {
  var DB_NAME = 'homescreen';
  var GRID_STORE_NAME = 'grid';
  var DB_VERSION = 1;

  var database = null;
  var initQueue = [];

  function loadInitialState(iterator, success, error) {
    var grid = Configurator.getSection('grid') || [];

    for (var i = 0; i < grid.length; i++) {
      grid[i] = {
        index: i,
        icons: grid[i]
      };
    }

    HomeState.saveGrid(grid, function onSaveGrid() {
      grid.forEach(iterator);
      success();
    }, error);
  }

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

    var request;
    var emptyDB = false;

    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (ex) {
      error(ex.message);
      return;
    }

    request.onsuccess = function(event) {
      database = event.target.result;
      success(emptyDB);
    };

    request.onerror = function(event) {
      error('Database error: ' + event.target.errorCode);
    };

    request.onupgradeneeded = function(event) {
      var db = event.target.result;
      if (event.oldVersion == 0) {
        emptyDB = true;
        db.createObjectStore(GRID_STORE_NAME, { keyPath: 'index' });
      }
    };
  }

  function newTxn(storeName, txn_type, callback, successCb, failureCb) {
    if (!database) {
      initQueue.push(newTxn.bind(null, storeName, txn_type, callback,
                                 successCb, failureCb));
      return;
    }

    var txn = database.transaction([storeName], txn_type);
    var store = txn.objectStore(storeName);

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
    /**
     * Initialize the database and return the homescreen state to the
     * success callback.
     */
    init: function st_init(iterator, success, error) {
      openDB(function(emptyDB) {
        if (emptyDB) {
          loadInitialState(iterator, success, error);
          return;
        }
        HomeState.getGrid(iterator, success, error);
      }, error);
    },

    saveGrid: function st_saveGrid(pages, success, error) {
      if (!database) {
        if (error) {
          error('Database is not available');
        }
        return;
      }

      newTxn(GRID_STORE_NAME, 'readwrite', function(txn, store) {
        store.clear();
        var len = pages.length;
        for (var i = 0; i < len; i++) {
          store.put(pages[i]);
        }
        if (success) {
          success();
        }
      });
    },

    getGrid: function st_getGrid(iterator, success, error) {
      if (!database) {
        if (error) {
          error('Database is not available');
        }
        return;
      }

      newTxn(GRID_STORE_NAME, 'readonly', function(txn, store) {
        store.openCursor().onsuccess = function onsuccess(event) {
          var cursor = event.target.result;
          if (!cursor)
            return;

          iterator(cursor.value);
          cursor.continue();
        };
      }, function() { success(); }, error);
    }
  };
})();
