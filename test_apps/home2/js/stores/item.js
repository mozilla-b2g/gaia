'use strict';
/* global ApplicationSource */
/* global BookmarkSource */
/* global dispatchEvent */
/* global Divider */

(function(exports) {

  const DB_VERSION = 1;

  const DB_NAME = 'home2-alpha5';

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
    this.applicationSource = new ApplicationSource();
    this.bookmarkSource = new BookmarkSource();

    this.sources = [this.applicationSource, this.bookmarkSource];

    this.ready = false;

    var isEmpty = false;

    var request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onsuccess = function _onsuccess() {
      db = request.result;

      if (isEmpty) {
        this.populate(
          this.fetch.bind(this));
      } else {
        this.initSources(
          this.fetch.bind(this));
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
     */
    fetch: function() {
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
          }
        }
        this.notifyReady();
      }
    },

    /**
     * Initializes all sources.
     * @param {Function} callback The callback to fire after all sources init.
     */
    initSources: function(callback) {
      var pending = this.sources.length;

      var allEntries = [];

      this.sources.forEach(function _eachSource(source) {
        source.populate(next);
      });

      function next(entries) {
        allEntries = allEntries.concat(entries);
        if (!(--pending)) {
          callback(allEntries);
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

    notifyReady: function() {
      this.ready = true;
      dispatchEvent(new CustomEvent('databaseready'));
    }

  };

  exports.ItemStore = ItemStore;

}(window));
