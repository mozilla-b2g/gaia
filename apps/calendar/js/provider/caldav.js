Calendar.ns('Provider').Caldav = (function() {

  var _super = Calendar.Provider.Abstract.prototype;

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

    /**
     * Number of dates in the past to sync.
     * This is usually from the first sync date.
     */
    daysToSyncInPast: 30,

    canCreateEvent: true,
    canUpdateEvent: true,
    canDeleteEvent: true,

    /**
     * Returns the capabilities of a single event.
     */
    eventCapabilities: function(event) {
      if (event.remote.isRecurring) {
        // XXX: for now recurring events cannot be edited
        return {
          canUpdate: false,
          canDelete: false,
          canCreate: false
        };
      } else {
        return _super.eventCapabilities.call(this, event);
      }
    },

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

    _syncEvents: function(account, calendar, cached, callback) {

      // calculate the first date we want to sync
      var startDate = calendar.firstEventSyncDate;
      if (!startDate) {
        startDate = Calendar.Calc.createDay(new Date());
      }
      startDate.setDate(startDate.getDate() - this.daysToSyncInPast);

      var options = {
        startDate: startDate
      };

      var stream = this.service.stream(
        'caldav', 'streamEvents',
        account.toJSON(),
        calendar.remote,
        options
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

    },

    createEvent: function(event, busytime, callback) {
      if (typeof(busytime) === 'function') {
        callback = busytime;
        busytime = null;
      }

      var self = this;
      var store = this.app.store('Event');

      var calendar = store.calendarFor(event);
      var account = store.accountFor(event);

      this.service.request(
        'caldav',
        'createEvent',
        account,
        calendar.remote,
        event.remote,
        function handleDelete(err, remote) {
          if (err) {
            callback(err);
            return;
          }

          var event = {
            _id: calendar._id + '-' + remote.id,
            calendarId: calendar._id
          };

          event.remote = remote;
          store.persist(event, callback);
        }
      );
    },

    updateEvent: function(event, busytime, callback) {
      if (typeof(busytime) === 'function') {
        callback = busytime;
        busytime = null;
      }

      var self = this;
      var store = this.app.store('Event');

      var calendar = store.calendarFor(event);
      var account = store.accountFor(event);

      this.service.request(
        'caldav',
        'updateEvent',
        account,
        calendar.remote,
        event.remote,
        function handleDelete(err, remote) {
          if (err) {
            callback(err);
            return;
          }

          self.app.store('Busytime').removeEvent(event._id);
          //TODO: error handling
          event.remote = remote;
          //event.remote = remote;
          store.persist(event, callback);
        }
      );
    },

    deleteEvent: function(event, busytime, callback) {
      if (typeof(busytime) === 'function') {
        callback = busytime;
        busytime = null;
      }

      var store = this.app.store('Event');

      var calendar = store.calendarFor(event);
      var account = store.accountFor(event);

      this.service.request(
        'caldav',
        'deleteEvent',
        account,
        calendar.remote,
        event.remote,
        function handleDelete(err) {
          if (err) {
            callback(err);
            return;
          }
          //TODO: error handling
          store.remove(event._id, callback);
        }
      );
    }

  };

  return CaldavProvider;

}());
