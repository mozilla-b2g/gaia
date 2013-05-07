(function(window) {

  function Store() {
    Calendar.Store.Abstract.apply(this, arguments);
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
      'calendars', 'events', 'busytimes',
      'alarms', 'icalComponents'
    ],

    _parseId: Calendar.Store.Abstract.prototype.probablyParseInt,

    _addToCache: function(object) {
      var remote = object.remote.id;

      this._cached[object._id] = object;
    },

    _removeFromCache: function(id) {
      if (id in this._cached) {
        var object = this._cached[id];
        var remote = object.remote.id;
        delete this._cached[id];
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

    /**
     * Marks a given calendar with an error.
     *
     * Emits a 'error' event immediately.. This method is typically
     * triggered by an account wide error.
     *
     *
     * @param {Object} calendar model.
     * @param {Calendar.Error} error for given calendar.
     * @param {IDBTransaction} transaction optional.
     * @param {Function} callback fired when model is saved [err, id, model].
     */
    markWithError: function(calendar, error, trans, callback) {
      if (typeof(trans) === 'function') {
        callback = trans;
        trans = null;
      }

      if (!calendar._id)
        throw new Error('given calendar must be persisted.');

      calendar.error = {
        name: error.name,
        date: new Date()
      };

      this.persist(calendar, trans, callback);
    },

    /**
     * Find calendars in a specific account.
     * Results will be returned in an object where
     * the key is the remote.id and the value is the calendar.
     *
     * @param {String|Numeric} accountId id of account.
     * @param {Function} callback [err, object] see above.
     */
    remotesByAccount: function(accountId, trans, callback) {
      if (typeof(trans) === 'function') {
        callback = trans;
        trans = null;
      }

      if (!trans) {
        var trans = this.db.transaction(this._store);
      }

      var store = trans.objectStore(this._store);

      var reqKey = IDBKeyRange.only(accountId);
      var req = store.index('accountId').mozGetAll(reqKey);

      req.onerror = function remotesError(e) {
        callback(e.target.error);
      };

      var self = this;
      req.onsuccess = function remotesSuccess(e) {
        var result = Object.create(null);
        e.target.result.forEach(function(calendar) {
          result[calendar.remote.id] = self._createModel(
            calendar,
            calendar._id
          );
        });

        callback(null, result);
      };
    },

    /**
     * Sync remote and local events for a calendar.
     *
     * TODO: Deprecate use of this function in favor of a sync methods
     *       inside of providers.
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
     * @param {Function} callback [err, provider].
     */
    providerFor: function(calendar, callback) {
      this.ownersOf(calendar, function(err, owners) {
        if (err) {
          return callback(err);
        }

        callback(
          null,
          Calendar.App.provider(owners.account.providerType)
        );
      });
    },

    /**
     * Finds calendar/account for a given event.
     *
     * TODO: think about moving this function into its
     * own file as a mixin.
     *
     * @param {Object|String|Numeric} objectOrId must contain .calendarId.
     * @param {Function} callback [err, { ... }].
     */
    ownersOf: function(objectOrId, callback) {
      var result = {};

      var accountStore = this.db.getStore('Account');

      // case 1. given a calendar
      if (objectOrId instanceof Calendar.Models.Calendar) {
        result.calendar = objectOrId;
        accountStore.get(objectOrId.accountId, fetchAccount);
        return;
      }

      // case 2 given a calendar id or object

      if (typeof(objectOrId) === 'object') {
        objectOrId = objectOrId.calendarId;
      }

      // why??? because we use this method in event store too..
      var calendarStore = this.db.getStore('Calendar');
      calendarStore.get(objectOrId, fetchCalendar);

      function fetchCalendar(err, calendar) {
        if (err) {
          return callback(err);
        }

        result.calendar = calendar;
        accountStore.get(calendar.accountId, fetchAccount);
      }

      function fetchAccount(err, account) {
        if (err) {
          return callback(err);
        }

        result.account = account;
        callback(null, result);
      }
    }
  };

  Calendar.ns('Store').Calendar = Store;

}(this));
