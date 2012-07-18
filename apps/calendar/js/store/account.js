(function(window) {

  function Account() {
    Calendar.Store.Abstract.apply(this, arguments);

    this._accounts = Object.create(null);
  }

  Account.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _hydrate: function(obj, id) {
      if (!(obj instanceof Calendar.Models.Account)) {
        obj = new Calendar.Models.Account(obj);
        obj.connect();
      }

      if (typeof(id) !== 'undefined') {
        obj._id = id;
      }

      return obj;
    },

    /**
     * Returns a single instance of an account by id.
     *
     * @param {String} id uuid for account.
     * @param {Function} callback node style callback.
     */
    get: function(id, callback) {
      var result;

      if (id in this._accounts) {
        callback(null, this._accounts[id]);
        return;
      }

      var self = this;
      var trans = this.db.transaction('accounts');
      var store = trans.objectStore('accounts');

      var req = store.get(id);

      req.onsuccess = function() {
        if (req.result) {
          result = self._hydrate(req.result, id);
        }
      }

      trans.onerror = function(err) {
        callback(err);
      }

      trans.oncomplete = function() {
        self._accounts[id] = result;
        callback(null, result);
      }
    },

    /**
     * Checks if provider type is used
     * in any of the cached records.
     *
     * @param {String} type (like Local).
     */
    presetActive: function(type) {
      var key;

      for (key in this._accounts) {
        if (this._accounts[key].preset === type) {
          return true;
        }
      }

      return false;
    },

    /**
     * Adds an account to the database.
     *
     * @param {Object} object reference to account object to store.
     * @param {Function} callback node style callback.
     */
    persist: function(object, callback) {
      var self = this;
      var trans = this.db.transaction('accounts', 'readwrite');
      var store = trans.objectStore('accounts');
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

      trans.onerror = function() {
        callback(err);
      }

      trans.oncomplete = function(data) {
        var id = putReq.result;
        var result = self._hydrate(object, id);

        self._accounts[id] = result;
        callback(null, id, result);

        self.emit(reqType, id, result);
        self.emit('persist', id, result);
      };
    },

    /**
     * Don't mutate the result.
     *
     * @return {Object} key,value pairs of accounts.
     */
    cached: function() {
      return this._accounts;
    },

    load: function(callback) {
      var value;
      var self = this;
      var trans = this.db.transaction('accounts', 'readwrite');
      var store = trans.objectStore('accounts');
      var results = {};

      store.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;

        if (cursor) {
          var object = self._hydrate(cursor.value, cursor.key);
          results[cursor.key] = object;
          self._accounts[cursor.key] = object;
          cursor.continue();
        }
      };

      trans.onerror = function(event) {
        callback(event);
      }

      trans.oncomplete = function() {
        callback(null, results);
        self.emit('load', self._accounts);
      };
    },

    /**
     * Removes a object from the store.
     *
     * @param {String} id record reference.
     * @param {Function} callback node style callback.
     */
    remove: function(id, callback) {
      var self = this;
      var trans = this.db.transaction('accounts', 'readwrite');
      var store = trans.objectStore('accounts');

      var req = store.delete(parseInt(id));

      trans.onerror = function(event) {
        callback(event);
      }

      trans.oncomplete = function() {
        delete self._accounts[id];
        callback(null, id);
        self.emit('remove', id);
      }
    }

  };

  Calendar.ns('Store').Account = Account;

}(this));
