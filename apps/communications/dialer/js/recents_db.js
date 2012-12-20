'use strict';

var RecentsDBManager = {
  _dbName: 'dialerRecents',
  _dbStore: 'dialerRecents',
  _dbVersion: 1,
  prepolulated : false,
  init: function rdbm_init(callback) {
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
        //Store DB object in RecentsDBManager
        self.db = event.target.result;
        if(!navigator.mozTelephony && !self.prepopulated){
          self.prepopulateDB();
          self.prepopulated = true;
        }
        if (callback) {
          //Callback if needed
          callback();
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
    } catch (ex) {
      console.log('Dialer recents IndexedDB exception:' + ex.message);
    }
  },
  close: function rbdm_close() {
    this.db.close();
  },
  _checkDBReady: function rdbm_checkDBReady(callback) {
    var self = this;
    if (!this.db) {
      this.request.addEventListener('success', function rdbm_DBReady() {
        self.request.removeEventListener('success', rdbm_DBReady);
        self._checkDBReady.call(self, callback);
      });
      return;
    }
    if (callback && callback instanceof Function) {
      callback.call(this);
    }
  },
  add: function rdbm_add(recentCall, callback) {
    this._checkDBReady.call(this, function() {
      var txn = this.db.transaction(RecentsDBManager._dbStore, 'readwrite');
      var store = txn.objectStore(RecentsDBManager._dbStore);
      var self = this;
      var request = store.put(recentCall);
      request.onsuccess = function sr_onsuccess() {
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
  prepopulateDB: function rdbm_prepopulateDB(callback) {
    var recent;
    for (var i = 0; i < 5; i++) {
      recent = {
        date: (Date.now() - i * 86400000),
        type: 'incoming',
        number: '123123123'
      };
      this.add(recent);
    }
    recent = {
      date: (Date.now() - 86400000),
      type: 'dialing',
      number: '321321321'
    };
    this.add(recent);
    if (callback) {
      callback();
    }
  },
  delete: function rdbm_delete(date, callback) {
    var self = this;
    this._checkDBReady(function() {
      var txn = self.db.transaction(self._dbStore, 'readwrite');
      var store = txn.objectStore(self._dbStore);
      var delRequest = store.delete(date);

      delRequest.onsuccess = function de_onsuccess() {
        if (callback && callback instanceof Function) {
          callback();
        }
      }

      delRequest.onerror = function de_onsuccess(e) {
        console.log('recents_db delete item failure: ',
            e.message, delRequest.errorCode);
      }
    });
  },
  deleteList: function rdbm_deleteList(list, callback) {
    if (list.length > 0) {
      var itemToDelete = list.pop();
      var self = this;
      this.delete(itemToDelete, function() {
        self.deleteList(list, callback);
      });
    } else {
      if (callback) {
        callback();
      }
    }
  },
  deleteAll: function rdbm_deleteAll(callback) {
    var self = this;
    this._checkDBReady(function() {
      var txn = self.db.transaction(self._dbStore, 'readwrite');
      var store = txn.objectStore(self._dbStore);

      var delAllRequest = store.clear();
      delAllRequest.onsuccess = function da_onsuccess() {
        if (callback && callback instanceof Function) {
          callback();
        }
      };

      delAllRequest.onerror = function da_onerror(e) {
        console.log('recents_db delete all failure: ',
          e.message, delAllRequest.errorCode);
      };
    });
  },
  // Method for retrieving all recents from DB
  get: function rdbm_get(callback) {
    var objectStore = this.db.transaction(RecentsDBManager._dbStore).
                        objectStore(RecentsDBManager._dbStore);
    var recents = [];
    var cursor = objectStore.openCursor(null, 'prev');
    cursor.onsuccess = function(event) {
      var item = event.target.result;
      if (item) {
        recents.push(item.value);
        item.continue();
      } else {
        callback(recents);
      }
    };

    cursor.onerror = function(e) {
      console.log('recents_db get failure: ', e.message);
    };
  },

  getLast: function rdbm_getLast(callback) {
    var objectStore = this.db.transaction(RecentsDBManager._dbStore).
                        objectStore(RecentsDBManager._dbStore);
    var cursor = objectStore.openCursor(null, 'prev');
    cursor.onsuccess = function(event) {
      var item = event.target.result;
      if (item) {
        callback(item.value);
      }
    };

    cursor.onerror = function(e) {
      console.log('recents_db get failure: ', e.message);
    };
  }
};
