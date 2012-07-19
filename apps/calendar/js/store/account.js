(function(window) {

  function Account() {
    Calendar.Store.Abstract.apply(this, arguments);
  }

  Account.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _store: 'accounts',

    _createModel: function(obj, id) {
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
     * Checks if provider type is used
     * in any of the cached records.
     *
     * @param {String} type (like Local).
     */
    presetActive: function(type) {
      var key;

      for (key in this._cached) {
        if (this._cached[key].preset === type) {
          return true;
        }
      }

      return false;
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
          var object = self._createModel(cursor.value, cursor.key);
          results[cursor.key] = object;
          self._cached[cursor.key] = object;
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
    }

  };

  Calendar.ns('Store').Account = Account;

}(this));
