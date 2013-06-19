(function(window) {
  var NUMERIC = /^([0-9]+)$/;

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

    /**
     * Stores that will need to be removed
     * when a record is removed from this store.
     *
     * @type {Array}
     */
    _dependentStores: null,

    _createModel: function(object, id) {
      if (typeof(id) !== 'undefined') {
        object._id = id;
      }

      return object;
    },

    _addToCache: function(object) {
      this._cached[object._id] = object;
    },

    _removeFromCache: function(id) {
      if (id in this._cached) {
        delete this._cached[id];
      }
    },

    _transactionCallback: function(trans, callback) {
      if (callback) {
        trans.addEventListener('error', function(e) {
          callback(e);
        });

        trans.addEventListener('complete', function() {
          callback(null);
        });
      }
    },

    probablyParseInt: function(id) {
      // by an unfortunate decision we have both
      // string ids and number ids.. based on the
      // input we run parseInt
      if (id.match && id.match(NUMERIC)) {
        return parseInt(id, 10);
      }

      return id;
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

      if (!trans) {
        trans = this.db.transaction(
          this._dependentStores || this._store,
          'readwrite'
        );
      }

      var self = this;
      var store = trans.objectStore(this._store);
      var data = this._objectData(object);
      var id;
      var model;

      var putReq;
      var reqType = this._detectPersistType(object);

      // determine type of event
      if (reqType === 'update') {
        putReq = store.put(data);
      } else {
        this._assignId(data);
        putReq = store.add(data);
      }

      trans.addEventListener('error', function(event) {
        if (callback) {
          callback(event);
        }
      });

      this._addDependents(object, trans);

      // when we have the id we can add the model to the cache.
      if (data._id) {
        id = data._id;
        model = self._createModel(object, id);
        self._addToCache(model);
      }

      trans.addEventListener('complete', function(data) {
        if (!model) {
          id = putReq.result;
          model = self._createModel(object, id);
          self._addToCache(model);
        }

        if (callback) {
          callback(null, id, model);
        }

        self.emit(reqType, id, model);
        self.emit('persist', id, model);
      });
    },

    _allCached: function(callback) {
      var list = this._cached;
      Calendar.nextTick(function() {
        callback(null, list);
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
    all: function(callback) {
      if (this._allCallbacks) {
        this._allCallbacks.push(callback);
        return;
      }

      // list of pending callbacks
      this._allCallbacks = [callback];

      var self = this;
      var trans = this.db.transaction(this._store);
      var store = trans.objectStore(this._store);

      function process(data) {
        return self._addToCache(self._createModel(data));
      }

      function fireQueue(err, value) {
        var callback;
        while ((callback = self._allCallbacks.shift())) {
          callback(err, value);
        }
      }

      store.mozGetAll().onsuccess = function(event) {
        event.target.result.forEach(process);
      };

      trans.onerror = function(event) {
        fireQueue(event.target.error.name);
      };

      trans.oncomplete = function() {
        fireQueue(null, self._cached);
        self.all = self._allCached;
      };
    },

    _addDependents: function() {},
    _removeDependents: function(trans) {},

    _detectPersistType: function(object) {
      return ('_id' in object) ? 'update' : 'add';
    },

    _parseId: function(id) {
      return id;
    },

    _assignId: function(obj) {
    },

    /**
     * Removes all records a index value and removes
     * them from the cache. 'remove' events are *not* emitted
     * when removing in this manner for performance reasons.
     *
     * TODO: the test for this method still lives in the event store tests
     *       where this code began should refactor those tests to be general
     *       and live in the abstract tests.
     *
     * @param {String} indexName name of store index.
     * @param {Numeric} indexValue value in index.
     * @param {IDBTransation} [trans] optional transaction to reuse.
     * @param {Function} [callback] optional callback to use.
     *                   When called without a transaction chances
     *                   are you should pass a callback.
     */
    removeByIndex: function(indexName, indexValue, trans, callback) {
      var self = this;
      if (typeof(trans) === 'function') {
        callback = trans;
        trans = undefined;
      }

      if (!trans) {
        trans = this.db.transaction(
          this._dependentStores || this._store,
          'readwrite'
        );
      }
      if (callback) {

        trans.addEventListener('complete', function() {
          callback(null);
        });

        trans.addEventListener('error', function(event) {
          callback(event);
        });
      }


      var index = trans.objectStore(this._store).index(indexName);
      var req = index.openCursor(
        IDBKeyRange.only(indexValue)
      );

      req.onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          // remove deps first intentionally to mimic, removes normal behaviour
          self._removeDependents(cursor.primaryKey, trans);
          self._removeFromCache(cursor.primaryKey);
          cursor.delete();
          cursor.continue();
        }
      };

      return req;
    },

    /**
     * Finds a single record.
     *
     * Does not go through any cache or emit any events.
     *
     * @param {String} id id of record.
     * @param {IDBTransaction} [trans] optional transaction.
     * @param {Function} callback node style [err, record].
     */
    get: function(id, trans, callback) {
      var self = this;

      if (typeof(trans) === 'function') {
        callback = trans;
        trans = null;
      }

      if (!trans) {
        trans = this.db.transaction(this._store);
      }

      var store = trans.objectStore(this._store);
      var req = store.get(this._parseId(id));

      req.onsuccess = function() {
        var model;

        if (req.result) {
          model = self._createModel(req.result);
        }

        callback(null, model);
      };

      req.onerror = function(event) {
        callback(e);
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

      if (!trans) {
        trans = this.db.transaction(
          this._dependentStores || this._store,
          'readwrite'
        );
      }

      var self = this;
      var store = trans.objectStore(this._store);
      id = this._parseId(id);

      var req = store.delete(id);

      this._removeDependents(id, trans);
      self.emit('preRemove', id);

      trans.addEventListener('error', function(event) {
        if (callback) {
          callback(event);
        }
      });

      trans.addEventListener('complete', function() {
        if (callback) {
          callback(null, id);
        }

        self.emit('remove', id);

        // intentionally after the callbacks...
        self._removeFromCache(id);
      });
    },

    /**
     * Find number of records in store.
     *
     * @param {Function} callback node style err/count.
     */
    count: function(callback) {
      var trans = this.db.transaction(this._store);
      var store = trans.objectStore(this._store);

      var req = store.count();

      req.onsuccess = function() {
        callback(null, req.result);
      };

      req.onerror = function(e) {
        callback(e);
      };
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
