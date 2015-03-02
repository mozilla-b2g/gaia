/*global
  Utils
 */

'use strict';

(function(exports) {
  function IDBOperationFactory(opts) {
    this.stores = opts.stores;
    this.db = opts.db;
    this.mode = opts.mode;

    this.pendingOperations = [];
  }

  IDBOperationFactory.prototype = {
    get: function(id) {
      this.pendingOperations.push((store) => {
        return store.get(id);
      });
      return this;
    },

    put: function(object) {
      this.pendingOperations.push((store) => {
        return store.put(object);
      });
    },

    custom: function(func) {
      this.pendingOperations.push(func);
      return this;
    },

    perform: function() {
      var defer = Utils.Promise.defer();

      var transaction = this.db.transaction(this.stores, this.mode);
      var store = transaction.objectStore(this.stores);

      var lastValue;

      var next = (e) => {
        var value = e.target.result;

        var operation = this.pendingOperations.shift();
        if (!operation) {
          lastValue = value;
          return;
        }

        var req = operation(store, value);
        req.onsuccess = next;
      };

      next();

      transaction.oncomplete = () => defer.resolve(lastValue);
      transaction.onerror = () => defer.reject(transaction.error);

      return defer.promise;
    },

    checkActive: function() {
      if (this.pending || this.finished) {
        throw new Error('This object is inactive.');
      }
    }
  };

  IDBOperationFactory.Proxy = {
    apply: function(target, that, args) {
      target.checkActive();
      target.apply(that, args);
    }
  };

  function IDBHelper(stores) {
    this.stores = stores;
  }

  IDBHelper.prototype = {
    withTransaction: function(db, mode) {
      var factory = new IDBOperationFactory({
        stores: this.stores,
        db: db,
        mode: mode
      });
      return new Proxy(factory, IDBOperationFactory.Proxy);
    }
  };

  exports.IDBHelper = {
    // 'stores'  can be either an array or a single string
    configure: function(stores) {
      return new IDBHelper(stores);
    }
  };
})(window);
