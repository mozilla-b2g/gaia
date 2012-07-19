(function(window) {

  /**
   * Creates an abstract store instance.
   * Every store must contain a reference
   * to the database.
   */
  function Abstract(db) {
    this.db = db;
    this._cached = Object.create(null);
    Calendar.Responder.call(this);
  }

  Abstract.prototype = {
    __proto__: Calendar.Responder.prototype,

    _store: null,

    get cached() {
      return this._cached;
    },

    _addToCache: function(object) {
      this._cached[object._id] = object;
    },

    _removeFromCache: function(id) {
      if (id in this.cached) {
        delete this.cached[id];
      }
    },

    /**
     * Adds an account to the database.
     *
     * @param {Object} object reference to account object to store.
     * @param {IDBTransaction} trans transaction.
     * @param {Function} callback node style callback.
     */
    persist: function(object, trans, callback) {
      if (typeof(trans) === 'function') {
        callback = trans;
        trans = undefined;
      }

      if (typeof(trans) === 'undefined') {
        trans = this.db.transaction(
          this._store,
          'readwrite'
        );
      }

      var self = this;
      var store = trans.objectStore(this._store);
      var data = this._objectData(object);
      var id;

      var putReq;
      var reqType;

      if (object._id) {
        putReq = store.put(data, object._id);
        reqType = 'update';
      } else {
        reqType = 'add';
        putReq = store.put(data);
      }


      trans.addEventListener('error', function() {
        if (callback) {
          callback(err);
        }
      });

      var fired = false;

      trans.addEventListener('complete', function(data) {
        var id = putReq.result;
        var result = self._createModel(object, id);

        self._addToCache(object);

        if (callback) {
          callback(null, id, result);
        }

        console.log('FIRE', reqType, result);
        self.emit(reqType, id, result);
        self.emit('persist', id, result);
      });
    },

    /**
     * Loads all records in the database
     * for this store.
     *
     * Using this function will fill
     * the cache with all records in the store.
     * As such this should only be used once
     * during the app life-cycle.
     */
    load: function(callback) {
      var value;
      var self = this;
      var trans = this.db.transaction(this._store);
      var store = trans.objectStore(this._store);
      var results = {};

      store.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;

        if (cursor) {
          var object = self._createModel(cursor.value, cursor.key);
          results[cursor.key] = object;
          self._addToCache(object);
          cursor.continue();
        }
      };

      trans.onerror = function(event) {
        callback(event);
      }

      trans.oncomplete = function() {
        callback(null, results);
        self.emit('load', self._cached);
      };
    },

    /**
     * Removes a object from the store.
     *
     * @param {String} id record reference.
     * @param {IDBTransaction} trans transaction.
     * @param {Function} callback node style callback.
     */
    remove: function(id, trans, callback) {
      if (typeof(trans) === 'function') {
        callback = trans;
        trans = undefined;
      }

      if (typeof(trans) === 'undefined') {
        trans = this.db.transaction(
          this._store,
          'readwrite'
        );
      }

      var self = this;
      var store = trans.objectStore(this._store);

      var req = store.delete(parseInt(id));

      trans.addEventListener('error', function(event) {
        if (callback) {
          callback(event);
        }
      });

      trans.addEventListener('complete', function() {
        self._removeFromCache(id);

        if (callback) {
          callback(null, id);
        }

        self.emit('remove', id);
      });
    },

    _objectData: function(data) {
      if ('toJSON' in data) {
        return data.toJSON();
      }
      return data;
    }
  };

  Calendar.ns('Store').Abstract = Abstract;

}(this));
