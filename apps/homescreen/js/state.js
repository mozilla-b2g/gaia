
'use strict';

const HomeState = (function() {
  var DB_NAME = 'homescreen';
  var GRID_STORE_NAME = 'grid';
  var SV_APP_STORE_NAME = 'svAppsInstalled';
  var DB_VERSION = 2;

  var database = null;
  var initQueue = [];

  function loadInitialState(iterator, success, error) {
    var grid = Configurator.getSection('grid') || [];

    // add the actual grid pages from the configurator
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
      var oldVersion = event.oldVersion || 0;
      switch (oldVersion) {
        case 0:
          emptyDB = true;
          db.createObjectStore(GRID_STORE_NAME, { keyPath: 'index' });
          /* falls through */
        case 1:
          // This works as we're just adding a new object store.
          // Please take into accout that in case we were altering the schema
          // this wouldn't be enough
          if (!db.objectStoreNames.contains(SV_APP_STORE_NAME)) {
            db.createObjectStore(SV_APP_STORE_NAME, { keyPath: 'manifest' });
          }
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

  function saveTable(table, objectsArr, success, error) {
    if (!database) {
      if (error) {
        error('Database is not available');
      }
      return;
    }

    newTxn(table, 'readwrite', function(txn, store) {
      store.clear();
      var len = objectsArr.length;
      for (var i = 0; i < len; i++) {
        store.put(objectsArr[i]);
      }
      if (success) {
        success();
      }
    });
  }

  function loadTable(table, iterator, success, error) {
    if (!database) {
      if (error) {
        error('Database is not available');
      }
      return;
    }

    newTxn(table, 'readonly', function(txn, store) {
      store.openCursor().onsuccess = function onsuccess(event) {
        var cursor = event.target.result;
        if (!cursor)
          return;
        iterator(cursor.value);
        cursor.continue();
      };
    }, function() { success && success(); }, error);
  }

  return {
    /**
     * Initialize the database and return the homescreen state to the
     * success callback.
     */
    init: function st_init(iteratorGrid, success, error, iteratorSVApps) {
      openDB(function(emptyDB) {
        if (emptyDB) {
          loadInitialState(iteratorGrid, success, error);
          return;
        }
        HomeState.getGrid(iteratorGrid, success, error);
        HomeState.getSVApps(iteratorSVApps);
      }, error);
    },

    saveGrid: function st_saveGrid(pages, success, error) {
      saveTable(GRID_STORE_NAME, pages, success, error);
    },

    saveSVInstalledApps: function st_saveSVInstalledApps(svApps, success,
                                                         error) {
      saveTable(SV_APP_STORE_NAME, svApps, success, error);
    },

    getGrid: function st_getGrid(iterator, success, error) {
      loadTable(GRID_STORE_NAME, iterator, success, error);
    },

    getSVApps: function st_getSVApps(iterator, success, error) {
      loadTable(SV_APP_STORE_NAME, iterator, success, error);
    }
  };
})();
