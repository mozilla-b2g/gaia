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
      store.removeByCalendarId(id, trans);
    },

    remotesByAccount: function(accountId) {
      if (accountId in this._remoteByAccount) {
        return this._remoteByAccount[accountId];
      }
      return Object.create(null);
    },

    _syncEvents: function(account, calendar, cached, callback) {
      var self = this;
      var store = this.db.getStore('Event');
      var persist = [];
      var originalIds = Object.keys(cached);
      var syncTime = new Date();

      // 1. Open an event stream
      //    as we read the stream events
      //    determine if the event was added/deleted.
      //    Emit events as we go to update the UI
      //    but do *not* actually hit the db until
      //    entire sync is done.

      var provider = Calendar.App.provider(
        account.providerType
      );

      var stream = provider.streamEvents(
        account.toJSON(),
        calendar.remote
      );

      stream.on('data', function(event) {
        var id = calendar._id + '-' + event.id;
        var localEvent = cached[id];

        if (localEvent) {
          var localToken = localEvent.remote.syncToken;
          var remoteToken = event.syncToken;

          if (localToken !== remoteToken) {
            localEvent.remote = event;
            persist.push(localEvent);
          }

          var idx = originalIds.indexOf(id);
          originalIds.splice(idx, 1);
        } else {
          localEvent = {
            calendarId: calendar._id,
            remote: event
          };

          persist.push(localEvent);
        }
      });

      stream.open(commitSync);


      // 2. After the entire stream is finished
      //    and the records are sorted into
      //    add/remove/update open a transaction
      //    and actually persist the collection.


      function commitSync() {
        // 3. In the same transaction
        //    move the remotes syncToken
        //    to the calendars lastEventSyncToken
        //    and set the lastEventSyncDate

        var trans = self.db.transaction(
          ['calendars', 'events', 'busytimes'], 'readwrite'
        );

        persist.forEach(function(event) {
          store.persist(event, trans);
        });

        originalIds.forEach(function(id) {
          store.remove(id, trans);
        });

        calendar.lastEventSyncToken = calendar.remote.syncToken;
        calendar.lastEventSyncDate = syncTime;

        self.persist(calendar, trans);

        trans.addEventListener('error', function(e) {
          callback(e);
        });

        trans.addEventListener('complete', function() {
          callback(null);
        });
      }

    },

    /**
     * Sync remote and local events for a calendar.
     */
    sync: function(account, calendar, callback) {
      // for now lets just do a very dumb
      // sync of the entire collection
      // we can assume everything is cached.

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
