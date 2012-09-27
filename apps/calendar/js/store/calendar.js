(function(window) {

  function Store() {
    Calendar.Store.Abstract.apply(this, arguments);

    this._remoteByAccount = Object.create(null);
  }

  Store.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _store: 'calendars',

    _dependentStores: [
      'calendars', 'events', 'busytimes'
    ],

    _parseId: function(id) {
      return id;
    },

    _addToCache: function(object) {
      var remote = object.remote.id;

      this._cached[object._id] = object;

      if (!(object.accountId in this._remoteByAccount)) {
        this._remoteByAccount[object.accountId] = {};
      }
      this._remoteByAccount[object.accountId][remote] = object;
    },

    _removeFromCache: function(id) {
      if (id in this.cached) {
        var object = this.cached[id];
        var remote = object.remote.id;
        delete this.cached[id];
        delete this._remoteByAccount[object.accountId][remote];
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
    },

    _removeDependents: function(id, trans) {
      var store = this.db.getStore('Event');
      store.removeByIndex('calendarId', id, trans);
    },

    remotesByAccount: function(accountId) {
      if (accountId in this._remoteByAccount) {
        return this._remoteByAccount[accountId];
      }
      return Object.create(null);
    },

    /**
     * Sync remote and local events for a calendar.
     */
    sync: function(account, calendar, callback) {
      var self = this;
      var store = this.db.getStore('Event');
      var provider = Calendar.App.provider(
        account.providerType
      );
      provider.syncEvents(account, calendar, callback);
    }

  };

  Calendar.ns('Store').Calendar = Store;

}(this));
