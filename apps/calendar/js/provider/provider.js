/* global _, uuid */
Calendar.ns('Provider').provider = function() {
  var exports = {};

  /**
   * Module dependencies
   */
  var CaldavPullEvents = Calendar.Provider.CaldavPullEvents,
      createDay = Calendar.Calc.createDay,
      dateToTransport = Calendar.Calc.dateToTransport,
      isOnline = Calendar.isOnline;

  /**
   * Constants
   */
  var prevDaysToSync = 31,
      defaultColor = '#F97C17',
      localCalendarId = 'local-first';

  var app,
      service,
      db,
      accountStore,
      calendarStore,
      busytimeStore,
      eventStore,
      icalComponentStore;

  Object.defineProperty(exports, 'app', {
    set: function(value) {
      app = value;
      service = app.serviceController;
      db = app.db,
      accountStore = app.store('Account');
      calendarStore = app.store('Calendar');
      busytimeStore = app.store('Busytime');
      eventStore = app.store('Event');
      icalComponentStore = app.store('IcalComponent');
    }
  });

  exports.getAccount = function(account, callback) {
    if (account.accountId === localCalendarId) {
      // TODO(gareth): Why would we call this?
      return callback(null, {});
    }

    if (!isOnline()) {
      return callback(createOfflineError());
    }

    service.request('caldav', 'getAccount', account, (err, data) => {
      if (err) {
        return callback(handleServiceError(err), { account: account });
      }

      return callback(null, data);
    });
  };

  exports.findCalendars = function(account, callback) {
    if (account.accountId === localCalendarId) {
      var result = {};
      result[localCalendarId] = localCalendar();
      return callback(null, result);
    }

    if (!isOnline()) {
      return callback(createOfflineError());
    }

    service.request(
      'caldav',
      'findCalendars',
      account.toJSON(),
      (err, data) => {
        if (err) {
          return callback(handleServiceError(err), { account: account });
        }

        callback(null, data);
      }
    );
  };

  exports.syncEvents = function(account, calendar, callback) {
    if (account.accountId === localCalendarId) {
      // Cannot sync local calendar... should throw error perhaps?
      return callback();
    }

    if (!isOnline()) {
      return callback(createOfflineError());
    }

    if (calendar.lastSyncToken === calendar.remote.syncToken) {
      // No need to sync.
      return callback();
    }

    return getCachedEvents(calendar)
    .then((results) => {
      return syncEvents(account, calendar, results);
    })
    .then(() => {
      callback();
    })
    .catch(callback);
  };


  exports.ensureRecurrencesExpanded = function(maxDate, callback) {
    icalComponents.findRecurrencesBefore(maxDate)
    .then((components) => {
      if (!components.length) {
        // Nothing to expand.
        return callback(null, false);
      }

      // CaldavPullEvents needs calendar / account combinations.
      var calendarComponents = _.groupBy(components, (component) => {
        return component.calendarId;
      });

      return Promise.all(
        Object.keys(calendarComponents).map((calendar) => {
          var components = calendarComponents[calendar];
          return expandComponents(calendar, components, {
            maxDate: dateToTransport(maxDate)
          });
        })
      );
    })
    .catch(callback);
  };

  exports.createEvent = function() {
  };

  exports.updateEvent = function() {
  };

  exports.deleteEvent = function() {
  };

  exports.eventCapabilities = function(account, callback) {
  };

  function localCalendar() {
    var l10n = window.navigator.mozL10n;
    var name = l10n ? l10n.get('calendar-local') : 'Offline calendar';
    return { id: localCalendarId, name: name, color: defaultColor };
  }

  function handleServiceError(error, detail) {
  }

  function createOfflineError() {
    var l10n = window.navigator.mozL10n;
    var error = new Error();
    error.name = 'offline';
    error.message = l10n.get('error-offline');
    return error;
  }

  function getCachedEvents(calendar) {
    return eventStore.eventsForCalendar(calendar._id).then((events) => {
      var cache = {};
      events.forEach((event) => {
        var remote = event.remote;
        cache[remote.url] = { id: event._id, syncToken: remote.syncToken };
      });

      return cache;
    });
  }

  function syncEvents(account, calendar, cached) {
    // This is for incremental time range queries which should be replaced
    // with rfc 6578 sync.
    if (!calendar.firstEventSyncDate) {
      // TODO(gareth): This is a lot of hoops to jump through.
      //     Easier way to compute the beginning of the day?
      calendar.firstEventSyncDate = new Date(createDay(new Date()).valueOf());
    }

    var startDate = calendar.firstEventSyncDate;
    startDate.setDate(startDate.getDate() - prevDaysToSync);

    var stream = service.stream(
      'caldav',
      'streamEvents',
      account.toJSON(),
      calendar.remote,
      { startDate: startDate, cached: cached }
    );

    return pipeToStore(stream, {
      account: account,
      calendar: calendar
    })
    .then((transaction) => {
      // Update sync details.
      calendar.error = undefined;
      calendar.lastEventSyncToken = calendar.remote.syncToken;
      return calendarStore.persist(calendar, transaction);
    });
  }

  function expandComponents(calendar, components, options) {
    return calendarStore.ownersOf(calendar)
    .then((owners) => {
      var account = owners.account;
      var calendar = owners.calendar;
      var stream = service.stream(
        'caldav',
        'expandComponents',
        components,
        options
      );

      return pipeToStore(stream, {
        account: account,
        calendar: calendar,
        app: app,
        stores: [
          'alarms',
          'busytimes',
          'icalComponents'
        ]
      });
    });
  }

  function pipeToStore(stream, options) {
    var pull = new CaldavPullEvents(stream, options);
    return new Promise((resolve, reject) => {
      // Start stream.
      stream.request((err) => {
        if (err) {
          return reject(handleServiceError(err, options));
        }

        resolve();
      });
    })
    .then(() => {
      // Pipe stream into indexedDB.
      return new Promise((resolve, reject) => {
        var transaction = pull.commit((err) => {
          if (err) {
            return reject(err);
          }

          // TODO(gareth): This is really weird since CaldavPullEvents#commit
          //     takes a callback and also returns and indexedDB transaction...
          resolve(transaction);
        });
      });
    });
  }

  Calendar.Promise.denodeifyAll(exports, [
    'createEvent',
    'deleteEvent',
    'ensureRecurrencesExpanded',
    'eventCapabilities',
    'findCalendars',
    'getAccount',
    'updateEvent',
    'syncEvents'
  ]);

  return exports;
};
