(function(window) {

  function Store() {
    Calendar.Store.Abstract.apply(this, arguments);

    // uuid cache
    this._remoteCache = Object.create(null);
    this._accountMap = Object.create(null);
  }

  Store.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _store: 'calendars',

    _addToCache: function(object) {
      this._cached[object._id] = object;
      this._remoteCache[object.remote.id] = object;

      if (!(object._id in this._accountMap)) {
        this._accountMap[object.accountId] = {};
      }

      this._accountMap[object.accountId][object._id] = object;
    },

    _removeFromCache: function(id) {
      if (id in this.cached) {
        var object = this.cached[id];
        delete this.cached[id];
        delete this._remoteCache[object.remote.id];
        delete this._accountMap[object.accountId][id];
      }
    },

    _createModel: function(obj, id) {
      if (!(obj instanceof Calendar.Models.Calendar)) {
        obj = new Calendar.Models.Calendar(obj);
      }

      if (typeof(id) !== 'undefined') {
        obj._id = id;
      }

      return obj;
    }

   };

  Calendar.ns('Store').Calendar = Store;

}(this));
