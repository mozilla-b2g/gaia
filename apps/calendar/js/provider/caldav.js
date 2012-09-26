Calendar.ns('Provider').Caldav = (function() {

  function CaldavProvider() {
    Calendar.Provider.Abstract.apply(this, arguments);

    this.service = this.app.serviceController;
  }

  CaldavProvider.prototype = {
    __proto__: Calendar.Provider.Abstract.prototype,
    role: 'caldav',
    useUrl: true,
    useCredentials: true,
    canSync: true,

    getAccount: function(account, callback) {
      this.service.request(
        'caldav',
        'getAccount',
        account,
        callback
      );
    },

    findCalendars: function(account, callback) {
      this.service.request('caldav', 'findCalendars', account, callback);
    },

    streamEvents: function(account, calendar) {
      return this.service.stream(
        'caldav', 'streamEvents', account, calendar
      );
    },

    _syncEvents: function(account, calendar, cached, callback) {
      var stream = this.streamEvents(
        account.toJSON(),
        calendar.remote
      );

      var pull = new Calendar.Provider.CaldavPullEvents(stream, {
        cached: cached,
        account: account,
        calendar: calendar
      });

      stream.request(function(err) {
        if (err) {
          callback(err);
          return;
        }

        pull.commit(function(commitErr) {
          if (commitErr) {
            callback(err);
            return;
          }
          callback(null);
        });

      });
    },

    /**
     * Builds event cache for given calendar.
     *
     * @param {Calendar.Model.Calendar} calender model instance.
     * @param {Function} callback node style [err, results].
     */
    _buildEventsFor: function(calendar, callback) {
      var store = this.app.store('Event');

      store.eventsForCalendar(calendar._id, function(err, results) {
        if (err) {
          callback(err);
          return;
        }

        var list = {};

        // XXX: in the future we can modify this further
        // to exclude items from the sync/removal list.
        results.forEach(function(item) {
          list[item._id] = item;
        });

        callback(null, list);
      });
    },

    /**
     * Sync remote and local events for a calendar.
     */
    syncEvents: function(account, calendar, callback) {
      var self = this;

      if (!calendar._id) {
        throw new Error('calendar must be assigned an _id');
      }

      // Don't attempt to sync when provider cannot
      // or we have matching tokens
      if ((calendar.lastEventSyncToken &&
           calendar.lastEventSyncToken === calendar.remote.syncToken)) {
        callback(null);
        return;
      }

      this._buildEventsFor(calendar, function(err, results) {
        if (err) {
          callback(err);
          return;
        }

        self._syncEvents(
          account,
          calendar,
          results,
          callback
        );
      });

    }

  };

  return CaldavProvider;

}());
