
'use strict';

const HomeState = (function() {
  const DB_NAME = 'HomeScreen';
  const GRID_STORE_NAME = 'Grid';
  const DOCK_STORE_NAME = 'Dock';
  const HIDDEN_STORE_NAME = 'Hiddens';
  const BOOKMARKS_STORE_NAME = 'Bookmarks';
  const VERSION = 3;

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

        var hiddenStore = db.createObjectStore(HIDDEN_STORE_NAME,
                                                { keyPath: 'id' });
        hiddenStore.createIndex('byId', 'id', { unique: true });

        var bookmarksStore = db.createObjectStore(BOOKMARKS_STORE_NAME,
                                                  { keyPath: 'origin' });
        bookmarksStore.createIndex('byOrigin', 'origin', { unique: true });


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

  function write(callback, success, error, storeName) {
    if (!database) {
      if (error) {
        error('Database is not available');
      }
      return;
    }

    newTxn('readwrite', function(txn, store) {
      callback(store);
    }, success, error, storeName);
  }

  function read(callback, success, error, storeName) {
    if (!database) {
      if (error) {
        error('Database is not available');
      }
      return;
    }

    newTxn('readonly', function(txn, store) {
      callback(store);
    }, success, error, storeName);
  }

  return {
    init: function st_init(success, error) {
      openDB(success, error);
    },

    saveGrid: function st_saveGrid(pages, success, error) {
      function callback(store) {
        if (Array.isArray(pages)) {
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
      };

      write(callback, success, error);
    },

    getAppsByPage: function st_getAppsByPage(iteratee, success, error) {
      var results = 0;
      function callback(store) {
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
      };

      read(callback, function() { success(results) }, error);
    },

    saveShortcuts: function st_saveShortcuts(list, success, error) {
      function callback(store) {
        store.put({
          id: 'shortcuts',
          shortcuts: list
        });
      }

      write(callback, success, error, DOCK_STORE_NAME);
    },

    getShortcuts: function st_getShortcuts(success, error) {
      var result = null;
      function callback(store) {
        var index = store.index('byId');
        var request = index.get('shortcuts');
        request.onsuccess = function(event) {
          if (event.target.result) {
            result = event.target.result.shortcuts;
          }
        };
      }

      read(callback, function() { success(result) }, error, DOCK_STORE_NAME);
    },

    saveHiddens: function st_saveHidden(list, success, error) {
      function callback(store) {
        store.put({
          id: 'hidden',
          hidden: list
        });
      }

      write(callback, success, error, HIDDEN_STORE_NAME);
    },

    getHiddens: function st_getHiddens(success, error) {
      var results = null;
      function callback(store) {
        var index = store.index('byId');
        var request = index.get('hidden');
        request.onsuccess = function(event) {
          if (event.target.result) {
            results = event.target.result.hidden;
          }
        };
      }

      read(callback, function() { success(results) }, error, HIDDEN_STORE_NAME);
    },

    saveBookmark: function st_saveBookmark(bookmark, success, error) {
      function calback(store) {
        store.put({
          origin: bookmark.url,
          bookmark: {
            url: bookmark.url,
            icon: bookmark.icon,
            name: bookmark.name
          }
        });
      }

      write(callback, success, error, BOOKMARKS_STORE_NAME);
    },

    getBookmarks: function st_getBookmarks(success, error) {
      var results = [];
      function callback(store) {
        var index = store.index('byOrigin');
        var request = index.openCursor();
        request.onsuccess = function(event) {
          var cursor = event.target.result;
          if (cursor) {
            results.push(new Bookmark(cursor.value.bookmark));
            cursor.continue();
          }
        };
      }

      read(callback, function() { success(results) }, error, BOOKMARKS_STORE_NAME);
    },

    deleteBookmark: function st_deleteBookmark(origin, success, error) {
      function callback(store) {
        store.delete(origin);
      }

      write(callback, success, error, BOOKMARKS_STORE_NAME);
    }
  };
})();
