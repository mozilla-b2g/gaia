'use strict';

/* exported SyncBrowserDB */
/* global Browser */
/* global Awesomescreen */
/* global IDBDatabaseException */
/* global IDBKeyRange */

const DBOS_PLACES = 'sync_places';
const DBOS_VISITS = 'sync_visits';
const DBOS_ICONS = 'sync_icons';
const DBOS_BOOKMARKS = 'sync_bookmarks';
var idb = window.indexedDB;

/**
 * Provide access to bookmarks, topsites, and history in IndexedDB.
 * @namespace SyncBrowserDB
 */
var SyncBrowserDB = {
  /**
   * How long is a icon expired in database in miliseconds.
   * Default to 1 day.
   */
  DEFAULT_ICON_EXPIRATION: 86400000, // One day
  DEFAULT_TYPE_HISTORY: 'History',
  DEFAULT_TYPE_BOOKMARK: 'Bookmark',
  /**
   * Maximum icon file size allowed.
   * Default to 100kB.
   */
  MAX_ICON_SIZE: 102400, // 100kB
  variantObserver: null,
  browserTitle: null,

  /**
   * Initialization. Open a database.
   */
  init: function browserDB_init() {
    this.db.open();
  },

  /**
   * Add a DBOS_PLACES entry for the uri.
   * @param {String} uri The uri to be added
   * @param {Function} callback Runs when it finishs
   */
  addPlace: function browserDB_addPlace(uri, callback) {
    this.db.placeMaxCheck(uri, (function() {
      this.db.createPlace(uri, callback);
    }).bind(this));
  },

  /**
   * Add a raw history entry to DBOS_PLACES store.
   * @param {String} history The history to be added
   * @param {Function} callback Runs when it finishs
   */
  updateRawHistory: function browserDB_updateRawPlace(history, callback) {
    this.db.createRawHistory(history, callback);
  },

  /**
   * Get a place by URI from DBOS_PLACES object store.
   * @param {String} uri URI query parameter
   * @param {Function} callback Invoked with an icon object as argument on
   *                            success. Invoked without arguments on error.
   */
  getPlace: function browserDB_getPlace(uri, callback) {
    this.db.getPlace(uri, callback);
  },

  /**
   * Save the current time of the visit and update frequency (view count).
   * @param {String} uri A visited URI to be saved
   * @param {Function} callback Runs on frequency (view count) updated
   */
  addVisit: function browserDB_addVisit(uri, callback) {

    var urlTitle = uri;
    if(SyncBrowserDB.browserTitle) {
      urlTitle = SyncBrowserDB.browserTitle;
    }

    var visit = {
      uri: uri,
      title: urlTitle,
      timestamp: new Date().getTime()
    };
    this.addPlace(uri, (function() {
      this.db.visitMaxCheck(uri, (function() {
        this.db.saveVisit(visit, (function() {
          this.updateFrecency(uri, callback);
        }).bind(this));
      }).bind(this));
    }).bind(this));
  },

  /**
   * Remove visit to the oldest of URL.
   * @param {String} uri A visited URI to be saved
   * @param {Function} callback Runs on topsite delete
   */
  oldVisitDelete: function browserDB_oldVisitDelete(uri, callback) {
      this.removeHistory(uri,callback);
  },

  /**
   * Update the visit(title) of the specified URI,
   * @param {String} uri A visited URI to be saved
   * @param {String} title A visited title to be saved
   * @param {Function} callback Runs on frequency (view count) updated
   */
  updateVisit: function browserDB_updateVisit(uri, title, callback) {
    var visit = {
      uri: uri,
      title: title,
      timestamp: new Date().getTime()
    };
    this.db.visitMaxCheck(uri, (function() {
      this.db.saveVisit(visit, callback);
    }).bind(this));
  },

  /**
   * Update the frequency(view count) of the specified URI,
   * if the URI has been visited.
   * @param {String} uri The URI to be updated
   * @param {Function} callback Runs if the URI is the start page or
   *                            the update process is successful
   */
  updateFrecency: function browserDB_updateFrecency(uri, callback) {
    this.db.updatePlaceFrecency(uri, callback);
  },

  /**
   * Update a screenshot by URI if the URI is in top sites.
   * @param {String} uri URI query parameter
   * @param {Blob} screenshot A webpage screenshot taken using
   *                          HTMLIFrameElement.getScreenshot
   * @param {Function} callback Runs on success
   */
  updateScreenshot: function place_updateScreenshot(uri, screenshot, callback) {
    var maximum = Browser.MAX_TOPSITE_LIST;
    this.db.getPlaceUrisByFrecency(maximum + 1, (function(topSites) {
      var runnerUp;
      // Get the site that isn't quite a top site, if there is one
      if (topSites.length > maximum) {
        runnerUp = topSites.pop();
      }

      // If uri is not one of the top sites, don't store the screenshot
      if (topSites.indexOf(uri) == -1) {
        return;
      }

      this.db.updatePlaceScreenshot(uri, screenshot);

      // If more top sites than we need screenshots, expire old screenshot
      if (runnerUp) {
        this.db.updatePlaceScreenshot(runnerUp, null);
      }

    }).bind(this));
  },

  /**
   * Add a bookmark into database.
   * @param {String} data New bookmark record
   * @param {Function} callback Runs on success
   */
  addBookmark: function browserDB_addBookmark(data, callback) {
    data.timestamp = data.timestamp || new Date().getTime();
    if (data.type === 'bookmark') {
      this.addPlace(data.bmkUri, (function() {
        this.db.saveBookmark(data, callback);
      }).bind(this));
    } else {
      this.db.saveBookmark(data, callback);
    }
  },

  /**
   * Get a bookmark by an indexes object from database.
   * @param {String} indexes Indexes Object query parameter. The parameters
   *                         can be id, bmkUri, or parentid.
   * @param {Function} callback Runs with a bookmark object on success. Runs
   *                            without arguments on error.
   */
  getBookmark: function browserDB_getBookmark(indexes, callback) {
    if (typeof indexes === 'string') {
      this.db.getBookmark(indexes, callback);
    } else if (indexes.id) {
      this.db.getBookmark(indexes.id, callback);
    } else if (indexes.bmkUri) {
      this.db.getBookmarkByUri(indexes.bmkUri, callback);
    } else if (indexes.parentid) {
      this.db.getBookmarkByParentId(indexes.parentid, callback);
    } else {
      callback(null);
    }
  },

  /**
   * Get all bookmarks.
   * @param {Function} callback Runs on success with an array of bookmarks
   */
  getBookmarks: function browserDB_getBookmarks(callback) {
    this.db.getAllBookmarks(callback);
  },

  /**
   * Delete a bookmark by ID
   * @param {String} id ID
   * @param {Function} callback
   */
  removeBookmark: function browserDB_removeBookmark(id, callback) {
    this.db.deleteBookmark(id, (function() {
      this.db.deleteIconUrl(id, this.DEFAULT_TYPE_BOOKMARK, callback);
    }).bind(this));
  },

  /**
   * Get history by timestamp range at (start < record.timestamp <= end)
   * @param {Function} callback Runs on success with an array of history
   */
  getHistoryByTime: function browserDB_getHistoryByTime(start, end, callback) {
    this.db.getHistoryByTime(start, end, callback);
  },

  /**
   * Delete a history by URI
   * @param {String} uri URI
   * @param {Function} callback
   */
  removeHistory: function browserDB_removeHistory(uri, callback) {
    this.db.deleteHistory(uri, (function() {
      this.db.deleteIconUrl(uri, this.DEFAULT_TYPE_HISTORY, callback);
    }).bind(this));
  },

  /**
   * Delete a topste by URI
   * @param {String} uri URI
   * @param {Function} callback
   */
  removeTopsite: function browserDB_removeTopsite(uri, callback) {
    this.db.deleteTopsite(uri, callback);
  },
  /**
   * Add/Update a bookmark in database.
   * @param {String} data New bookmark record
   * @param {Function} callback Runs on success
   */
  updateBookmark: function browserDB_updateBookmark(data, callback) {
    this.db.getBookmark(data.id, (function(bookmark) {
      if (bookmark) {
        this.db.saveBookmark(data, callback);
      } else {
        this.addBookmark(data, callback);
      }
    }).bind(this));
  },

  /**
   * Add/Update a bookmark in database without updating places.
   * @param {String} data New bookmark record
   * @param {Function} callback Runs on success
   */
  updateRawBookmark: function browserDB_updateBookmark(data, callback) {
    this.db.saveBookmark(data, callback);
  },

  /**
   * Create/Update page title in database.
   * @param {String} uri URI query parameter
   * @param {String} title Page title
   * @param {Function} callback Runs on success
   */
  setPageTitle: function browserDB_setPageTitle(uri, title, callback) {
    SyncBrowserDB.browserTitle = title;
    if(!title){
      title = uri;
    }
    this.db.placeMaxCheck(uri, (function() {
      this.db.updatePlaceTitle(uri, title, (function() {
        this.updateVisit(uri, title, callback);
      }).bind(this));
    }).bind(this));
  },

  /**
   * Save iconUri in DBOS_PLACES object store in database.
   * @param {String} uri URI
   * @param {String} iconUri Base64 encoded image string
   * @param {Function} callback Runs on success
   */
  setPageIconUri: function browserDB_setPageIconUri(uri, iconUri, callback) {
    this.db.updatePlaceIconUri(uri, iconUri, callback);
  },

  /**
   * Create a DBOS_ICONS object store entry and save it in database.
   * @param {String} iconUri Base64 encoded image string
   * @param {Blob} data Image Blob
   * @param {Function} callback Runs on success
   * @param {Boolean} failed Specify if the image Blob data is successfully
   *                         saved
   */
  setIconData:
    function browserDB_setIconData(uri, iconUri, data, callback, failed) {
    var now = new Date().valueOf();
    var iconEntry = {
      uri: uri,
      iconUri: iconUri,
      data: data,
      expiration: now + this.DEFAULT_ICON_EXPIRATION,
      failed: failed
    };
    this.db.saveIcon(iconEntry, callback);
  },

  /**
   * Load the image icon and save it to IndexedDB.
   * @param {String} uri URI
   * @param {String} iconUri Base64 encoded image string
   * @param {Function} callback Run on saving to IndexedDB successful
   */
  setAndLoadIconForPage: function browserDB_setAndLoadIconForPage(uri,
    iconUri, callback) {
    this.setPageIconUri(uri, iconUri);
    // If icon is not already cached or has expired, load it
    var now = new Date().valueOf();
    this.db.getIcon(uri, iconUri, (function(icon) {
      if (icon && icon.expiration > now) {
        //return;
      }
      var xhr = new XMLHttpRequest({mozSystem: true});
      xhr.open('GET', iconUri, true);
      xhr.responseType = 'blob';
      xhr.addEventListener('load', (function() {
        // Check icon was successfully downloded
        // 0 is due to https://bugzilla.mozilla.org/show_bug.cgi?id=716491
        if (!(xhr.status === 200 || xhr.status === 0)) {
          //this.setIconData(iconUri, null, callback, true);
          this.setIconData(uri, Awesomescreen.DEFAULT_FAVICON,
                           null, callback, true);
          console.error('error downloading icon: ' + xhr.status);
          return;
        }

        var blob = xhr.response;
        // Check the file is served as an image and isn't too big
        if (blob.type.split('/')[0] != 'image' ||
        blob.size > this.MAX_ICON_SIZE) {
          this.setIconData(uri, iconUri, null, callback, true);
          console.error('Icon was not an image or was too big');
          return;
        }

        // Only save the icon if it can be loaded as an image bigger than 0px
        var img = document.createElement('img');
        var src = window.URL.createObjectURL(blob);
        img.src = src;
        img.onload = (function() {
          if (img.naturalWidth > 0) {
            this.setIconData(uri, iconUri, blob, callback);
          } else {
           this.setIconData(uri, iconUri, null, callback, true);
           console.error('Icon not saved because less than 1px wide');
          }
          window.URL.revokeObjectURL(src);
        }).bind(this);
        img.onerror = (function() {
          this.setIconData(uri, iconUri, null, callback, true);
          console.error('Icon not saved because can not be decoded');
          window.URL.revokeObjectURL(src);
        }).bind(this);

      }).bind(this), false);
      xhr.onerror = function getIconError() {
        console.error('Error fetching icon');
      };
      xhr.send();
    }).bind(this));
  },

  /**
   * Add a DBOS_PLACES entry of the URI.
   * @param {String} uri The URI to be added in DB
   * @param {String} title
   * @param {Number} frequency View count of the specified URI
   * @param {Function} callback Runs when it finishs
   */
  addTopSite: function browserDB_addTopSite(uri, title, frequency, callback) {
    this.addPlace(uri, (function() {
      this.db.initPlaceFrecency(uri, title, frequency, callback);
    }).bind(this));
  },

  /**
   * Get top sites.
   * @param {Number} maximum The maximum number of top sites to get
   * @param {String} filter URI filter. Pass in null to ignore.
   * @param {Function} callback Run on success with topsites array and filter
   *                            as arguments.
   */
  getTopSites: function browserDB_getTopSites(maximum, filter, callback) {
    // Get the top 9 sites
    this.db.getPlacesByFrecency(maximum, filter, callback);
  },

  /**
   * Get default configured top sites.
   * @param {Function} callback Run on success with default top sites array.
   */
  getDefaultTopSites: function browserDB_getDefaultTopSites(callback) {
    this.db.getDefaultPlaces(callback);
  },

  /**
   * Get the latest 20 history entries.
   * @param {Function} callback Run with array of history entries
   */
  getHistory: function browserDB_getHistory(callback) {
    // Just get the most recent 20 for now
    this.db.getHistory(Browser.MAX_HISTORY_LIST, callback);
  },

  /**
   * Clear history and keep bookmarks.
   * @param {Function} callback Runs on success
   */
  clearHistory: function browserDB_clearHistory(callback) {
    // Get a list of bookmarks
    this.db.clearHistoryExcluding(callback);

  }

};

/**
 * @memberOf SyncBrowserDB
 * @namespace SyncBrowserDB.db
 */
SyncBrowserDB.db = {
  _db: null,
  START_PAGE_URI: document.location.protocol + '//' + document.location.host +
    '/start.html',
  /** Version of database being upgraded from */
  upgradeFrom: -1,

  /**
   * Open a IndexedDB database with name as 'browser' and version as 7.
   * @param {Function} callback The callback to be run on success
   */
  open: function db_open() {
    const DB_VERSION = 7;
    const DB_NAME = 'fxsync_browser';
    var request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (function onUpgradeNeeded(e) {
      console.log('Browser database upgrade needed, upgrading.');
      this.upgradeFrom = e.oldVersion;
      this._db = e.target.result;
      this.upgrade();
    }).bind(this);

    request.onsuccess = (function onSuccess(e) {
      this._db = e.target.result;
    }).bind(this);

    request.onerror = (function onDatabaseError(e) {
      console.error('Error opening browser database');
    }).bind(this);
  },

  /**
   * Create/Update object stores:
   *  places
   *  visits
   *  icons
   *  bookmarks
   */
  upgrade: function db_upgrade() {
    var db = this._db;
    var upgradeFrom = this.upgradeFrom;
    if (upgradeFrom < 1) {
      var placesStore = db.createObjectStore(DBOS_PLACES, { keyPath: 'uri' });
      // Index places by frecency
      placesStore.createIndex('frecency', 'frecency', { unique: false });
      var visitStore = db.createObjectStore(DBOS_VISITS, {
        keyPath: 'uri' ,
        autoIncrement: true
      });
      // Index visits by timestamp
      visitStore.createIndex('timestamp', 'timestamp', { unique: false });
      db.createObjectStore(DBOS_ICONS, { keyPath: 'uri' });
      var bookmarkStore = db.createObjectStore(DBOS_BOOKMARKS, {
        keyPath: 'id'
      });
      // Index bookmarks by timestamp
      bookmarkStore.createIndex('timestamp', 'timestamp', { unique: false });
      bookmarkStore.createIndex('bmkUri', 'bmkUri', { unique: false });
      bookmarkStore.createIndex('parentid', 'parentid', { unique: false });
    }
  },

  /**
   * Create a new DBOS_PLACES entry of the URI if there's none.
   * @param {String} uri The uri to be inserted
   * @param {Function} callback Runs when the entry exists or a new entry
   *                            created
   */
  createPlace: function db_createPlace(uri, callback) {
    var title = uri;
    if (SyncBrowserDB.browserTitle) {
      title = SyncBrowserDB.browserTitle;
      SyncBrowserDB.browserTitle = null;
    }

    var transaction = this._db.transaction([DBOS_PLACES], 'readwrite');

    var objectStore = transaction.objectStore(DBOS_PLACES);
    var readRequest = objectStore.get(uri);
    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (place) {
        if (callback) {
          callback();
        }
        return;
      } else {
        place = {
          uri: uri,
          title: title
        };
      }

      var writeRequest = objectStore.add(place);

      writeRequest.onsuccess = function onWriteSuccess(event) {
        if (callback) {
          callback();
        }
      };

      writeRequest.onerror = function onError(event) {
        console.error('error writing place');
      };
    };

    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to save place ' +
        uri);
    };
  },

  /**
   * Create a new raw entry of the history if there's none.
   * @param {String} history The history to be inserted
   * @param {Function} callback Runs when the entry exists or a new entry
   *                            created
   */
  createRawHistory: function db_createRawHistory(history, callback) {
    var transaction = this._db.transaction([DBOS_VISITS], 'readwrite');
    var objectStore = transaction.objectStore(DBOS_VISITS);
    var readRequest = objectStore.get(history.uri);
    readRequest.onsuccess = function onReadSuccess(event) {
      var existingPlace = event.target.result;
      var writeRequest;
      if (existingPlace) {
        existingPlace.title = history.title;
        existingPlace.timestamp = history.timestamp;
        writeRequest = objectStore.put(history);
      } else {
        writeRequest = objectStore.add(history);
      }

      writeRequest.onsuccess = function onWriteSuccess(event) {
        if (callback) {
          callback();
        }
      };

      writeRequest.onerror = function onError(event) {
        console.error('error writing history');
      };
    };

    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to save history ', history);
    };
  },

  /**
   * Save an places object store entry in database
   * @param {Object} places A visits entry
   * @param {Function} callback Runs on success
   */
  placeMaxCheck: function db_placeMaxCheck(uri, callback) {
    var db = this._db;
    var transaction = this._db.transaction([DBOS_PLACES], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to count places');
    };

    var objectStore = transaction.objectStore(DBOS_PLACES);
    var readRequest = objectStore.get(uri);
    readRequest.onsuccess = function onReadSuccess(event) {
      var places = event.target.result;
      if (places) {
        if (callback) {
          callback();
        }
      } else {
        //count check
        var request = objectStore.count();
        request.onsuccess = function onReadSuccess(event) {
          var count = event.target.result;
          if (count < Browser.MAX_TOPSITE_LIST) {
            if (callback) {
              callback();
            }
          }else{
            var transaction = db.transaction([DBOS_PLACES]);
            var placesStore = transaction.objectStore(DBOS_PLACES);
            var placesIndex = placesStore.index('frecency');

            placesIndex.openCursor(null, 'next').onsuccess =
            function onSuccess(e) {
              var cursor = e.target.result;
              if (cursor) {
                var places = cursor.value;
                SyncBrowserDB.removeTopsite(places.uri, callback);
              } else {
                console.error('error get places');
              }
              if (callback) {
                callback();
              }
            };
          }
        };

        request.onerror = function onReadError(event) {
            console.error('error reading place');
        };
      }
    };

    readRequest.onerror = function onError(event) {
      console.error('error writing places');
    };
  },

  /**
   * Get a place by URI from DBOS_PLACES object store.
   * @param {String} uri URI query parameter
   * @param {Function} callback Invoked with an icon object as argument on
   *                            success. Invoked without arguments on error.
   */
  getPlace: function db_getPlace(uri, callback) {
    var db = this._db;
    var request = db.transaction(DBOS_PLACES).objectStore(DBOS_PLACES).get(uri);

    request.onsuccess = function onSuccess(event) {
      callback(event.target.result);
    };

    request.onerror = function onError(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR) {
        callback();
      }
    };
  },

  /**
   * Save an visits object store entry in database
   * @param {Object} visit A visits entry
   * @param {Function} callback Runs on success
   */
  visitMaxCheck: function db_visitMaxCheck(uri, callback) {
    var db = this._db;
    var transaction = this._db.transaction([DBOS_VISITS], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to count visit');
    };

    var objectStore = transaction.objectStore(DBOS_VISITS);
    var readRequest = objectStore.get(uri);
    readRequest.onsuccess = function onReadSuccess(event) {
      var visits = event.target.result;
      if (visits) {
        if (callback) {
          callback();
        }
      } else {
        //count check
        var request = objectStore.count();
        request.onsuccess = function onReadSuccess(event) {
          var count = event.target.result;
          if (count < Browser.MAX_HISTORY_LIST) {
            if (callback) {
              callback();
            }
          }else{
            var transaction = db.transaction([DBOS_VISITS]);
            var visitsStore = transaction.objectStore(DBOS_VISITS);
            var visitsIndex = visitsStore.index('timestamp');

            visitsIndex.openCursor(null, 'next').onsuccess =
            function onSuccess(e) {
              var cursor = e.target.result;
              if (cursor) {
                var visit = cursor.value;
                SyncBrowserDB.oldVisitDelete(visit.uri, callback);
              } else {
                console.error('error get visits');
              }
            };
          }
        };

        request.onerror = function onReadError(event) {
            console.error('error reading visit');
        };
      }
    };

    readRequest.onerror = function onError(event) {
      console.error('error writing visit');
    };
  },

  /**
   * Save an visits object store entry in database
   * @param {Object} visit A visits entry
   * @param {Function} callback Runs on success
   */
  saveVisit: function db_saveVisit(visit, callback) {
    var transaction = this._db.transaction([DBOS_VISITS], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to save visit');
    };
    var objectStore = transaction.objectStore(DBOS_VISITS);
    var readRequest = objectStore.get(visit.uri);
    readRequest.onsuccess = function onReadSuccess(event) {
      var visits = event.target.result;
      if (visits) {
        if(( visits.title != visit.title ) &&
           ( visits.title == visit.uri )) {
          visits.title = visit.title;
          visits.timestamp = visit.timestamp;
        } else {
          visits.timestamp = visit.timestamp;
        }
      } else {
        //TODO num check
        visits = {
          uri: visit.uri,
          title: visit.title,
          timestamp: visit.timestamp
        };
      }

      var writeRequest = objectStore.put(visits);
      writeRequest.onsuccess = function onWriteSuccess(event) {
        if (callback) {
          callback();
        }
      };

      writeRequest.onerror = function onError(event) {
        console.error('error writing place');
      };
    };

    readRequest.onerror = function onReadError(event) {
        console.error('error reading place');
    };
  },

  /**
   * Get latest visits entries.
   * @param {Number} maximum Maximum number of history entries to get
   * @param {Function} callback Run with array of history entries
   */
  getHistory: function db_getHistory(maximum, callback) {
    var history = [];
    var db = this._db;

    function makeVisitProcessor(visit) {
      return function(e) {
          var object = e.target.result;
          if(object){
            visit.iconUri = object.iconUri;
          }else{
            visit.iconUri = Awesomescreen.DEFAULT_FAVICON;
          }
          history.push(visit);
        };
    }

    var transaction = db.transaction([DBOS_VISITS, DBOS_ICONS]);
    var visitsStore = transaction.objectStore(DBOS_VISITS);
    var objectStore = transaction.objectStore(DBOS_ICONS);
    var visitsIndex = visitsStore.index('timestamp');

    visitsIndex.openCursor(null, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor && history.length < maximum) {
        var visit = cursor.value;
        objectStore.get(visit.uri).onsuccess = makeVisitProcessor(visit);
        cursor.continue();
      } else {
        callback(history);
      }
    };
  },

  /**
   * Get default configured places entries. This is possibly broken. Need
   * confirmation.
   * @param {Function} callback Run on success with default top sites array.
   */
  getDefaultPlaces: function db_defaultPlaces(callback) {
    var topSites = [];
    var transaction = this._db.transaction(DBOS_PLACES);
    var placesStore = transaction.objectStore(DBOS_PLACES);
    var frecencyIndex = placesStore.index('frecency');
    frecencyIndex.openCursor(null, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor && cursor.value && cursor.value.frecency < 0) {
        topSites.push(cursor.value);
        cursor.continue();
      } else {
        callback(topSites);
      }
    };
  },

  /**
   * Get places entries ordered by frequency(view count).
   * @param {Number} maximum The maximum number of top sites to get
   * @param {String} filter URI filter. Pass in null to ignore.
   * @param {Function} callback Run on success with topsites array and filter
   *                            as arguments.
   */
  getPlacesByFrecency: function db_placesByFrecency(maximum, filter, callback) {
    var topSites = [];
    var self = this;
    var transaction = self._db.transaction(DBOS_PLACES);
    var placesStore = transaction.objectStore(DBOS_PLACES);
    var frecencyIndex = placesStore.index('frecency');
    frecencyIndex.openCursor(null, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor && topSites.length < maximum) {
        var place = cursor.value;
        var matched = false;
        if (filter) {
          matched = self.matchesFilter(place.uri, filter) ||
            self.matchesFilter(place.title, filter);
        }
        if (matched || !filter) {
          if(cursor.value.frecency >= 1){
            topSites.push(cursor.value);
          }
        }
        cursor.continue();
      } else {
        callback(topSites, filter);
      }
    };
  },
  /**
   * Check if the URI matches the regular expression filter.
   * @param {String} uri
   * @param {String} filter
   * @returns {Boolean}
   */
  matchesFilter: function db_matchesFilter(uri, filter) {
    return uri.match(new RegExp(filter, 'i')) !== null;
  },

  /**
   * Get places URIs ordered by frequency(view count).
   * @param {Number} maximum The maximum number of URIs to get
   * @param {Function} callback Run on success with a URI array
   */
  getPlaceUrisByFrecency: function db_getPlaceUrisByFrecency(maximum,
    callback) {
    var topSites = [];
    var transaction = this._db.transaction(DBOS_PLACES);
    var placesStore = transaction.objectStore(DBOS_PLACES);
    var frecencyIndex = placesStore.index('frecency');
    frecencyIndex.openCursor(null, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor && topSites.length < maximum) {
        topSites.push(cursor.value.uri);
        cursor.continue();
      } else {
        callback(topSites);
      }
    };
  },

  /**
   * Clear places object store.
   * @param {Function} callback Runs on success
   */
  clearPlaces: function db_clearPlaces(callback) {
    var db = SyncBrowserDB.db._db;
    var transaction = db.transaction(DBOS_PLACES, 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to clear places');
    };
    var objectStore = transaction.objectStore(DBOS_PLACES);
    var request = objectStore.clear();
    request.onsuccess = function onSuccess() {
      callback();
    };
    request.onerror = function onError(e) {
      console.error('Error clearing places object store');
    };
  },

  /**
   * Clear visits object store.
   * @param {Function} callback Runs on success
   */
  clearVisits: function db_clearVisits(callback) {
    var db = SyncBrowserDB.db._db;
    var transaction = db.transaction(DBOS_VISITS, 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to clear visits');
    };
    var objectStore = transaction.objectStore(DBOS_VISITS);
    objectStore.openCursor().onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor) {
        var visit = cursor.value;
        SyncBrowserDB.db.deleteIconUrl(visit.uri,
          SyncBrowserDB.DEFAULT_TYPE_HISTORY, null);
        cursor.continue();
      }else{
        var request = objectStore.clear();
        request.onsuccess = function onSuccess() {
          if (callback) {
            callback();
          }
        };
        request.onerror = function onError(e) {
          console.error('Error clearing visits object store');
        };
      }
    };

    objectStore.openCursor(null, 'prev').onerror =
      function onError(e) {
      console.error('Error Delete visits Icon object store');
    };
  },

  /**
   * Clear icons object store.
   * @param {Function} callback Runs on success
   */
  clearIcons: function db_clearIcons(callback) {
    var db = SyncBrowserDB.db._db;
    var transaction = db.transaction(DBOS_ICONS, 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to clear icons');
    };
    var objectStore = transaction.objectStore(DBOS_ICONS);
    var request = objectStore.clear();
    request.onsuccess = function onSuccess() {
      callback();
    };
    request.onerror = function onError(e) {
      console.error('Error clearing icons object store');
    };
  },

  /**
   * Clear bookmarks object store.
   * @param {Function} callback Runs on success
   */
  clearBookmarks: function db_clearBookmarks(callback) {
    var db = SyncBrowserDB.db._db;
    var transaction = db.transaction(DBOS_BOOKMARKS, 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to clear bookmarks');
    };
    var objectStore = transaction.objectStore(DBOS_BOOKMARKS);
    var request = objectStore.clear();
    request.onsuccess = function onSuccess() {
      callback();
    };
    request.onerror = function onError(e) {
      console.error('Error clearing bookmarks object store');
    };
  },

  /**
   * Save an icon object store entry in database
   * @param {Object} iconEntry
   * @param {Function} callback Runs on success
   */
  saveIcon: function db_saveIcon(iconEntry, callback) {
    var transaction = this._db.transaction([DBOS_ICONS], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to save icon');
    };

    var objectStore = transaction.objectStore(DBOS_ICONS);
    var request = objectStore.put(iconEntry);

    request.onsuccess = function onSuccess(e) {
      if (callback) {
        callback();
      }
    };

    request.onerror = function onError(e) {
      console.error('Error while saving icon');
    };
  },

  /**
   * Get a icon by iconUri from DBOS_ICONS object store.
   * @param {String} iconUri Base64 encoded icon image string
   * @param {Function} callback Invoked with an icon object as argument on
   *                            success. Invoked without arguments on error.
   */
  getIcon: function db_getIcon(uri, iconUri, callback) {
    var request = this._db.transaction(DBOS_ICONS).objectStore(DBOS_ICONS).
      get(uri);

    request.onsuccess = function onSuccess(event) {
      callback(event.target.result);
    };

    request.onerror = function onError(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR) {
        callback();
      }
    };
  },

  /**
   * Save a bookmarks object store entry in database
   * @param {Object} bookmark A bookmarks object store entry
   * @param {Function} callback Runs on success
   */
  saveBookmark: function db_saveBookmark(bookmark, callback) {
    var transaction = this._db.transaction([DBOS_BOOKMARKS], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to save bookmark');
    };

    var objectStore = transaction.objectStore(DBOS_BOOKMARKS);

    var request = objectStore.put(bookmark);

    request.onsuccess = function onSuccess(e) {
      if (callback) {
        callback();
      }
    };

    request.onerror = function onError(e) {
      console.error('Error while saving bookmark');
    };
  },

  /**
   * Get a bookmark by ID from database.
   * @param {String} id ID
   * @param {Function} callback Runs with a bookmark object on success. Runs
   *                            without arguments on error.
   */
  getBookmark: function db_getBookmark(id, callback) {
    var request = this._db.transaction(DBOS_BOOKMARKS).
      objectStore(DBOS_BOOKMARKS).get(id);

    request.onsuccess = function onSuccess(event) {
      callback(event.target.result);
    };

    request.onerror = function onError(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR) {
        callback();
      }
    };
  },

  /**
   * Get a bookmark by URI from database.
   * @param {String} uri URI
   * @param {Function} callback Runs with a bookmark object on success. Runs
   *                            without arguments on error.
   */
  getBookmarkByUri: function db_getBookmarkByUri(uri, callback) {
    var request = this._db.transaction(DBOS_BOOKMARKS).
      objectStore(DBOS_BOOKMARKS).index('bmkUri').get(uri);

    request.onsuccess = function onSuccess(event) {
      callback(event.target.result);
    };

    request.onerror = function onError(event) {
      if (event.target.errorCode == IDBDatabaseException.NOT_FOUND_ERR) {
        callback();
      }
    };
  },

  /**
   * Get a bookmark by Parent ID from database.
   * @param {String} parentId Parent ID
   * @param {Function} callback Runs with a bookmark object on success. Runs
   *                            without arguments on error.
   */
  getBookmarkByParentId: function db_getBookmarkByParentId(parentId, callback) {
    var records = [];
    var db = this._db;

    var transaction = db.transaction(DBOS_BOOKMARKS);
    var objectStore = transaction.objectStore(DBOS_BOOKMARKS).index('parentid');

    objectStore.openCursor(parentId, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor) {
        records.push(cursor.value);
        cursor.continue();
      }
    };
    transaction.oncomplete = function db_bookmarkTransactionComplete() {
      callback(records);
    };
  },

  /**
   * Delete a bookmark by ID from database.
   * @param {String} id ID
   * @param {Function} callback Runs on success
   */
  deleteBookmark: function db_deleteBookmark(id, callback) {
    var transaction = this._db.transaction([DBOS_BOOKMARKS], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to delete bookmark');
    };

    var objectStore = transaction.objectStore(DBOS_BOOKMARKS);
    var request = objectStore.delete(id);

    request.onsuccess = function onSuccess(event) {
      if (callback) {
        callback();
      }
    };

    request.onerror = function onError(e) {
      console.error('Error while deleting bookmark');
    };
  },

  /**
   * Delete a history by URI from database.
   * @param {String} uri URI query parameter
   * @param {Function} callback Runs on success
   */
  deleteHistory: function db_deleteHistory(uri, callback) {
    var db = SyncBrowserDB.db._db;
    var transaction = db.transaction(DBOS_VISITS, 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to clear visits');
    };
    var objectStore = transaction.objectStore(DBOS_VISITS);
    var request = objectStore.delete(uri);
    request.onsuccess = function onSuccess() {
      if (callback) {
        callback();
      }
    };
    request.onerror = function onError(e) {
      console.error('Error clearing visits object store');
    };
  },

  /**
   * Delete a iconUrl by URI from database.
   * @param {String} uri URI query parameter
   * @param {Function} callback Runs on success
   */
  deleteIconUrl: function db_deleteIconUrl(uri, type, callback) {

    var transaction = null;
    var objectStore = null;
    //In the case of history, it searches the same URL is to bookmark
    if(type == SyncBrowserDB.DEFAULT_TYPE_HISTORY){
      transaction = this._db.transaction([DBOS_BOOKMARKS], 'readwrite');
      objectStore = transaction.objectStore(DBOS_BOOKMARKS);
    }else{
      transaction = this._db.transaction([DBOS_VISITS], 'readwrite');
      objectStore = transaction.objectStore(DBOS_VISITS);
    }

    var readRequest = objectStore.get(uri);
    readRequest.onsuccess = function onReadSuccess(event) {
      var objList = event.target.result;
      if (objList) {
        if(callback){
          callback();
        }
      }else{

        var db = SyncBrowserDB.db._db;
        var transaction = db.transaction(DBOS_ICONS, 'readwrite');
        transaction.onerror = function dbTransactionError(e) {
          console.error('Transaction error while trying to clear icons');
        };
        var objectStore = transaction.objectStore(DBOS_ICONS);
        var request = objectStore.delete(uri);
        request.onsuccess = function onSuccess() {
          if (callback) {
            callback();
          }
        };
        request.onerror = function onError(e) {
          console.error('Error clearing icons object store');
        };
      }
    };

    readRequest.onerror = function onError(e) {
      console.error('Error while read bookamrk or history');
    };
  },

  /**
   * Delete a topsite by URI from database.
   * @param {String} uri URI query parameter
   * @param {Function} callback Runs on success
   */
  deleteTopsite: function db_deleteTopsite(uri, callback) {
    var transaction = this._db.transaction([DBOS_PLACES], 'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to delete topsite');
    };

    var objectStore = transaction.objectStore(DBOS_PLACES);
    var request = objectStore.delete(uri);

    request.onsuccess = function onSuccess(event) {
      if (callback) {
        callback();
      }
    };

    request.onerror = function onError(e) {
      console.error('Error while deleting topsite');
    };
  },

  /**
   * Get bookmarks
   * @param {Function} callback Runs on complete with an array of bookmarks
   */
  getAllBookmarks: function db_getAllBookmarks(callback) {
    var bookmarks = [];
    var db = this._db;
    var icons;

    function makeBookmarkProcessor(bookmark) {
      return function(e) {
       icons = e.target.result;
        if(icons){
          if(icons.iconUri){
             bookmark.iconUri = icons.iconUri;

          }else{
             bookmark.iconUri = Awesomescreen.DEFAULT_FAVICON;
          }
        }
        bookmarks.push(bookmark);
      };
    }

    var transaction = db.transaction([DBOS_BOOKMARKS, DBOS_ICONS]);
    var bookmarksStore = transaction.objectStore(DBOS_BOOKMARKS);
    var bookmarksIndex = bookmarksStore.index('timestamp');

    var objectStore = transaction.objectStore(DBOS_ICONS);
    bookmarksIndex.openCursor(null, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor) {
        var bookmark = cursor.value;
        objectStore.get(bookmark.id).onsuccess =
          makeBookmarkProcessor(bookmark);
        cursor.continue();
      }
    };
    transaction.oncomplete = function db_bookmarkTransactionComplete() {
      callback(bookmarks);
    };
  },

  /**
   * Get all URIs of bookmarks
   * @param {Function} callback Runs on complete with an array of URIs
   */
  getAllBookmarkUris: function db_getAllBookmarks(callback) {
    var uris = [];
    var db = this._db;

    var transaction = db.transaction(DBOS_BOOKMARKS);
    var objectStore = transaction.objectStore(DBOS_BOOKMARKS);

    objectStore.openCursor(null, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor) {
        uris.push(cursor.value.uri);
        cursor.continue();
      }
    };
    transaction.oncomplete = function db_bookmarkTransactionComplete() {
      callback(uris);
    };
  },

  /**
   * Get history by timestamp range at (start < record.timestamp <= end)
   * @param {Number} start Start timestamp
   * @param {Number} end End timestamp
   * @param {Function} callback Runs on complete with an array of history
   */
  getHistoryByTime: function db_getHistoryByTime(start, end, callback) {
    var history = [];
    var db = this._db;

    function makeVisitProcessor(visit) {
      return function(e) {
          var object = e.target.result;
          if(object){
            visit.iconUri = object.iconUri;
          }else{
            visit.iconUri = Awesomescreen.DEFAULT_FAVICON;
          }
          history.push(visit);
        };
    }

    var transaction = db.transaction([DBOS_VISITS, DBOS_ICONS]);
    var visitsStore = transaction.objectStore(DBOS_VISITS);
    var objectStore = transaction.objectStore(DBOS_ICONS);
    var visitsIndex = visitsStore.index('timestamp');
    var keyRange = IDBKeyRange.bound(start, end, true, false);

    visitsIndex.openCursor(keyRange, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor) {
        var visit = cursor.value;
        objectStore.get(visit.uri).onsuccess = makeVisitProcessor(visit);
        cursor.continue();
      }
    };
    transaction.oncomplete = function db_historyTransactionComplete() {
      callback(history);
    };
  },

  /**
   * Init the frequency(view count) of the specified URI,
   * if the URI is in DBOS_PLACES.
   * @param {String} uri The URI to be init
   * @param {String} title
   * @param {Number} frequency View count of the specified URI
   * @param {Function} callback Runs when init finishs
   */
  initPlaceFrecency: function db_initPlaceFrecency(uri, title,
                                                   frecency, callback) {
    // Don't assign frecency to the start page
    if (uri == this.START_PAGE_URI) {
      if (callback) {
        callback();
      }
      return;
    }

    var transaction = this._db.transaction([DBOS_PLACES], 'readwrite');
    var objectStore = transaction.objectStore(DBOS_PLACES);
    var readRequest = objectStore.get(uri);
    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (!place || (place.frecency && place.frecency > frecency)) {
        return;
      }

      place.title = title;
      place.frecency = frecency;

      var writeRequest = objectStore.put(place);
      writeRequest.onerror = function onError() {
        console.error('Error while saving new frecency for ' + uri);
      };

      writeRequest.onsuccess = function onWriteSuccess() {
        if (callback) {
          callback();
        }
      };
    };

    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to update place: ' +
        uri);
    };
  },

  /**
   * Update the frequency(view count) of the specified URI,
   * if the URI is in DBOS_PLACES.
   * @param {String} uri The URI to be updated
   * @param {Function} callback Runs if the URI is the start page or
   *                            the update process is successful
   */
  updatePlaceFrecency: function db_updatePlaceFrecency(uri, callback) {
    // Don't assign frecency to the start page
    if (uri == this.START_PAGE_URI) {
      if (callback) {
        callback();
      }
      return;
    }

    var transaction = this._db.transaction([DBOS_PLACES], 'readwrite');

    var objectStore = transaction.objectStore(DBOS_PLACES);
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (!place) {
        return;
      }

      if (!place.frecency) {
        place.frecency = 1;
      } else {
        if (place.frecency < 0) {
          place.frecency = 0;
        }
        // currently just frequency
        place.frecency++;
      }

      var writeRequest = objectStore.put(place);

      writeRequest.onerror = function onError() {
        console.error('Error while saving new frecency for ' + uri);
      };

      writeRequest.onsuccess = function onWriteSuccess() {
        if (callback) {
          callback();
        }
      };

    };

    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to update place: ' +
        uri);
    };
  },

  /**
   * Set the frequency(view count) to null of the specified URI,
   * if the URI is in DBOS_PLACES.
   * @param {String} uri The URI to be reset
   * @param {Function} callback Runs if the reset process is successful
   */
  resetPlaceFrecency: function db_resetPlaceFrecency(uri, callback) {
    var transaction = this._db.transaction([DBOS_PLACES], 'readwrite');

    var objectStore = transaction.objectStore(DBOS_PLACES);
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (!place) {
        return;
      }

      place.frecency = 0;

      var writeRequest = objectStore.put(place);

      writeRequest.onerror = function onError() {
        console.error('Error while resetting frecency for ' + uri);
      };

      writeRequest.onsuccess = function onWriteSuccess() {
        if (callback) {
          callback();
        }
      };

    };

    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to reset frecency: ' +
        uri);
    };
  },

  /**
   * Create/Update iconUri in DBOS_PLACES object store.
   * @param {String} uri URI query parameter
   * @param {String} iconUri Base64 encoded image string
   * @param {Function} callback Runs on success
   */
  updatePlaceIconUri: function db_updatePlaceIconUri(uri, iconUri, callback) {
    var transaction = this._db.transaction([DBOS_PLACES], 'readwrite');

    var objectStore = transaction.objectStore(DBOS_PLACES);
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (place) {
        place.iconUri = iconUri;
      } else {
        place = {
          uri: uri,
          title: uri,
          iconUri: iconUri
        };
      }

      var writeRequest = objectStore.put(place);

      writeRequest.onerror = function onError() {
        console.error('Error while saving iconUri for ' + uri);
      };

    };

    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to save iconUri for ' +
        uri);
    };

    transaction.onsuccess = function dbTransactionSuccess(e) {
      if (callback) {
        callback();
      }
    };
  },

  /**
   * Create/Update title in DBOS_PLACES object store.
   * @param {String} uri URI query parameter
   * @param {String} title Page title
   * @param {Function} callback Runs on success
   */
  updatePlaceTitle: function db_updatePlaceTitle(uri, title, callback) {
    var transaction = this._db.transaction([DBOS_PLACES], 'readwrite');

    var objectStore = transaction.objectStore(DBOS_PLACES);
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (place) {
        place.title = title;
      } else {
        place = {
          uri: uri,
          title: title
        };
      }

      var writeRequest = objectStore.put(place);

      writeRequest.onerror = function onError() {
        console.error('Error while saving title for ' + uri);
      };

      writeRequest.onsuccess = function onWriteSuccess() {
        if (callback) {
          callback();
        }
      };

    };

    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to save title for ' +
        uri);
    };
  },

  /**
   * Update a screenshot of a places entry by URI.
   * @param {String} uri URI query parameter
   * @param {Blob} screenshot A webpage screenshot taken using
   *                          HTMLIFrameElement.getScreenshot
   * @param {Function} callback Runs on success
   */
  updatePlaceScreenshot: function db_updatePlaceScreenshot(uri, screenshot,
    callback) {
    var transaction = this._db.transaction([DBOS_PLACES], 'readwrite');

    var objectStore = transaction.objectStore(DBOS_PLACES);
    var readRequest = objectStore.get(uri);

    readRequest.onsuccess = function onReadSuccess(event) {
      var place = event.target.result;
      if (place) {
        place.screenshot = screenshot;
      } else {
        place = {
          uri: uri,
          title: uri,
          screenshot: screenshot
        };
      }

      var writeRequest = objectStore.put(place);

      writeRequest.onerror = function onError() {
        console.error('Error while saving screenshot for ' + uri);
      };

      writeRequest.onsuccess = function onWriteSuccess() {
        if (callback) {
          callback();
        }
      };

    };

    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to save screenshot for ' +
        uri);
    };
  },

  /**
   * Clear places and icons entries. For exceptions reset frequency only.
   * @param {Array} exceptions URIs to be excluded from clearing
   * @param {Function} callback Runs on success
   */
  clearHistoryExcluding: function db_clearHistoryExcluding(callback) {
    // Clear all visits
    this.clearVisits();

    var transaction = this._db.
      transaction([DBOS_PLACES, DBOS_ICONS], 'readwrite');
    var placesStore = transaction.objectStore(DBOS_PLACES);
    var iconStore = transaction.objectStore(DBOS_ICONS);

    placesStore.openCursor(null, 'prev').onsuccess =
      function onSuccess(e) {
      var cursor = e.target.result;
      if (cursor) {
        var place = cursor.value;
        // If not one of the exceptions then delete place and icon
          placesStore.delete(place.uri);
          if (place.iconUri) {
            iconStore.delete(place.iconUri);
          }
        cursor.continue();
      }
    };
    transaction.oncomplete = function db_bookmarkTransactionComplete() {
      if (callback) {
        callback();
      }
    };

  },

  /**
   * indexedDB MaxNum Check.
   * @param {type} Bookmark or History or Topsite
   * @param {maxNum} Object-specific maximum number
   */
  idbMaxCheck: function db_idbMaxCheck(objType, maxNum) {
    var transaction = this._db.transaction([objType], 'readwrite');

    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to ' + objType);
    };

    var objectStore = transaction.objectStore(objType);
    var objectIndex = null;

    //count check
    var request = objectStore.count();
    request.onsuccess = function onReadSuccess(event) {
      var count = event.target.result;
      var checkCount = count - maxNum;
      if(checkCount <= 0) {
        return;
      }else{
        switch(objType){
          case DBOS_BOOKMARKS:
          case DBOS_VISITS :
            objectIndex = objectStore.index('timestamp');
            break;
          case DBOS_PLACES :
            objectIndex = objectStore.index('frecency');
            break;
          default:
            break;
        }

        objectIndex.openCursor(null, 'next').onsuccess =
        function onSuccess(e) {
          var cursor = e.target.result;
          if (cursor) {
            var objData = cursor.value;
            switch(objType){
              case DBOS_BOOKMARKS:
                SyncBrowserDB.removeBookmark(objData.uri);
                break;
              case DBOS_VISITS :
                SyncBrowserDB.removeHistory(objData.uri);
                break;
              case DBOS_PLACES :
                SyncBrowserDB.removeTopsite(objData.uri);
                break;
              default:
                break;
            }
            checkCount -= 1;
            if(checkCount > 0) {
              cursor.continue();
            }else{
              cursor = null;
            }
          }
        };
      }
    };

    request.onerror = function onReadError(event) {
        console.error('error reading object count');
    };
  },

  /**
   * indexedDB icons MaxNum Check.
   */
  iconMaxCheck: function db_iconMaxCheck(maxNum) {
    var transaction = this._db.
      transaction([DBOS_ICONS, DBOS_BOOKMARKS, DBOS_VISITS],'readwrite');
    transaction.onerror = function dbTransactionError(e) {
      console.error('Transaction error while trying to icons');
    };

    var iconsStore = transaction.objectStore(DBOS_ICONS);
    var bookmarksStore = transaction.objectStore(DBOS_BOOKMARKS);
    var visitsStore = transaction.objectStore(DBOS_VISITS);

    //count check
    var request = iconsStore.count();
    request.onsuccess = function onReadSuccess(event) {
      var count = event.target.result;
      if (count > maxNum) {
        iconsStore.openCursor().onsuccess =
          function onSuccess(e) {
            var cursor = e.target.result;
            if (cursor) {
              var icon = cursor.value;
              var requestBookmark = bookmarksStore.get(icon.uri);
              requestBookmark.onsuccess = function onReadSuccess(event) {
                var bookmarks = event.target.result;
                if (!bookmarks) {
                  var requestVisits = visitsStore.get(icon.uri);
                  requestVisits.onsuccess = function onReadSuccess(event) {
                    var visits = event.target.result;
                    if (!visits) {
                      var requestIcons = iconsStore.delete(icon.uri);
                      requestIcons.onerror = function onError(e) {
                        console.error('Error delete icons object store');
                      };
                    }
                  };
                  requestVisits.onerror = function onReadError(event) {
                    console.error('error reading visit');
                  };
                }
              };
              requestBookmark.onerror = function onReadError(event) {
                console.error('error reading bookmarks');
              };

              cursor.continue();
            }

          };
      }

    };

    request.onerror = function onReadError(event) {
        console.error('error reading object icon count');
    };
  }

};
