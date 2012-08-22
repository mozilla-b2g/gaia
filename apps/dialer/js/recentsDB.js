'use strict';

var RecentsDBManager = {
  _dbName: 'dialerRecents',
  _dbStore: 'dialerRecents',
  _dbVersion: 1,
  _init: function rdbm_init(callback) {
    try {
      var indexedDB = window.indexedDB || window.webkitIndexedDB ||
                        window.mozIndexedDB || window.msIndexedDB;
      if (!indexedDB) {
        console.log('Indexed DB is not available!!!');
        return;
      }
      var self = this;
      // Open DB
      this.request = indexedDB.open(this._dbName, this._dbVersion);
      //Once DB is opened
      this.request.onsuccess = function(event) {
        console.log('DB Opened');
        //Store DB object in RecentsDBManager
        self.db = event.target.result;
        // TODO Call to 'prepopulate' once we have requirements for it
        if (callback) {
          //Callback if needed
          console.log('Callback');
          callback.call(self);
        }
      };
      this.request.onerror = function(event) {
        // TODO Do we have to implement any custom error handler?
        console.log('Database error: ' + event.target.errorCode);
      };

      this.request.onupgradeneeded = function(event) {
        var db = event.target.result;
        var objStore = db.createObjectStore('dialerRecents',
          { keyPath: 'date' });
        objStore.createIndex('number', 'number');
      };
    }catch (ex) {
      // TODO Do we have to implement any custom error handler?
      console.log(ex.message);
    }
  },
  _close: function rbdm_close() {
    this.db.close();
    console.log('DB Closed');
  },
  // Method which check if DB is ready
  _checkDB: function rdbm_checkDB(callback) {
    var self = this;
    if (!this.db) {
      this.request.addEventListener('success', function rdbm_DBReady() {
        self.request.removeEventListener('success', rdbm_DBReady);
        self._checkDB.call(self, callback);
      });
      return;
    }
    if (callback && callback instanceof Function) {
      callback.call(this);
    }
  },
  // Metod for adding an item to recents of DB
  _add: function rdbm_add(recentCall, callback) {
    this._checkDB.call(this, function() {
      var txn = this.db.transaction('dialerRecents', 'readwrite');
      var store = txn.objectStore('dialerRecents');
      var self = this;
      var request = store.put(recentCall);
      request.onsuccess = function sr_onsuccess() {
        // self._get.call(self);
        if (callback) {
          callback();
        }
      };
      request.onerror = function(e) {
        console.log('dialerRecents add failure: ',
          e.message, request.errorCode);
      };
   });
  },
  // Method for prepopulating the recents DB for Dev-team
  _prepopulateDB: function rdbm_prepopulateDB() {
    for (var i = 0; i < 10; i++) {
      var recent = {
        date: (Date.now() - i * 86400000),
        type: 'incoming-connected',
        number: '123123123'
      };
      this._add.call(this, recent);
    }
  },
  // Method for deleting an item from DB
  _delete: function rdbm_delete(callLogEntry, callback) {
    //TODO Implement
    var txn = database.transaction('dialerRecents', 'readwrite');
    var store = txn.objectStore('dialerRecents');
    var delRequest = store.delete(new Number(callLogEntry.date));

    delRequest.onsuccess = function de_onsuccess() {
      if (callback && callback instanceof Function) {
        callback();
      }
    }

    delRequest.onerror = function de_onsuccess(e) {
      console.log('dialerRecents delete item failure: ',
          e.message, delRequest.errorCode);
    }
  },
  _deleteList: function rdbm_deleteList(list, callback) {
    if (list.length > 0) {
      var itemToDelete = list.pop();
      var self = this;
      this._delete(itemToDelete, function() {
        self._deleteList(list, callback);
      });
    } else {
      if (callback && callback instanceof Function) {
        callback();
      }
    }
  },
  // Method for deleting all items in store
  _deleteAll: function rdbm_deleteAll(callback) {
    this._checkDB.call(this, function() {
      var txn = this.db.transaction('dialerRecents', 'readwrite');
      var store = txn.objectStore('dialerRecents');

      var delAllRequest = store.clear();
      delAllRequest.onsuccess = function da_onsuccess() {
        if (callback && callback instanceof Function) {
          callback();
        }
      };

      delAllRequest.onerror = function da_onerror(e) {
        console.log('dialerRecents delete all failure: ',
          e.message, delAllRequest.errorCode);
      };
    });
  },
  // Method for retrieving all recents from DB
  _get: function rdbm_get(callback) {
    var objectStore = this.db.transaction('dialerRecents').
      objectStore('dialerRecents');
    var recents = [];
    objectStore.openCursor().onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
        recents.push(cursor.value);
        cursor.continue();
      }
      else {
        if (callback && callback instanceof Function) {
          callback(recents);
        }
      }
    };
  }
};
