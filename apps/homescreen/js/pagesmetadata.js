/* global AppsMetadata */
'use strict';

(function(exports) {
  const DB_ORDER_STORE = 'order';

  function PagesMetadata() {}

  PagesMetadata.prototype = Object.create(AppsMetadata.prototype);

  PagesMetadata.prototype.DB_NAME = 'pages-metadata';

  /**
   * The version of the indexed database
   */
  PagesMetadata.prototype.DB_VERSION = 1;

  PagesMetadata.prototype.upgradeSchema = function(e) {
    var db = e.target.result;
    var fromVersion = e.oldVersion;
    if (fromVersion < 1) {
      var store = db.createObjectStore(DB_ORDER_STORE, { keyPath: 'id' });
      store.createIndex('order', 'order', { unique: false });
    }
  };

  PagesMetadata.prototype.set = function(data) {
    return new Promise((resolve, reject) => {
      var txn = this.db.transaction([DB_ORDER_STORE], 'readwrite');
      for (var entry of data) {
        if (!entry.id) {
          continue;
        }

        if (typeof entry.order !== 'undefined') {
          txn.objectStore(DB_ORDER_STORE)
            .put({ id: entry.id, order: entry.order });
        }
      }
      txn.oncomplete = resolve;
      txn.onerror = reject;
    });
  };

  PagesMetadata.prototype.remove = function(id) {
    return new Promise((resolve, reject) => {
      var txn = this.db.transaction([DB_ORDER_STORE], 'readwrite');
      txn.objectStore(DB_ORDER_STORE).delete(id);
      txn.oncomplete = resolve;
      txn.onerror = reject;
    });
  };

  PagesMetadata.prototype.getAll = function(onResult) {
    return new Promise((resolve, reject) => {
      var txn = this.db.transaction([DB_ORDER_STORE], 'readonly');
      var orderStore = txn.objectStore(DB_ORDER_STORE);
      var cursor = orderStore.index('order').openCursor();
      var results = [];

      cursor.onsuccess = e => {
        var cursor = e.target.result;
        if (cursor) {
          var result = cursor.value;
          results.push(result);
          if (onResult) {
            onResult(result);
          }
          cursor.continue();
        }
      };

      txn.oncomplete = () => {
        resolve(results);
      };
    });
  };

  exports.PagesMetadata = PagesMetadata;

}(window));
