'use strict';
/* global ApplicationSource */
/* global Bookmark */
/* global Collection */
/* global CollectionSource */
/* global dispatchEvent */
/* global Divider */

(function(exports) {

  const DB_VERSION = 1;

  const DB_NAME = 'home2-alpha20';

  const DB_ITEM_STORE = 'items';

  var db;

  function newTxn(storeName, txnType, withTxnAndStore, successCb) {
    var txn = db.transaction([storeName], txnType);
    var store = txn.objectStore(storeName);

    txn.oncomplete = function(event) {
      if (successCb) {
        successCb(event);
      }
    };

    txn.onerror = function(event) {
      console.warn('Error during transaction.');
    };

    withTxnAndStore(txn, store);
  }

  function ItemStore() {
    this.applicationSource = new ApplicationSource(this);
    /*this.bookmarkSource = new BookmarkSource(this);*/
    this.collectionSource = new CollectionSource(this);

    this.sources = [this.applicationSource, /*this.bookmarkSource,*/
      this.collectionSource];

    this.ready = false;

    var isEmpty = false;

    var request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onsuccess = function _onsuccess() {
      db = request.result;

      if (isEmpty) {
        this.populate(
          this.fetch.bind(this, this.synchronize.bind(this)));
      } else {
        this.initSources(
          this.fetch.bind(this, this.synchronize.bind(this)));
      }
    }.bind(this);

    request.onupgradeneeded = function _onupgradeneeded(event) {
      var db = event.target.result;

      var oldVersion = event.oldVersion || 0;
      switch (oldVersion) {
        case 0:
          // Create the item store
          var objectStore = db.createObjectStore(DB_ITEM_STORE,
            { keyPath: 'index'});

          objectStore.createIndex('index', 'index', { unique: true });
          isEmpty = true;
      }
    };
  }

  ItemStore.prototype = {

    /**
     * A list of all items. These are item objects (App, Bookmark, Divider)
     */
    _allItems: [],

    /**
     * Maintains the current index of the last grid item.
     */
    nextPosition: 0,

    /**
     * Fetches a list of all items in the store.
     */
    all: function(success) {
      if (!this.ready) {
        window.addEventListener('databaseready', this.all.bind(this, success));
        return;
      }

      success(this._allItems);
    },

    /**
     * Saves all icons to the database.
     */
    save: function(entries, callback) {
        // The initial config is simply the list of apps
        newTxn(DB_ITEM_STORE, 'readwrite', function(txn, store) {
          store.clear();
          for (var i = 0, iLen = entries.length; i < iLen; i++) {
            store.put(entries[i].detail);
          }
        }, callback);
    },

    /**
     * Fetches items from the database.
     * @param {Function} callback A function to call after fetching all items.
     */
    fetch: function(callback) {
      var collected = [];

      function iterator(value) {
        collected.push(value);
      }

      newTxn(DB_ITEM_STORE, 'readonly', function(txn, store) {
        var index = store.index('index');
        index.openCursor().onsuccess = function onsuccess(event) {
          var cursor = event.target.result;
          if (!cursor) {
            return;
          }
          iterator(cursor.value);
          cursor.continue();
        };
      }.bind(this), finish.bind(this));

      function finish() {
        /* jshint validthis: true */
        // Transforms DB results into item classes
        for (var i = 0, iLen = collected.length; i < iLen; i++) {
          var thisItem = collected[i];
          if (thisItem.type === 'app') {
            var itemObj = this.applicationSource.mapToApp(thisItem);
            this._allItems.push(itemObj);
          } else if (thisItem.type === 'divider') {
            var divider = new Divider(thisItem);
            this._allItems.push(divider);
          } else if (thisItem.type === 'bookmark') {
            var bookmark = new Bookmark(thisItem);
            this._allItems.push(bookmark);
          } else if (thisItem.type === 'collection') {
            var collection = new Collection(thisItem);
            this._allItems.push(collection);
          }
        }

        this.notifyReady();

        if (callback && typeof callback === 'function') {
          callback();
        }
      }
    },

    /**
     * We have fetched data from our local database and displayed it,
     * but data inside of our application or bookmark store may be outdated.
     * We need to synchronize each source and delete/add records.
     */
    synchronize: function() {
      this.sources.forEach(function eachSource(source) {
        source.synchronize();
      });
    },

    /**
     * Initializes all sources.
     * @param {Function} callback The callback to fire after all sources init.
     */
    initSources: function(callback) {
      var pending = this.sources.length;

      var allEntries = [];
      var self = this;

      var current = 0;
      function handleSource() {
        var source = self.sources[current];
        current++;
        source.populate(next);
      }
      handleSource();

      function next(entries) {
        allEntries = allEntries.concat(entries);
        if (!(--pending)) {
          callback(allEntries);
        } else {
          handleSource();
        }
      }
    },

    /**
     * Populates the database with the initial data.
     * @param {Function} callback Callback after database is populated.
     */
    populate: function(callback) {
      this.initSources(function(entries) {
        this.save(entries, callback);
      }.bind(this));
    },

    /**
     * Notifies consumers that the database is ready for queries to be makde.
     */
    notifyReady: function() {
      this.ready = true;
      dispatchEvent(new CustomEvent('databaseready'));
    },

    /**
     * Gets the next available position in the grid
     */
    getNextPosition: function() {
      var nextPosition = this.nextPosition;
      this.nextPosition++;
      return nextPosition;
    }

  };

  exports.ItemStore = ItemStore;

}(window));
