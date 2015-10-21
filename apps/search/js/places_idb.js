/* globals Promise */
/* globals asyncStorage */

(function (exports) {

  'use strict';

  var DB_NAME = 'places_idb_store';
  var DB_VERSION = 2;

  var PLACES_STORE = 'places';
  var VISITS_STORE = 'visits';

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

      if (fromVersion < 2) {
        asyncStorage.removeItem('latest-revision');
        var visits = db.createObjectStore(VISITS_STORE, { keyPath: 'date' });
        visits.createIndex('date', 'date', { unique: true });
      }
    },

    add: function(id, data, rev) {
      return new Promise((resolve, reject) => {
        var txn = this.db
          .transaction([PLACES_STORE, VISITS_STORE], 'readwrite');
        txn.objectStore(PLACES_STORE).put(data);

        if (!data.visits) {
          data.visits = [data.visited];
        }

        var visitsStore = txn.objectStore(VISITS_STORE);
        data.visits.forEach(function(date) {
          visitsStore.put({
            date: date,
            url: data.url,
            title: data.title,
            icons: data.icons
          });
        });

        txn.oncomplete = this.saveAndResolve(rev, resolve);
      });
    },

    addPlace: function(place) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction([PLACES_STORE], 'readwrite');
        txn.objectStore(PLACES_STORE).put(place);
        txn.oncomplete = resolve;
      });
    },

    remove: function(id, rev) {
      return new Promise((resolve, reject) => {
        var stores = [VISITS_STORE, PLACES_STORE];
        var txn = this.db.transaction(stores, 'readwrite');
        txn.objectStore(PLACES_STORE).delete(id);
        // When an element is removed, we assume that the browsing history was
        // cleared, so we can empty all of the visits store.
        txn.objectStore(VISITS_STORE).clear();
        txn.oncomplete = this.saveAndResolve(rev, resolve);
      });
    },

    clear: function(rev) {
      return new Promise((resolve, reject) => {
        var stores = [VISITS_STORE, PLACES_STORE];
        var txn = this.db.transaction(stores, 'readwrite');
        txn.objectStore(PLACES_STORE).clear();
        txn.objectStore(VISITS_STORE).clear();
        txn.oncomplete = this.saveAndResolve(rev, resolve);
      });
    },

    saveAndResolve: function(rev, resolve) {
      return function() {
        asyncStorage.setItem('latest-revision', rev);
        resolve();
      };
    },

    readStore: function(store, index, limit, done, filter) {
      var results = [];
      var txn = this.db.transaction(store, 'readonly');
      var oStore = txn.objectStore(store);

      oStore.index(index).openCursor(null, 'prev').onsuccess = function(event) {
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
        done(results);
      };
    },

    read: function(index, limit, done, filter) {
      this.readStore(PLACES_STORE, index, limit, done, filter);
    },

    readVisits: function(limit, done, filter) {
      this.readStore(VISITS_STORE, 'date', limit, done, filter);
    }
  };

  exports.PlacesIdbStore = PlacesIdbStore;

})(window);
