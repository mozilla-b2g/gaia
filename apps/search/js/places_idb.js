/* globals Promise */
/* globals asyncStorage */

(function (exports) {

  'use strict';

  var DB_NAME = 'places_idb_store';
  var DB_VERSION = 1;

  var PLACES_STORE = 'places';

  function PlacesIdbStore() {}

  PlacesIdbStore.prototype = {

    db: null,

    latestRevision: null,

    init: function() {
      var self = this;
      return new Promise(function(resolve, reject) {
        var req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = self.upgradeSchema;
        req.onsuccess = function(e) {
          self.db = e.target.result;
          asyncStorage.getItem('latest-revision', function(value) {
            self.latestRevision = value || 0;
            resolve();
          });
        };
      });
    },

    upgradeSchema: function (e) {
      var db = e.target.result;
      var fromVersion = e.oldVersion;
      if (fromVersion < 1) {
        var places = db.createObjectStore(PLACES_STORE, { keyPath: 'url' });
        places.createIndex('frecency', 'frecency', { unique: false });
        places.createIndex('visited', 'visited', { unique: false });
      }
    },

    add: function(id, data, rev) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction([PLACES_STORE], 'readwrite');
        txn.objectStore(PLACES_STORE).put(data);
        txn.oncomplete = this.saveAndResolve(rev, resolve);
      });
    },

    remove: function(id, rev) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction([PLACES_STORE], 'readwrite');
        txn.objectStore(PLACES_STORE).remove(id);
        txn.oncomplete = this.saveAndResolve(rev, resolve);
      });
    },

    clear: function(rev) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction(PLACES_STORE, 'readwrite');
        txn.objectStore(PLACES_STORE).clear();
        txn.oncomplete = this.saveAndResolve(rev, resolve);
      });
    },

    saveAndResolve: function(rev, resolve) {
      return function() {
        asyncStorage.setItem('latest-revision', rev);
        resolve();
      };
    },

    read: function(index, limit, done, filter) {

      var results = [];
      var txn = this.db.transaction(PLACES_STORE, 'readonly');
      var oStore = txn.objectStore(PLACES_STORE);

      oStore.index(index).openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          if (!filter || filter(cursor.value)) {
            results.push(cursor.value);
          }
          if (results.length < limit) {
            cursor.continue();
          }
        }
      };

      txn.oncomplete = function() {
        done(results.reverse());
      };
    }
  };

  exports.PlacesIdbStore = PlacesIdbStore;

})(window);
