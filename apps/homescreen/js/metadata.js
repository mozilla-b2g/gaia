'use strict';

(function(exports) {
  const DB_NAME = 'home-metadata';
  const DB_ORDER_STORE = 'order';
  const DB_ICON_STORE = 'icon';
  const DB_VERSION = 1;

  function HomeMetadata() {}

  HomeMetadata.prototype = {
    db: null,

    init: function() {
      return new Promise((resolve, reject) => {
        var req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = this.upgradeSchema;
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve();
        };
        req.onerror = (e) => {
          console.error('Error opening homescreen metadata db', e);
          reject(e);
        };
      });
    },

    upgradeSchema: function(e) {
      var db = e.target.result;
      var fromVersion = e.oldVersion;
      if (fromVersion < 1) {
        var store = db.createObjectStore(DB_ORDER_STORE, { keyPath: 'id' });
        store.createIndex('order', 'order', { unique: false });
        store = db.createObjectStore(DB_ICON_STORE, { keyPath: 'id' });
        store.createIndex('icon', 'icon', { unique: false });
      }
    },

    set: function(data) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction([DB_ORDER_STORE, DB_ICON_STORE],
                                      'readwrite');
        for (var entry of data) {
          if (!entry.id) {
            continue;
          }

          if (typeof entry.order !== 'undefined') {
            txn.objectStore(DB_ORDER_STORE).
              put({ id: entry.id, order: entry.order });
          }
          if (typeof entry.icon !== 'undefined') {
            txn.objectStore(DB_ICON_STORE).
              put({ id: entry.id, icon: entry.icon });
          }
        }
        txn.oncomplete = resolve;
        txn.onerror = reject;
      });
    },

    remove: function(id) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction([DB_ORDER_STORE, DB_ICON_STORE],
                                      'readwrite');
        txn.objectStore(DB_ORDER_STORE).delete(id);
        txn.objectStore(DB_ICON_STORE).delete(id);
        txn.oncomplete = resolve;
        txn.onerror = reject;
      });
    },

    getAll: function(onResult) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction([DB_ORDER_STORE, DB_ICON_STORE],
                                      'readonly');
        var orderStore = txn.objectStore(DB_ORDER_STORE);
        var iconStore = txn.objectStore(DB_ICON_STORE);
        var cursor = orderStore.index('order').openCursor();
        var results = [];

        cursor.onsuccess = e => {
          var cursor = e.target.result;
          if (cursor) {
            var result = cursor.value;
            var iconRequest = iconStore.get(result.id);
            iconRequest.onsuccess = function(result, e) {
              if (e.target.result) {
                result.icon = e.target.result.icon;
              }
              results.push(result);
              if (onResult) {
                onResult(result);
              }
            }.bind(this, result);
            cursor.continue();
          }
        };

        txn.oncomplete = () => {
          resolve(results);
        };
      });
    }
  };

  exports.HomeMetadata = HomeMetadata;

}(window));
