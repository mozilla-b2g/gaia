'use strict';
/* global ApplicationSource */
/* global BookmarkSource */
/* global CollectionSource */
/* global configurator */
/* global dispatchEvent */
/* global GaiaGrid */

(function(exports) {

  const DB_VERSION = 1;

  const DB_NAME = 'verticalhome';

  const DB_ITEM_STORE = 'items';
  const DB_SV_APP_STORE_NAME = 'svAppsInstalled';

  var db;

  function sort(entries, order) {

    if (!order || !order.length) {
      return entries;
    }

    var newEntries = [];
    function isEqual(lookFor, compareWith) {
      if (!compareWith.detail || !lookFor) {
        return false;
      }
      if (compareWith instanceof GaiaGrid.Mozapp) {
        if (!lookFor.manifestURL || !compareWith.detail.manifestURL) {
          return false;
        }
        if (compareWith.detail.entryPoint) {
          return lookFor.manifestURL === compareWith.detail.manifestURL &&
                 lookFor.entry_point === compareWith.detail.entryPoint;
        } else {
          return lookFor.manifestURL === compareWith.detail.manifestURL;
        }
      } else if (compareWith instanceof GaiaGrid.Collection ||
                 compareWith instanceof GaiaGrid.Bookmark) {
        if (!lookFor.id || !compareWith.detail.id) {
          return false;
        }
        return lookFor.id === compareWith.detail.id;
      }
    }

    for (var i = 0, iLen = order.length; i < iLen; i++) {
      // Add all entries of current section
      for (var j = 0, jLen = order[i].length; j < jLen; j++) {
        var ind = entries.findIndex(
                           isEqual.bind(null, order[i][j]));
        if (ind >= 0) {
          newEntries.push(entries.splice(ind,1)[0]);
        }
      }
      // If we have more sections add a divider
      if (i < iLen - 1) {
        newEntries.push(new GaiaGrid.Divider());
      }
    }
    // If entries is not empty yet, they could be unordered apps (added at end)
    // or SingleVariant apps, installed before vertical started, which we need
    // insert it in their correct position (ever if there was a first run with
    // SIM).
    if (entries.length > 0) {
      // We only reorder sv apps if SIM was present on first boot!
      if (configurator.isSimPresentOnFirstBoot) {
        sortUnclassifiedApps(newEntries, entries);
      } else {
        newEntries.push(new GaiaGrid.Divider());
        newEntries = newEntries.concat(entries);
      }
    }

    for (i = 0, iLen = newEntries.length; i < iLen; i++) {
      if (newEntries[i].detail) {
        newEntries[i].detail.index = i;
      }
    }
   return newEntries;
  }

  function sortUnclassifiedApps(dstEntries, orgEntries) {
    function compareApps(appA, appB) {
      var svAppA = configurator.getSingleVariantApp(appA.detail.manifestURL);
      var svAppB = configurator.getSingleVariantApp(appB.detail.manifestURL);
      var locA = svAppA && svAppA.location !== undefined && svAppA.location ||
                 Number.MAX_VALUE;
      var locB = svAppB && svAppB.location !== undefined && svAppB.location ||
                 Number.MAX_VALUE;

      var relPos = locA - locB;
      return relPos ? (relPos > 0 ? 1 : -1) : 0;
    }

    // To simplify the process, we order the apps first (SV apps in relative
    // order and at the beginning of the array)
    orgEntries.sort(compareApps);

    // After the sorting process, if the first element is not a SV app then
    // we only need to add them at the end of dstEntries
    if (!configurator.getSingleVariantApp(orgEntries[0].detail.manifestURL)) {
      dstEntries.push(new GaiaGrid.Divider());
      dstEntries = dstEntries.concat(orgEntries);
    } else {
      var sepAdded = false;
      for (var i = 0, iLen = orgEntries.length; i < iLen; i++) {
        var app = orgEntries[i];
        var svApp = configurator.getSingleVariantApp(app.detail.manifestURL);
        if (!svApp) {
          if (!sepAdded) {
            dstEntries.push(new GaiaGrid.Divider());
            sepAdded = true;
          }
          dstEntries.push(app);
        } else {
          if (svApp.location !== undefined) {
            dstEntries.splice(svApp.location, 0, app);
          } else {
            dstEntries.push(app);
          }
        }
      }
    }
  }

  function loadTable(table, indexName, iterator, aNext) {
    newTxn(table, 'readonly', function(txn, store) {
      var index = store.index(indexName);
      index.openCursor().onsuccess = function onsuccess(event) {
        var cursor = event.target.result;
        if (!cursor) {
          return;
        }
        iterator(cursor.value);
        cursor.continue();
      };
    }, aNext);
  }

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

  function ItemStore(onsuccess) {
    var self = this;
    this.applicationSource = new ApplicationSource(this);
    this.bookmarkSource = new BookmarkSource(this);
    this.collectionSource = new CollectionSource(this);

    this.sources = [this.applicationSource, this.bookmarkSource,
                    this.collectionSource];

    this.ready = false;

    var isEmpty = false;
    self.gridOrder = null;

    var request = window.indexedDB.open(DB_NAME, DB_VERSION);

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
          var objectSV = db.createObjectStore(DB_SV_APP_STORE_NAME,
            { keyPath: 'manifestURL' });
          objectSV.createIndex('indexSV', 'indexSV', { unique: true });
      }
    };

    request.onsuccess = function _onsuccess() {
      onsuccess && onsuccess(isEmpty);
      db = request.result;
      var cb = self.fetch.bind(self, self.synchronize.bind(self));

      if (isEmpty) {
        window.addEventListener('configuration-ready', function onReady() {
          window.removeEventListener('configuration-ready', onReady);
          self.gridOrder = configurator.getGrid();
          self.populate(cb);
        });
      } else {
        self.initSources(cb);
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

    saveTable: function(table, objArr, column, checkPersist, aNext) {
      newTxn(table, 'readwrite', function(txn, store) {
        store.clear();
        for (var i = 0, iLen = objArr.length; i < iLen; i++) {
          if (!checkPersist || (checkPersist && objArr[i].persistToDB)) {
            store.put(column?objArr[i][column]:objArr[i]);
          }
        }
        if (typeof aNext === 'function') {
          aNext();
        }
      });
    },

    /**
     * @param {Object} object a single object to update.
     * @param {Function} callback fires when transaction finishes.
     */
    saveItem: function(object, callback) {
      // intentional use of == meaning null or undefined.
      if (object.index == null) {
        console.error('Attempting to save object without `index`');
        return;
      }

      newTxn(
        DB_ITEM_STORE,
        'readwrite',
        function(txn, store) {
          store.put(object);
        },
        callback
      );
    },

    /**
     * Saves all icons to the database.
     */
    save: function(entries, aNext) {
      entries = sort(entries, this.gridOrder);
      this.gridOrder = null;
      // The initial config is simply the list of apps
      this.saveTable(DB_ITEM_STORE, entries, 'detail', true, aNext);
    },

    /**
     * Save reference to SingleVariant app previously installed
     */
    savePrevInstalledSvApp: function(svApps, aNext) {
      this.saveTable(DB_SV_APP_STORE_NAME, svApps, null, false, aNext);
    },

    /**
     * Fetches items from the database.
     * @param {Function} callback A function to call after fetching all items.
     */
    fetch: function(callback) {
      var cached = {};
      var collected = [];

      function iterator(value) {
        collected.push(value);
      }

      function iteratorSV(value) {
        /* jshint validthis: true */
        this.applicationSource.addPreviouslyInstalledSvApp(value.manifestURL);
      }

      loadTable(DB_SV_APP_STORE_NAME, 'indexSV', iteratorSV.bind(this));
      loadTable(DB_ITEM_STORE, 'index', iterator, finish.bind(this));

      /**
       * Add to _allItems if the record is unique by comparing the identifier.
       */
      function addIfUnique(item) {
        /* jshint validthis: true */
        if (!cached[item.identifier]) {
          cached[item.identifier] = true;
          this._allItems.push(item);
        }
      }

      function finish() {
        /* jshint validthis: true */
        // Transforms DB results into item classes
        for (var i = 0, iLen = collected.length; i < iLen; i++) {
          var thisItem = collected[i];
          if (thisItem.type === 'app') {
            var itemObj = this.applicationSource.mapToApp(thisItem);
            addIfUnique.call(this, itemObj);
          } else if (thisItem.type === 'divider') {
            var divider = new GaiaGrid.Divider(thisItem);
            this._allItems.push(divider);
          } else if (thisItem.type === 'bookmark') {
            var bookmark = new GaiaGrid.Bookmark(thisItem);
            addIfUnique.call(this, bookmark);
          } else if (thisItem.type === 'collection') {
            var collection = new GaiaGrid.Collection(thisItem);
            addIfUnique.call(this, collection);
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
