(function(window) {

  function Account() {
    Calendar.Store.Abstract.apply(this, arguments);
  }

  Account.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _store: 'accounts',

    _parseId: Calendar.Store.Abstract.prototype.probablyParseInt,

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
      var self = this;
      var provider = Calendar.App.provider(
        model.providerType
      );

      provider.getAccount(model.toJSON(), function(err, data) {
        if (err) {
          callback(err);
          return;
        }

        model.error = undefined;

        // if this works we always will get a calendar home.
        // This is used to find calendars.
        model.calendarHome = data.calendarHome;

        // server may override properties on demand.
        Calendar.extend(model, data);

        self._validateModel(model, function(err) {
          if (err) {
            return callback(err);
          }

          self.persist(model, callback);
        });
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

      var self = this;
      var provider = Calendar.App.provider(account.providerType);
      var calendarStore = this.db.getStore('Calendar');

      var persist = [];

      // remotesByAccount return an object indexed by remote ids
      var calendars;

      // these are remote ids not local ones
      var originalIds;

      function fetchExistingCalendars(err, results) {
        if (err) {
          return callback(err);
        }

        calendars = results;
        originalIds = Object.keys(calendars);

        provider.findCalendars(account, persistCalendars);
      }

      function persistCalendars(err, remoteCals) {
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
                calendarStore._createModel({
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
            calendarStore.remove(calendars[id]._id, trans);
          });

          persist.forEach(function(object) {
            calendarStore.persist(object, trans);
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
      }

      calendarStore.remotesByAccount(
        account._id,
        fetchExistingCalendars
      );
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
      this.all(function(err, list) {
        if (err) return callback(err);

        var results = [];
        for (var key in list) {
          var account = list[key];
          var provider = Calendar.App.provider(account.providerType);
          if (provider.canSync) {
            results.push(account);
          }
        }
        callback(null, results);
      });
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
