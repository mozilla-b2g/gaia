(function(window) {

  function Store() {
    Calendar.Store.Abstract.apply(this, arguments);

    this._remoteByAccount = Object.create(null);
  }

  Store.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _store: 'calendars',

    _dependentStores: [
      'calendars', 'events'
    ],

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
      store.removeByCalendarId(id, trans);
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
      // for now lets just do a very dumb
      // sync of the entire collection
      // we can assume everything is cached.


      // 1. Open an event stream
      //    as we read the stream events
      //    determine if the event was added/deleted.
      //    Emit events as we go to update the UI
      //    but do *not* actually hit the db until
      //    entire sync is done.


      // 2. After the entire stream is finished
      //    and the records are sorted into
      //    add/remove/update open a transaction
      //    and actually persist the collection.


      // 3. In the same transaction
      //    move the remotes syncToken
      //    to the calendars lastEventSyncToken
      //    and set the lastEventSyncDate
    }

  };

  Calendar.ns('Store').Calendar = Store;

}(this));
