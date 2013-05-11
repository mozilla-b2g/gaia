(function(window) {

  function Account() {
    Calendar.Store.Abstract.apply(this, arguments);
  }

  Account.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _store: 'accounts',

    verifyAndPersist: function(model, callback) {
      var self = this;
      var provider = Calendar.App.provider(
        model.providerType
      );

      provider.getAccount(model.toJSON(), function(err, data) {
        if (err) {
          callback(err);
          return;
        }

        // server may override properties on demand.
        Calendar.extend(model, data);
        model.error = undefined;
        self.persist(model, callback);
      });
    },

    /**
     * Because this is a top-level store
     * when we remove an account all records
     * related to it must be removed.
     */
    _dependentStores: [
      'accounts', 'calendars', 'events',
      'busytimes', 'alarms', 'icalComponents'
    ],

    _removeDependents: function(id, trans) {
      var store = this.db.getStore('Calendar');
      var related = store.remotesByAccount(id);
      var key;

      for (key in related) {
        store.remove(related[key]._id, trans);
      }
    },

    /**
     * Syncs all calendars for account.
     *
     * TODO: Deprecate this method in favor of new provider API's.
     *
     * @param {Calendar.Models.Account} account sync target.
     * @param {Function} callback node style.
     */
    sync: function(account, callback) {
      //TODO: We need to block removal when syncing
      //OR after removal ensure everything created here
      //is purged.

      var self = this;
      var provider = Calendar.App.provider(account.providerType);
      var store = this.db.getStore('Calendar');

      var persist = [];

      // remotesByAccount return an object indexed by remote ids
      var calendars = store.remotesByAccount(account._id);

      // these are remote ids not local ones
      var originalIds = Object.keys(calendars);

      provider.findCalendars(account, function(err, remoteCals) {
        var key;

        if (err) {
          callback(err);
          return;
        }

        for (key in remoteCals) {
          if (remoteCals.hasOwnProperty(key)) {
            var cal = remoteCals[key];
            var idx = originalIds.indexOf(key);

            if (idx !== -1) {
              // update an existing calendar
              originalIds.splice(idx, 1);

              var original = calendars[key];
              original.remote = cal;
              original.error = undefined;
              persist.push(original);
            } else {
              // create a new calendar
              persist.push(
                store._createModel({
                  remote: new Object(cal),
                  accountId: account._id
                })
              );
            }
          }
        }

        // at this point whatever is left in originalIds
        // is considered a removed calendar.

        // update / remove
        if (persist.length || originalIds.length) {
          var trans = self.db.transaction(
            self._dependentStores,
            'readwrite'
          );

          originalIds.forEach(function(id) {
            store.remove(calendars[id]._id, trans);
          });

          persist.forEach(function(object) {
            store.persist(object, trans);
          });

          // event listeners must come at the end
          // because persist/remove also listen to
          // transaction complete events.
          trans.addEventListener('error', function(err) {
            callback(err);
          });

          trans.addEventListener('complete', function() {
            callback(null);
          });
        } else {
          // invoke callback nothing to sync
          callback(null);
        }
      });
    },

    _createModel: function(obj, id) {
      if (!(obj instanceof Calendar.Models.Account)) {
        obj = new Calendar.Models.Account(obj);
      }

      if (typeof(id) !== 'undefined') {
        obj._id = id;
      }

      return obj;
    },

    /**
     * Marks given model with an error and sends an error event with the given
     * model
     *
     * This will trigger an 'error' event immediately with the given model.
     * The callback fires _after_ the event. Its entirely possible (under rare
     * conditions) that this operation will fail but the event will fire.
     *
     *
     * @param {Object} account model.
     * @param {Calendar.Error} error to mark model with.
     * @param {IDBTransaction} [trans] optional transaction.
     * @param {Function} [callback] optional called with [err, model].
     */
    markWithError: function(account, error, trans, callback) {
      if (typeof(trans) === 'function') {
        callback = trans;
        trans = null;
      }

      if (!account._id)
        throw new Error('given account must be persisted');

      if (!account.error) {
        account.error = {
          name: error.name,
          date: new Date(),
          count: 0
        };
      }

      // increment the error count
      account.error.count++;

      var calendarStore = this.db.getStore('Calendar');
      var self = this;
      function fetchedCalendars(err, calendars) {
        if (!trans) {
          trans = self.db.transaction(
            self._dependentStores,
            'readwrite'
          );
        }

        if (err) {
          console.error('Cannot fetch all calendars', err);
          return self.persist(account, trans, callback);
        }

        for (var id in calendars) {
          calendarStore.markWithError(calendars[id], error, trans);
        }

        self.persist(account, trans);
        self._transactionCallback(trans, callback);

      }

      fetchedCalendars(null, calendarStore.remotesByAccount(
        account._id
      ));
    },

    /**
     * Returns a list of available presets filtered by
     * the currently used presets in the database.
     *
     * Expected structure of the presetList is as follows:
     *
     *    {
     *      'presetType': {
     *        // most important field when true if the preset
     *        // is available in the database that preset type
     *        // will be excluded.
     *        singleUse: true
     *        providerType: 'X',
     *        options: {}
     *      }
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
    }

  };

  Calendar.ns('Store').Account = Account;

}(this));
