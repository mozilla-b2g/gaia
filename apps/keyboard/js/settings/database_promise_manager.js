'use strict';

/* global Promise */

(function(exports) {

var DatabasePromiseManager = function() {
  this._openPromise = null;
};

DatabasePromiseManager.prototype.DB_NAME = 'dictionaries';
DatabasePromiseManager.prototype.DB_VERSION = 1;
DatabasePromiseManager.prototype.STORE_NAME = 'keyvaluepairs';

DatabasePromiseManager.prototype.start = function() {
  this._getDatabase().catch(function(e) {
    e && console.error(e);

    this._openPromise = null;
  }.bind(this));
};

DatabasePromiseManager.prototype._getDatabase = function() {
  if (this._openPromise) {
    return this._openPromise;
  }

  var p = new Promise(function(resolve, reject) {
    var req = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);
    req.onerror = function() {
      reject(req.error);
    };
    req.onsuccess = function(evt) {
      resolve(req.result);
    };
    req.onupgradeneeded = function(evt) {
      var db = req.result;
      if (evt.oldVersion < 1) {
        db.createObjectStore(this.STORE_NAME);
      }
      // ... put next database upgrade here.
      // See http://www.w3.org/TR/IndexedDB/#introduction
      // on how upgradeneeded should be handled.
    }.bind(this);
  }.bind(this));

  this._openPromise = p;
  return p;
};

DatabasePromiseManager.prototype._getTxn = function(type) {
  return this._getDatabase().then(function(db) {
    var txn = db.transaction(this.STORE_NAME, type);
    return txn;
  }.bind(this));
};

DatabasePromiseManager.prototype.getItems = function(names) {
  return this._getTxn().then(function(txn) {
    var store = txn.objectStore(this.STORE_NAME);
    var reqPromises = names.map(function(name) {
      return new Promise(function(resolve, reject) {
        var req = store.get(name);
        req.onerror = function(e) {
          reject(req.error);
        };
        req.onsuccess = function() {
          resolve(req.result);
        };
      });
    }, this);

    return new Promise(function(resolve) {
      txn.oncomplete = function() {
        resolve(Promise.all(reqPromises));
      };
    });
  }.bind(this)).catch(function(e) {
    e && console.error(e);

    return Promise.reject();
  });
};

DatabasePromiseManager.prototype.getItem = function(name) {
  return this._getTxn().then(function(txn) {
    return new Promise(function(resolve, reject) {
      var req = txn.objectStore(this.STORE_NAME).get(name);
      req.onerror = function(e) {
        reject(req.error);
      };
      txn.oncomplete = function() {
        resolve(req.result);
      };
    }.bind(this));
  }.bind(this)).catch(function(e) {
    e && console.error(e);

    return Promise.reject();
  });
};

DatabasePromiseManager.prototype.setItem = function(name, data) {
  return this._getTxn('readwrite').then(function(txn) {
    return new Promise(function(resolve, reject) {
      var store = txn.objectStore(this.STORE_NAME);
      var req = store.put(data, name);
      req.onerror = function(e) {
        reject(req.error);
      };
      txn.oncomplete = function() {
        resolve();
      };
    }.bind(this));
  }.bind(this)).catch(function(e) {
    e && console.error(e);

    return Promise.reject();
  });
};

DatabasePromiseManager.prototype.deleteItem = function(name) {
  return this._getTxn('readwrite').then(function(txn) {
    return new Promise(function(resolve, reject) {
      var req = txn.objectStore(this.STORE_NAME).delete(name);
      req.onerror = function(e) {
        reject(req.error);
      };
      txn.oncomplete = function() {
        resolve();
      };
    }.bind(this));
  }.bind(this)).catch(function(e) {
    e && console.error(e);

    return Promise.reject();
  });
};

exports.DatabasePromiseManager = DatabasePromiseManager;

}(window));
