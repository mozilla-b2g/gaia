/* globals BroadcastChannel, PlacesHelper */
'use strict';

(function(exports) {
  const BC_NAME = 'places';

  function PinnedPlaces() {}

  PinnedPlaces.prototype = {
    db: null,
    storeName: null,

    init: function(store) {
      this.storeName = store;

      this.broadcast = new BroadcastChannel(BC_NAME);
      this.broadcast.onmessage = this.handleBroadcast.bind(this);

      return new Promise((resolve, reject) => {
        var req =
          window.indexedDB.open(PlacesHelper.DB_NAME, PlacesHelper.DB_VERSION);

        // Note, we don't provide onupgradeneeded. It's expected the system
        // will initialise this database as needed and that system and
        // homescreen won't be updated out-of-sync.

        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve();
        };
        req.onerror = (e) => {
          console.error('Error opening places db', e);
          reject(e);
        };
        req.onupgradeneeded = PlacesHelper.upgradeDb;
      });
    },

    unpin: function(url) {
      return new Promise((resolve, reject) => {
        this.get(url).then(place => {
          var txn = this.db.transaction([this.storeName], 'readwrite');
          place.pinned = false;
          txn.objectStore(this.storeName).put(place);
          txn.onerror = reject;
          txn.oncomplete = () => {
            // TODO: Send message on broadcast channel about removal(?)
            document.dispatchEvent(
              new CustomEvent(this.storeName + '-unpinned',
                              { detail: { url: place.id }}));
            resolve();
          };
        }, reject);
      });
    },

    get: function(url) {
      return new Promise((resolve, reject) => {
        if (!url) {
          return reject();
        }

        var txn = this.db.transaction([this.storeName], 'readonly');
        txn.onerror = reject;
        txn.objectStore(this.storeName).get(url).onsuccess =
          event => {
            if (event.target.result) {
              resolve(event.target.result);
            } else {
              reject();
            }
          };
      });
    },

    getAll: function(onResult) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction([this.storeName], 'readonly');
        var store = txn.objectStore(this.storeName);
        var results = [];

        store.openCursor().onsuccess = event => {
          var cursor = event.target.result;
          if (cursor) {
            if (cursor.value.pinned) {
              results.push(cursor.value);
              if (onResult) {
                onResult(cursor.value);
              }
            }
            cursor.continue();
          } else {
            resolve(results);
          }
        };
      });
    },

    handleBroadcast: function(message) {
      if (message.type !== 'message' || !message.data || !message.data.type) {
        return;
      }

      switch (message.data.type) {
        case 'sitePinned':
          if (this.storeName === 'sites') {
            break;
          }
          return;

        case 'pagePinned':
          if (this.storeName === 'pages') {
            break;
          }
          return;

        default:
          return;
      }

      document.dispatchEvent(
        new CustomEvent(this.storeName + '-pinned',
                        { detail: { url: message.data.url }}));
    }
  };

  exports.PinnedPlaces = PinnedPlaces;

}(window));
