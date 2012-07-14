(function(window) {
  if (typeof(Calendar) === 'undefined') {
    Calendar = {};
  }

  if (typeof(Calendar.Store) === 'undefined') {
    Calendar.Store = {};
  }

  function Account() {
    Calendar.Store.Abstract.apply(this, arguments);

    this._accounts = {};
  }

  Account.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _objectData: function(obj) {
      if ('toJSON' in obj) {
        return obj.toJSON();
      } else {
        return obj;
      }
    },

    _hydrate: function(obj) {
      if (!(obj instanceof Calendar.Models.Account)) {
        return new Calendar.Models.Account(obj);
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
        return callback(null, this._accounts[id]);
      }

      var self = this;
      var trans = this.db.transaction('accounts');
      var store = trans.objectStore('accounts');

      var req = store.get(id);

      req.onsuccess = function() {
        if (req.result) {
          result = self._hydrate(req.result);
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
     * Adds an account to the database.
     *
     * @param {Object} object reference to account object to store.
     * @param {Function} callback node style callback.
     */
    add: function(object, callback) {
      var self = this;
      var trans = this.db.transaction('accounts', 'readwrite');
      var store = trans.objectStore('accounts');
      var data = this._objectData(object);
      var id;

      var putReq = store.put(data);

      trans.onerror = function() {
        callback(err);
      }

      trans.oncomplete = function(data) {
        var id = putReq.result;
        var result = self._hydrate(object);

        self._accounts[id] = result;
        callback(null, id, result);
        self.emit('add', id, result);
      };
    },

    all: function(callback) {
      var value;
      var self = this;
      var trans = this.db.transaction('accounts', 'readwrite');
      var store = trans.objectStore('accounts');
      var results = {};

      store.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;

        if (cursor) {
          var object = self._hydrate(cursor.value);
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

      var req = store.delete(id);

      trans.onerror = function(event) {
        callback(event);
      }

      trans.oncomplete = function() {
        delete self._accounts[id];
        callback(null);
        self.emit('remove', id);
      }
    }

  };

  Calendar.Store.Account = Account;

}(this));
