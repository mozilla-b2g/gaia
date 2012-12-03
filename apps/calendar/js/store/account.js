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

        // if this works we always will get a calendar home.
        // This is used to find calendars.
        model.calendarHome = data.calendarHome;

        // entrypoint is used to re-authenticate.
        if ('entrypoint' in data) {
          model.entrypoint = data.entrypoint;
        }

        if ('domain' in data) {
          model.domain = data.domain;
        }

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

      provider.findCalendars(account.toJSON(), function(err, remoteCals) {
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
    }

  };

  Calendar.ns('Store').Account = Account;

}(this));
