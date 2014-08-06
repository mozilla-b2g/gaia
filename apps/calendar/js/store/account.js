(function(window) {
  'use strict';

  /**
   * Module dependencies
   */
  var extend = Calendar.extend,
      filter = Calendar.Object.filter,
      map = Calendar.Object.map,
      provider = Calendar.Provider.provider;

  function Account() {
    Calendar.Store.Abstract.apply(this, arguments);

    Calendar.Promise.denodeifyAll(this, [
      'verifyAndPersist',
      'sync',
      'markWithError',
      'syncableAccounts',
      'availablePresets'
    ]);
  }

  Account.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _store: 'accounts',

    _parseId: Calendar.probablyParseInt,

    /**
     * Checks if a given account is a duplicate of another.
     *
     * @param {Calendar.Model.Account} model to check.
     * @param {Function} callback [err].
     */
    _validateModel: function(model, callback) {
      this.all(function(err, allAccounts) {
        if (err) {
          callback(err);
          return;
        }

        // check if this account is already registered
        for (var index in allAccounts) {
          if (
              allAccounts[index].user === model.user &&
              allAccounts[index].fullUrl === model.fullUrl &&
              allAccounts[index]._id !== model._id
          ) {

            var dupErr = new Error(
              'Cannot add two accounts with the same url / entry point'
            );

            dupErr.name = 'account-exist';
            callback(dupErr);
            return;
          }
        }

        callback();
      });
    },

    verifyAndPersist: function(model, callback) {
      provider.getAccount(model.toJSON()).then((data) => {
        model.error = undefined;
        // if this works we always will get a calendar home.
        // This is used to find calendars.
        model.calendarHome = data.calendarHome;
        // server may override properties on demand.
        extend(model, data);
        this._validateModel(model, (err) => {
          if (err) {
            throw err;
          }

          this.persist(model, callback);
        });
      })
      .catch(callback);
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
      store.remotesByAccount(id, trans, function(err, related) {
        if (err) {
          console.log('Error removing deps for account: ', id);
          return;
        }
        var key;
        for (key in related) {
          store.remove(related[key]._id, trans);
        }
      });
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

      // remotesByAccount return an object indexed by remote ids
      var calendars;
      // these are remote ids not local ones
      var originalIds;

      var calendarStore = this.db.getStore('Calendar');
      calendarStore.remotesByAccount(account._id)
      .then((results) => {
        calendars = results;
        originalIds = Object.keys(results);
        return provider.findCalendars(account);
      })
      .then((remotes) => {
        var persist = map(remotes, (key, cal) => {
          var index = originalIds.indexOf(key);
          if (index !== -1) {
            // Remove from originalIds.
            originalIds.splice(index, 1);
            // Update an existing calendar.
            var original = calendars[key];
            original.remote = cal;
            original.error = undefined;
            return original;
          }

          // Create a new calendar.
          return calendarStore._createModel({
            remote: new Object(cal),
            accountId: account._id
          });
        });

        // Now calendars remaining in originalIds should be removed.
        if (!persist.length && !originalIds.length) {
          // Nothing to do.
          return;
        }

        var trans = this.db.transaction(this._dependentStores, 'readwrite');

        // Remove
        originalIds.forEach((id) => {
          calendarStore.remove(calendars[id]._id, trans);
        });

        // Create/Update
        persist.forEach((object) => {
          calendarStore.persist(object, trans);
        });

        return new Promise((resolve, reject) => {
          trans.addEventListener('error', reject);
          trans.addEventListener('complete', resolve);
        });
      })
      .then(() => {
        callback();
      })
      .catch(callback);
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

      if (!account._id) {
        throw new Error('given account must be persisted');
      }

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

      // find related calendars and mark those too
      calendarStore.remotesByAccount(
        account._id,
        fetchedCalendars
      );
    },

    /**
     * Finds and returns all accounts that can sync (based on their provider).
     *
     *    accountStore.syncableAccounts(function(err, list) {
     *      if (list.length === 0)
     *        // hide sync options
     *    });
     *
     * @param {Function} callback [Error err, Array accountList].
     */
    syncableAccounts: function(callback) {
      this.all().then((list) => {
        return Promise.resolve(
          filter(list, (key, account) => {
            return !provider.isLocal(account);
          }, this)
        );
      })
      .then(callback)
      .catch(callback);
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
     *    }
     *
     * @param {Object} presetList see example ^^^.
     * @param {Function} callback [err, ['presetKey', ...]].
     */
    availablePresets: function(presetList, callback) {
      var results = [];
      var singleUse = {};
      var hasSingleUses = false;

      for (var preset in presetList) {
        if (presetList[preset].singleUse) {
          hasSingleUses = true;
          singleUse[preset] = true;
        } else {
          results.push(preset);
        }
      }

      if (!hasSingleUses) {
        return Calendar.nextTick(function() {
          callback(null, results);
        });
      }

      this.all(function(err, list) {
        if (err) {
          callback(err);
          return;
        }

        for (var id in list) {
          var preset = list[id].preset;
          if (singleUse[preset]) {
            delete singleUse[preset];
          }
        }

        // add un-used presets to the list.
        callback(null, results.concat(Object.keys(singleUse)));
      });
    }
  };

  Calendar.ns('Store').Account = Account;

}(this));
