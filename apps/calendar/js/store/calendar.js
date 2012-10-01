(function(window) {

  function Store() {
    Calendar.Store.Abstract.apply(this, arguments);

    this._remoteByAccount = Object.create(null);
  }

  /**
   * List of possible calendar capabilities.
   */
  Store.capabilities = {
    createEvent: 'canCreateEvent',
    updateEvent: 'canUpdateEvent',
    deleteEvent: 'canDeleteEvent'
  };

  Store.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _store: 'calendars',

    _dependentStores: [
      'calendars', 'events', 'busytimes', 'alarms'
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
    },

    /**
     * Shortcut to find provider for calendar.
     *
     * @param {Calendar.Models.Calendar} calendar input calendar.
     * @return {Calendar.Provider.Abstract} provider.
     */
    providerFor: function(calendar) {
      var acc = this.accountFor(calendar);
      return Calendar.App.provider(acc.providerType);
    },

    /**
     * Finds account for calendar
     *
     * @param {Calendar.Models.Calendar} calendar input calendar.
     * @return {Calendar.Models.Account} cached account.
     */
    accountFor: function(calendar) {
      return this.db.getStore('Account').cached[calendar.accountId];
    },

    /**
     * Find calendar(s) with a specific capability:
     * NOTE: this method only searches through cached calendars.
     *
     * Possible Capabilities:
     *
     *  - createEvent
     *  - deleteEvent
     *  - editEvent
     *
     * @param {String} type name of capability.
     * @return {Array[Calendar.Model.Calendar]} list of calendar models.
     */
    findWithCapability: function(type) {
      var accounts = this.db.getStore('Account');
      var propName;

      if (!(type in Store.capabilities)) {
        throw new Error('invalid capability: "' + type + '"');
      }

      propName = Store.capabilities[type];

      var list = this.cached;
      var result = [];
      var cal;
      var id;
      var account;
      var provider;

      for (id in list) {
        cal = list[id];
        account = accounts.cached[cal.accountId];
        if (account) {
          provider = Calendar.App.provider(account.providerType);
          if (provider[propName]) {
            result.push(cal);
          }
        }
      }

      return result;
    }

  };

  Calendar.ns('Store').Calendar = Store;

}(this));
