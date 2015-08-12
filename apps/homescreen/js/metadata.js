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

    get: function() {
      return new Promise((resolve, reject) => {
        var results = [];
        var order_txn = this.db.transaction([DB_ORDER_STORE], 'readonly');
        order_txn.objectStore(DB_ORDER_STORE).openCursor().onsuccess =
          (event) => {
            var cursor = event.target.result;
            if (cursor) {
              results.push(cursor.value);
              cursor.continue();
            }
          };
        order_txn.oncomplete = () => {
          var icon_txn = this.db.transaction([DB_ICON_STORE], 'readonly');
          icon_txn.objectStore(DB_ICON_STORE).openCursor().onsuccess =
            (event) => {
              var cursor = event.target.result;
              if (cursor) {
                var index = results.findIndex((element) => {
                  return (element.id === cursor.value.id);
                });
                if (index !== -1) {
                  results[index].icon = cursor.value.icon;
                } else {
                  results.push(cursor.value);
                }
                cursor.continue();
              }
            };
          icon_txn.oncomplete = () => {
            resolve(results);
          };
        };
      });
    }
  };

  exports.HomeMetadata = HomeMetadata;

}(window));
