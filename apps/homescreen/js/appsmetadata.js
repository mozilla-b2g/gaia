'use strict';

(function(exports) {
  const DB_NAME = 'home-metadata';
  const DB_ORDER_STORE = 'order';
  const DB_ICON_STORE = 'icon';
  const DB_GROUP_STORE = 'group';
  const DB_VERSION = 2;

  function AppsMetadata() {}

  AppsMetadata.prototype = {
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
      var store;
      var db = e.target.result;
      var fromVersion = e.oldVersion;

      if (fromVersion < 1) {
        store = db.createObjectStore(DB_ORDER_STORE, { keyPath: 'id' });
        store.createIndex('order', 'order', { unique: false });
        store = db.createObjectStore(DB_ICON_STORE, { keyPath: 'id' });
        store.createIndex('icon', 'icon', { unique: false });
      }

      if (fromVersion < 2) {
        store = db.createObjectStore(DB_GROUP_STORE, { keyPath: 'id' });
        store.createIndex('group', 'group', { unique: false });
      }
    },

    set: function(data) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction(
          [DB_ORDER_STORE, DB_ICON_STORE, DB_GROUP_STORE], 'readwrite');
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
          if (typeof entry.group !== 'undefined') {
            txn.objectStore(DB_GROUP_STORE).
              put({ id: entry.id, group: entry.group });
          }
        }
        txn.oncomplete = resolve;
        txn.onerror = reject;
      });
    },

    remove: function(id) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction(
          [DB_ORDER_STORE, DB_ICON_STORE, DB_GROUP_STORE], 'readwrite');
        txn.objectStore(DB_ORDER_STORE).delete(id);
        txn.objectStore(DB_ICON_STORE).delete(id);
        txn.objectStore(DB_GROUP_STORE).delete(id);
        txn.oncomplete = resolve;
        txn.onerror = reject;
      });
    },

    getAll: function(onResult) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction(
          [DB_ORDER_STORE, DB_ICON_STORE, DB_GROUP_STORE], 'readonly');
        var orderStore = txn.objectStore(DB_ORDER_STORE);
        var iconStore = txn.objectStore(DB_ICON_STORE);
        var groupStore = txn.objectStore(DB_GROUP_STORE);
        var cursor = orderStore.index('order').openCursor();
        var results = [];

        cursor.onsuccess = e => {
          var cursor = e.target.result;
          if (cursor) {
            var result = cursor.value;
            var groupRequest = groupStore.get(result.id);
            var iconRequest = iconStore.get(result.id);
            Promise.all([
              new Promise(function(result, resolve, reject) {
                groupRequest.onsuccess = function(e) {
                  if (e.target.result) {
                    result.group = e.target.result.group;
                  }
                  resolve();
                };
              }.bind(this, result)),
              new Promise(function(result, resolve, reject) {
                iconRequest.onsuccess = function(e) {
                  if (e.target.result) {
                    result.icon = e.target.result.icon;
                  }
                  resolve();
                };
              }.bind(this, result))]).then(function(result) {
                results.push(result);
                if (onResult) {
                  onResult(result);
                }
              }.bind(this, result));
            cursor.continue();
          }
        };

        txn.oncomplete = () => {
          resolve(results);
        };
      });
    }
  };

  exports.AppsMetadata = AppsMetadata;

}(window));
