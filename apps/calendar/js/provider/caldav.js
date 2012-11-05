Calendar.ns('Provider').Caldav = (function() {

  var _super = Calendar.Provider.Abstract.prototype;

  /**
   * The local provider contains most of the logic
   * of the database persistence so we reuse those bits
   * and wrap them with the CalDAV specific logic.
   */
  var Local = Calendar.Provider.Local.prototype;

  function CaldavProvider() {
    Calendar.Provider.Abstract.apply(this, arguments);

    this.service = this.app.serviceController;
    this.busytimes = this.app.store('Busytime');
    this.events = this.app.store('Event');
    this.icalComponents = this.app.store('IcalComponent');
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
        startDate: startDate,
        cached: cached
      };

      var stream = this.service.stream(
        'caldav', 'streamEvents',
        account.toJSON(),
        calendar.remote,
        options
      );

      var pull = new Calendar.Provider.CaldavPullEvents(stream, {
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

      return pull;
    },

    /**
     * Builds list of event urls & sync tokens.
     *
     * @param {Calendar.Model.Calendar} calender model instance.
     * @param {Function} callback node style [err, results].
     */
    _cachedEventsFor: function(calendar, callback) {
      var store = this.app.store('Event');

      store.eventsForCalendar(calendar._id, function(err, results) {
        if (err) {
          callback(err);
          return;
        }

        var list = Object.create(null);

        var i = 0;
        var len = results.length;
        var item;

        for (; i < len; i++) {
          item = results[i];
          list[item.remote.url] = {
            syncToken: item.remote.syncToken,
            id: item._id
          };
        }

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

      this._cachedEventsFor(calendar, function(err, results) {
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
      var calendar = this.events.calendarFor(event);
      var account = this.events.accountFor(event);

      this.service.request(
        'caldav',
        'createEvent',
        account,
        calendar.remote,
        event.remote,
        function handleCreate(err, remote) {
          if (err) {
            callback(err);
            return;
          }

          var event = {
            _id: calendar._id + '-' + remote.id,
            calendarId: calendar._id
          };

          var component = {
            eventId: event._id,
            data: remote.icalComponent
          }

          delete remote.icalComponent;
          event.remote = remote;

          var create = Calendar.EventMutations.create({
            event: event,
            icalComponent: component
          });

          create.commit(function(err) {
            if (err) {
              callback(err);
              return;
            }

            callback(null, create.busytime, create.event);
          });
        }
      );
    },

    updateEvent: function(event, busytime, callback) {
      if (typeof(busytime) === 'function') {
        callback = busytime;
        busytime = null;
      }

      var calendar = this.events.calendarFor(event);
      var account = this.events.accountFor(event);
      var self = this;

      function handleUpdate(err, remote) {
        if (err) {
          callback(err);
          return;
        }

        var component = {
          eventId: event._id,
          data: remote.icalComponent
        }

        delete remote.icalComponent;
        event.remote = remote;

        var update = Calendar.EventMutations.update({
          event: event,
          icalComponent: component
        });

        update.commit(function(err) {
          if (err) {
            callback(err);
            return;
          }
          callback(null, update.busytime, update.event);
        });

      }

      // get the raw ical component
      this.icalComponents.get(event._id, function(err, ical) {
        if (err) {
          callback(err);
          return;
        }

        var details = {
          event: event.remote,
          icalComponent: ical.data
        };

        self.service.request(
          'caldav',
          'updateEvent',
          account,
          calendar.remote,
          details,
          handleUpdate
        );
      });
    },

    deleteEvent: function(event, busytime, callback) {
      if (typeof(busytime) === 'function') {
        callback = busytime;
        busytime = null;
      }

      var store = this.app.store('Event');

      var calendar = store.calendarFor(event);
      var account = store.accountFor(event);
      var self = this;

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

          Local.deleteEvent.call(self, event, busytime, callback);
        }
      );
    }

  };

  return CaldavProvider;

}());
