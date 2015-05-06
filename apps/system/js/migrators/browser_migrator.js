'use strict';
/* global BookmarksDatabase */
/* global Places */
// https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabaseException
// IDBDatabaseException obselete

/** Support different browser versions of IndexedDB */
var idb = window.indexedDB || window.webkitIndexedDB ||
    window.mozIndexedDB || window.msIndexedDB;

/**
 * Provide access to bookmarks, topsites, history, search engines and settings
 * in IndexedDB.
 * @namespace BrowserDB
 */
var BrowserDB = {
  init: function browserDB_init(callback) {
    this.db.open(callback);
  },

  /**
   * Get all bookmarks.
   * @param {Function} callback Runs on success with an array of bookmarks
   */
  getBookmarks: function browserDB_getBookmarks(callback) {
    this.db.getAllBookmarks(callback);
  },

  /**
   * Reads visits from the database.
   */
  readVisits: function browserDB_readVisits() {
    return this.db.readVisits();
  },

  removeDB: function browserDB_removeDB() {
    this.db.removeDB();
  }
};

/**
 * @memberOf BrowserDB
 * @namespace BrowserDB.db
 */
BrowserDB.db = {
  _db: null,
  upgradeFrom: -1,

  /**
   * Open a IndexedDB database with name as 'browser' and version as 7.
   * @param {Function} callback The callback to be run on success
   */
  open: function db_open(callback) {
    const DB_VERSION = 7;
    const DB_NAME = 'browser';
    var request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (function onUpgradeNeeded(e) {
      console.log('Browser db upgrade needed, migrating so doesn\'t matter.');
      this._db = e.target.result;
    }).bind(this);

    request.onsuccess = (function onSuccess(e) {
      this._db = e.target.result;
      callback();
    }).bind(this);

    request.onerror = (function onDatabaseError(e) {
      console.log('Error opening browser database');
    }).bind(this);
  },

  removeDB: function db_remove() {
    this._db.close();
    var request = window.indexedDB.deleteDatabase('browser');
    request.onsuccess = function onSuccess(e) {
      console.log('Browser Database migrated and deleted!');
    };
    request.onerror = function onSuccess(e) {
      console.log('Database not deleted!');
    };
  },
  
  getAllBookmarks: function db_getAllBookmarks(callback) {
    var bookmarks = [];
    var db = this._db;

    function makeBookmarkProcessor(bookmark) {
      return function(e) {
        var place = e.target.result;
        bookmark.iconUri = place.iconUri;
        bookmarks.push(bookmark);
      };
    }

    var transaction = db.transaction(['bookmarks', 'places']);
    var bookmarksStore = transaction.objectStore('bookmarks');
    var bookmarksIndex = bookmarksStore.index('timestamp');
    var placesStore = transaction.objectStore('places');
    bookmarksIndex.openCursor(null, 'prev').onsuccess =
        function onSuccess(e) {
          var cursor = e.target.result;
          if (cursor) {
            var bookmark = cursor.value;
            placesStore.get(bookmark.uri).onsuccess =
                makeBookmarkProcessor(bookmark);
            cursor.continue();
          }
        };
    transaction.oncomplete = function db_bookmarkTransactionComplete() {
      callback(bookmarks);
    };
  },

  readVisits: function db_readHistory() {

    var places = {};
    var db = this._db;

    var transaction = db.transaction(['visits']);
    var bookmarksStore = transaction.objectStore('visits');
    var bookmarksIndex = bookmarksStore.index('timestamp');

    function onCursor(e) {

      var cursor = e.target.result;
      if (cursor) {

        if (!(cursor.value.uri in places)) {
          places[cursor.value.uri] = {
            visits: []
          };
        }

        var place = places[cursor.value.uri];

        if (cursor.value.title) {
          place.title = cursor.value.title;
        }

        place.visits.unshift(cursor.value.timestamp);

        if (place.visits.length > 20) {
          place.visits.length = 20;
        }
        cursor.continue();
      }
    }

    return new Promise(function(resolve) {
      transaction.oncomplete = function() {
        resolve(places);
      };
      bookmarksIndex.openCursor(null, 'prev').onsuccess = onCursor;
    });
  }
};

var BrowserMigrator = function BrowserMigrator() {
};

BrowserMigrator.prototype = {
  /**
   * A list of pending bookmarks to migrate.
   */
  _pendingBookmarks: [],

  start: function() {

    BrowserDB.init(() => {
      BrowserDB.readVisits().then(visits => {
        this._saveVisits(visits).then(() => {
          BrowserDB.getBookmarks(bookmarks => {
            this._pendingBookmarks = bookmarks;
            this._iteratePendingBookmarks();
          });
        });
      });
    });
  },

  _saveVisits: function(visits) {

    var urls = Object.keys(visits);
    var places = new Places();

    return new Promise(function(resolve) {

      function saveVisit() {

        if (!urls.length) {
          resolve();
          return;
        }

        var url = urls.shift();
        places.setVisits(url, visits[url].visits).then(saveVisit);
      }

      places.start().then(saveVisit);
    });
  },

  _iteratePendingBookmarks: function() {
    // If there are no bookmarks left, we're done
    if (!this._pendingBookmarks.length) {
      BrowserDB.removeDB();
      window.close();
      return;
    }

    var nextBookmark = this._pendingBookmarks.shift();
    var descriptor = {
      id: nextBookmark.uri,
      url: nextBookmark.uri,
      name: nextBookmark.title,
      icon: nextBookmark.iconUri
    };

    BookmarksDatabase.add(descriptor).then(() => {
      this._iteratePendingBookmarks();
    });
  }
};
