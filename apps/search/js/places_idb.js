/* globals Promise, asyncStorage, IDBKeyRange */

(function(exports) {

  'use strict';

  var DB_NAME = 'places';
  var DB_VERSION = 3;

  var PAGES_STORE = 'pages';
  var VISITS_STORE = 'visits';

  function PlacesIdbStore() {}

  PlacesIdbStore.prototype = {

    db: null,

    latestRevision: null,

    init: function() {
      var self = this;
      return new Promise(function(resolve, reject) {
        var req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onsuccess = function(e) {
          self.db = e.target.result;
          asyncStorage.getItem('latest-revision', function(value) {
            self.latestRevision = value || 0;
            resolve();
          });
        };
      });
    },

    add: function(id, data, rev) {
      return new Promise((resolve, reject) => {
        var txn = this.db
          .transaction([PAGES_STORE, VISITS_STORE], 'readwrite');

        if (data.visits && data.visits.length === 0) {
          // Removed via browsing history clearing, let's remove it.
          this._removeUrl(id).then(this.saveAndResolve(rev, resolve));
        } else {
          txn.objectStore(PAGES_STORE).put(data);

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
        }
      });
    },

    addPlace: function(place) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction([PAGES_STORE], 'readwrite');
        txn.objectStore(PAGES_STORE).put(place);
        txn.oncomplete = resolve;
      });
    },

    remove: function(id, rev) {
      return new Promise((resolve, reject) => {
        this._removeUrl(id).then(this.saveAndResolve(rev, resolve));
      });
    },

    _removeUrl: function(id) {
      return Promise.all([
        // Remove the url from places store.
        new Promise((resolve, reject) => {
          var txn = this.db.transaction([PAGES_STORE], 'readwrite');
          txn.objectStore(PAGES_STORE).delete(id);
          txn.oncomplete = resolve;
        }),

        // Clear visits from this url.
        new Promise((resolve, reject) => {
          var txn = this.db.transaction([VISITS_STORE], 'readwrite');
          var visitsStore = txn.objectStore(VISITS_STORE);
          var urlIndex = visitsStore.index('url');
          var req = urlIndex.openCursor(IDBKeyRange.only(id));
          req.onsuccess = function() {
            var cursor = req.result;
            if (cursor) {
              visitsStore.delete(cursor.primaryKey);
              cursor.continue();
            } else {
              resolve();
            }
          };
        })
      ]);
    },

    clear: function(rev) {
      return new Promise((resolve, reject) => {
        var txn = this.db
          .transaction([PAGES_STORE, VISITS_STORE], 'readwrite');
        txn.objectStore(PAGES_STORE).clear();
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
      this.readStore(PAGES_STORE, index, limit, done, filter);
    },

    readVisits: function(limit, done, filter) {
      this.readStore(VISITS_STORE, 'date', limit, done, filter);
    }
  };

  exports.PlacesIdbStore = PlacesIdbStore;

})(window);
