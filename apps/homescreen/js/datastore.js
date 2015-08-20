'use strict';

(function(exports) {
  const DB_VERSION = 1;

  function Datastore(name) {
    this.name = name;
  }

  Datastore.prototype = {
    /**
     * The name of the datastore
     */
    name: '',

    /**
     * The datastore
     */
    datastore: null,

    /**
     * The last datastore revision that was synced
     */
    lastRevision: null,

    /**
     * Our local indexed db where we store our copy of bookmarks
     */
    db: null,

    get revisionName() {
      return this.name + '_revision';
    },

    get idbName() {
      return this.name + '_mirror';
    },

    get storeName() {
      return this.name + '_store';
    },

    init: function() {
      var revisionString = localStorage.getItem(this.revisionName);
      if (revisionString) {
        this.lastRevision = JSON.parse(revisionString);
      }

      var error = null;
      return new Promise(
        (resolve, reject) => {
          Promise.all([
          // Open up our mirror indexeddb
          new Promise((resolve, reject) => {
            var req = window.indexedDB.open(this.idbName, DB_VERSION);
            req.onupgradeneeded = this.upgradeSchema.bind(this);
            req.onsuccess = (e) => {
              this.db = e.target.result;
              resolve();
            };
            req.onerror = (e) => {
              console.error('Error opening datastore mirror database', e);
              error = e;
              resolve();
            };
          }),

          // Open up the shared datastore
          new Promise((resolve, reject) => {
            if (!navigator.getDataStores) {
              error = 'DataStore API is unavailable';
              resolve();
              return;
            }

            navigator.getDataStores(this.name).then((stores) => {
              if (stores.length < 1) {
                error = this.name + ' inaccessible';
                resolve();
                return;
              }

              this.datastore = stores[0];
              this.datastore.addEventListener('change',
                                              this.onChange.bind(this));
              resolve();
            }, (e) => {
              error = e;
              resolve();
            });
          })
        ]).then(() => {
          if (error) {
            console.error('Error calling navigator.getDatastores', error);
            reject(error);
          } else {
            resolve();
          }
        });
      });
    },

    upgradeSchema: function(e) {
      var db = e.target.result;
      var fromVersion = e.oldVersion;
      if (fromVersion < 1) {
        var store = db.createObjectStore(this.storeName, { keyPath: 'id' });
        store.createIndex('data', 'data', { unique: false });
      }
    },

    synchronise: function() {
      return new Promise((resolve, reject) => {
        var cursor = this.datastore.sync(this.lastRevision);

        var self = this;
        function cursorResolve(task) {
          var promises = [];
          switch (task.operation) {
            case 'update':
            case 'add':
              promises.push(self.set(task.data));
              break;

            case 'remove':
              promises.push(self.remove(task.id));
              break;

            case 'clear':
              promises.push(self.clear());
              break;

            case 'done':
              self.updateRevision();
              resolve();
              return;
          }

          promises.push(cursor.next());
          Promise.all(promises).then(
            (results) => {
              cursorResolve(results.pop());
            }, reject);
        }

        cursor.next().then(cursorResolve, reject);
      });
    },

    set: function(data) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction([this.storeName], 'readwrite');
        txn.oncomplete = function onComplete(data, resolve) {
          resolve();
          document.dispatchEvent(new CustomEvent(this.name + '-set',
                                                 { detail: { id: data.id }}));
        }.bind(this, data, resolve);
        txn.onerror = reject;
        txn.objectStore(this.storeName).put({ id: data.id, data: data });
      });
    },

    remove: function(id) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction([this.storeName], 'readwrite');
        txn.oncomplete = function onComplete(id, resolve) {
          resolve();
          document.dispatchEvent(new CustomEvent(this.name + '-removed',
                                                 { detail: { id: id }}));
        }.bind(this, id, resolve);
        txn.onerror = reject;
        txn.objectStore(this.storeName).delete(id);
      });
    },

    clear: function() {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction([this.storeName], 'readwrite');
        txn.oncomplete = function onComplete(resolve) {
          resolve();
          document.dispatchEvent(new CustomEvent(this.name + '-cleared'));
        }.bind(this, resolve);
        txn.onerror = reject;
        txn.objectStore(this.storeName).clear();
      });
    },

    updateRevision: function() {
      this.lastRevision = this.datastore.revisionId;
      localStorage.setItem(this.revisionName,
                           JSON.stringify(this.lastRevision));
    },

    onChange: function(e) {
      this.synchronise().then(() => {},
      (error) => {
        console.error('Failed to handle ' + this.name + ' change', error);
      });
    },

    get: function(id) {
      return new Promise((resolve, reject) => {
        var txn = this.db.transaction([this.storeName], 'readonly');
        txn.onerror = reject;
        txn.objectStore(this.storeName).get(id).onsuccess =
          (event) => {
            resolve(event.target.result);
          };
      });
    },

    getAll: function() {
      return new Promise((resolve, reject) => {
        var results = [];
        var txn = this.db.transaction([this.storeName], 'readonly');
        txn.onerror = reject;
        txn.objectStore(this.storeName).openCursor().onsuccess =
          (event) => {
            var cursor = event.target.result;
            if (cursor) {
              results.push(cursor.value);
              cursor.continue();
            }
          };
        txn.oncomplete = () => { resolve(results); };
      });
    }
  };

  exports.Datastore = Datastore;

}(window));
