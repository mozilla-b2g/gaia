'use strict';

/* global Promise */

(function(exports) {

/**
 * PromiseStorage wraps IndexedDB into simple key-value storage.
 *
 * It exposes simple Promise interfaces at the expenses of hiding powerful stuff
 * of IndexedDB. For example, there is no interface here for you to iterate
 * all the available items.
 *
 * Note that due to the nature of Promises, this library does not support
 * read-modify-write operation; you simply cannot chain a get() and a set() for
 * that safely. For more discussion please read
 *
 * http://lists.w3.org/Archives/Public/public-webapps/2013AprJun/0217.html
 *
 * (We might get around this if we implement PromiseStorage#update here.)
 *
 */
var PromiseStorage = function(name) {
  this.name = name;

  if (typeof this.name !== 'string' || this.name === '') {
    throw new Error('PromiseStorage: Need a storage name.');
  }

  this._openPromise = null;
};

// Version and the single object store name is considered internal to
// the implementation of PromiseStorage. We should try to upgrade the
// old storage should we encounter one.
PromiseStorage.prototype.DB_VERSION = 1;
PromiseStorage.prototype.STORE_NAME = 'keyvaluepairs';

PromiseStorage.prototype.start = function() {
  this._getDatabase().catch(function(e) {
    e && console.error(e);

    this._openPromise = null;
  }.bind(this));
};

PromiseStorage.prototype.stop = function() {
  if (!this._openPromise) {
    return;
  }

  this._getDatabase().then(function(db) {
    db.close();
  }).catch(function(e) {
    e && console.error(e);
  });
};

PromiseStorage.prototype._getDatabase = function() {
  if (this._openPromise) {
    return this._openPromise;
  }

  var p = new Promise(function(resolve, reject) {
    var req = window.indexedDB.open(this.name, this.DB_VERSION);
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

PromiseStorage.prototype._getTxn = function(type) {
  return this._getDatabase().then(function(db) {
    // Strangely, this transaction lives long enough to be used in
    // the callbacks pass to the first then().
    // It will obviously not going to live for the duration of the entire chain.
    //
    // Not sure if this behavior is implementation dependent ...
    var txn = db.transaction(this.STORE_NAME, type);
    return txn;
  }.bind(this));
};

PromiseStorage.prototype.getItems = function(names) {
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

PromiseStorage.prototype.getItem = function(name) {
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

PromiseStorage.prototype.setItem = function(name, data) {
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

// items is a object mapping from name to data.
PromiseStorage.prototype.setItems = function(items) {
  return this._getTxn('readwrite').then(function(txn) {
    var store = txn.objectStore(this.STORE_NAME);
    var reqPromises = Object.keys(items).map(function(name) {
      var data = items[name];
      return new Promise(function(resolve, reject) {
        var req = store.put(data, name);
        req.onerror = function(e) {
          reject(req.error);
        };
        req.onsuccess = function() {
          resolve();
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

PromiseStorage.prototype.deleteItem = function(name) {
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

exports.PromiseStorage = PromiseStorage;

}(window));
