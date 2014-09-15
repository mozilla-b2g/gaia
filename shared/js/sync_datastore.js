/* globals Promise */


/**
 * Module that loads the content of a datastore into memory
 * and give access to the information stored as an object
 * which key is the id on the datastore and value the data
 * saved.
 * It allows a minimun configuration to setup:
 *  - name of the datastore to get the data from
 *  - setting whats the filed of an object used as id
 *  - setting a callback to detect changes on the data.
 *
 * Example:
 * var syncStore = new SyncDataStore('myStore', 'myField');
 * syncStore.sync().then(function() {
 *  console.log(JSON.stringify(syncStore.results));
 * });
 * syncStore.onChange = function() {
 *  console.log(JSON.stringify(syncStore.results));
 * };
 */
(function syncStore(exports) {
  'use strict';

  function onChange(evt) {
    /*jshint validthis:true */
    var self = this;
    doSync(this).then(function() {
      if (typeof self.onChangeFN === 'function') {
        self.onChangeFN(self, evt);
      }
    });
  }

  function ensureDS(SDS) {
    if (SDS.store !== null) {
      return Promise.resolve(SDS.store);
    }

    return new Promise(function(resolve, reject) {
      navigator.getDataStores(SDS.STORE_NAME).then(function(stores) {
        if (!Array.isArray(stores) || stores.length < 1) {
          reject('Could not find store ' + SDS.STORE_NAME);
          return;
        }

        // Until bug 1000829 lands, just pick the first one
        SDS.store = stores[0];
        SDS.store.addEventListener('change', onChange.bind(SDS));
        resolve(SDS);
      });
    });
  }

  /**
   * Walks all the operations happened in the datastore and
   * builds a result object in memory with the data contained
   * in the store.
   */
  function doSync(SDS) {
    if (SDS.syncInProgress) {
      return Promise.reject('Sync in progress');
    }
    SDS.syncInProgress = true;

    if (SDS.store === null) {
      return Promise.reject('Store not initialised');
    }

    return new Promise(function(resolve, reject) {
      var cursor = SDS.store.sync(SDS.lastRevision);

      function resolveCursor(task) {
        SDS.lastRevision = task.revisionId;
        switch(task.operation) {
          case 'update':
          case 'add':
            var data = task.data;
            if (SDS.keyField in data && !SDS.filterFN(data)) {
              var key = data[SDS.keyField];
              SDS.persistStore.add(key, data, SDS.store.revisionId);
            }
            break;
          case 'clear':
            SDS.persistStore.clear(SDS.store.revisionId);
            break;
          case 'remove':
            var id = task.target.id;
            SDS.persistStore.remove(id, SDS.store.revisionId);
            break;
          case 'done':
            SDS.syncInProgress = false;
            resolve();
            return;
        }
        cursor.next().then(resolveCursor);
      }

      cursor.next().then(resolveCursor);
    });
  }

  /**
   * Constructor
   * @param {string} name of the DataStore to read. Will pick
   *    the first one if we find more than one.
   * @param {string} key field in the object used as identifier
   */
  function SyncDataStore(name, persist, key) {
    this.STORE_NAME = name;
    this.store = null;
    this.synced = false;
    this.lastRevision = 0;
    this.keyField = key || 'id';
    this.onChangeFN = null;
    this.syncInProgress = false;
    this.persistStore = persist;
    this.filterFN = function() {
      return false;
    };
  }

  SyncDataStore.prototype = {
    /**
     * Returns a promise, fullfilled once we load
     * the datastore content in memory.
     * @param {string} revisionId sync from a specific revision
     */
    sync: function(revisionId) {
      this.lastRevision = revisionId || this.lastRevision;
      return ensureDS(this).then(doSync);
    },

    /**
     * Setups a callback function when the data
     * changes on the store, its called once the sync
     * process is done and we have the fresh data in memory
     * @param {function} onChange callback function
     */
    set onChange(onChange) {
      this.onChangeFN = onChange.bind(this);
    },

    /**
     * Specifies a filter function to not load data into
     * memory that matches the given filter.
     * @param {function} fn filter function
     */
    set filter(fn) {
      this.filterFN = fn;
    }
  };

  function InMemoryStore() {
    this.results = {};
  }

  InMemoryStore.prototype = {
    add: function(id, data) {
      this.results[id] = data;
    },
    update: function(id, data) {
      this.results[id] = data;
    },
    clear: function() {
      this.results = {};
    },
    remove: function(id) {
      delete this.results[id];
    }
  };

  exports.SyncDataStore = SyncDataStore;
  exports.InMemoryStore = InMemoryStore;

})(window);
