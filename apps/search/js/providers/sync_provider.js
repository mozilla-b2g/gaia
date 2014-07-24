/* globals DataGridProvider, Promise, Search */

/**
 * Abstract provider used to sync data from
 * a Datastore.
 * Currently data is sync in memory from the datastore
 * to perform searches.
 **/
(function(exports) {

  'use strict';

  // The last revision that we synced from the datastore, we sync
  // every time the search app gains focus
  var lastRevision = 0;

  // Reference to the datastore to sync from.
  var store;

  // Default key to index objects based on this field
  var keyIndex = 'url';


  // Walks the datastore creating a in memory
  // map of the content.
  function doSync(provider) {
    if (provider.syncing) {
      return;
    }
    provider.syncing = true;
    var cursor = store.sync(lastRevision);

    function cursorResolve(task) {
      lastRevision = task.revisionId;
      switch (task.operation) {
        // First implementation simply syncs recently used links
        // and searches most recent, this will eventually be used
        // to build an index
      case 'update':
      case 'add':
        var data = task.data;
        if (provider.filterData(data)) {
          break;
        }
        provider.add(data);
        break;
      case 'clear':
        provider.results = {};
        break;
      case 'remove':
        var id = task.target.id;
        delete provider.results[id];
        break;
      case 'done':
        provider.initialSync = false;
        provider.onDone();
        provider.syncing = false;
        return;
      }
      cursor.next().then(cursorResolve);
    }
    cursor.next().then(cursorResolve);
  }

  function SyncProvider(key) {
    keyIndex = key || keyIndex;
  }

  SyncProvider.prototype = {

    __proto__: DataGridProvider.prototype,

    // Differentiate any sync provider by it's name
    name: 'SyncProvider',

    /**
     * Subclasses will need to setup the name of the
     * daatastore that they want to sync from.
     */
    storeName: '',

    results: {},

    initialSync: true,

    // Is there a sync in progress
    syncing: false,

    /**
     * Function used to perform the matching while
     * we do the search.
     */
    matchFilter: function(obj, filter) {
      return true;
    },

    /**
     * Function used to filter witch data from
     * datastore should we load into memory
     */
    filterData: function(obj) {
      return false;
    },

    /**
     * Called when we find a search result and want
     * return a modified version of it.
     */
    adapt: function(obj, filter) {
      return obj;
    },

    limitResults: -1,

    search: function(filter) {
      var self = this;
      return new Promise((resolve, reject) => {
        var matched = 0;
        var renderResults = [];
        for (var elem in self.results) {
          var result = self.results[elem];
          if (!self.matchFilter(result, filter)) {
            continue;
          }
          renderResults.push(self.adapt(result, filter));

          if (self.limitResults !== -1 && ++matched >= self.limitResults) {
            break;
          }
        }
        resolve(renderResults);
      });
    },

    add: function(obj, key) {
      key = keyIndex || key;
      if (key in obj) {
        this.results[obj[key]] = obj;
        this.postAdd(obj, key);
      }
    },

    /**
     * Utility function to perform extra operations
     * when we add an element to the provider.
     */
    postAdd: function(obj, key) {

    },

    delete: function(key) {
      delete this.results[key];
    },

    // Called when we end with the sync process
    onDone: function() {

    },

    /**
     * Setup the listeners needed to enable/disable the
     * provider, as well as start the sync process.
     */
    init: function() {
      DataGridProvider.prototype.init.apply(this, arguments);
      this.results = {};
      Search.provider(this);
      

      var self = this;
      navigator.getDataStores(this.storeName).then(function(stores) {
        if (!stores || stores.length === 0) {
          return;
        }

        store = stores[0];
        store.onchange = function() {
          doSync(self);
        };
        doSync(self);
      });
    }

  };

  exports.SyncProvider = SyncProvider;

}(window));
