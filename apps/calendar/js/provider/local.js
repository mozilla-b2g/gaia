/* global uuid */
Calendar.ns('Provider').Local = (function() {
  'use strict';

  var LOCAL_CALENDAR_ID = 'local-first';

  function Local() {
    Calendar.Provider.Abstract.apply(this, arguments);
    this.service = this.app.serviceController;
    this.events = this.app.store('Event');
    this.busytimes = this.app.store('Busytime');
    this.alarms = this.app.store('Alarm');
  }

  Local.calendarId = LOCAL_CALENDAR_ID;

  /**
   * Returns the details for the default calendars.
   */
  Local.defaultCalendar = function() {
    //XXX: Make async
    var l10nId = 'calendar-local';
    var name;

    if ('mozL10n' in window.navigator) {
      name = window.navigator.mozL10n.get(l10nId);
      if (name === l10nId) {
        name = null;
      }
    }

    if (!name) {
      name = 'Offline calendar';
    }

    return {
      // XXX localize this name somewhere
      name: name,
      id: LOCAL_CALENDAR_ID,
      color: Local.prototype.defaultColor
    };

  };

  Local.prototype = {
    __proto__: Calendar.Provider.Abstract.prototype,

    canExpandRecurringEvents: false,

    /**
     * Import events to a calendar from the .ics file at the given url.
     *
     * @param {String} location location of event.
     * @param {Function} callback node style callback fired after event parsing.
     */
    importCalendar: function(location, callback, calendar, account) {
      var stream = this.service.stream('ical', 'importCalendar', location);
      this._commitToLocalCalendar(stream, callback, calendar, account);
    },

    /**
     * Commits ical events, components and busytimes
     * that were emitted to stream in a Local offline calendar database.
     *
     * @param {Calendar.Responder} stream to whose emitted events we
     *  have to commit.
     *
     * @param {Function} callback node style callback fired in case
     *  of commit error.
     *
     * @param {Object} calendar, optional Calendar object for CaldavPullEvents.
     * @param {Object} account, optional Account object for CaldavPullEvents.
     */
    _commitToLocalCalendar: function(stream, callback, calendar, account) {
      var self = this;
      if (!calendar) {
        var calendarStore = Calendar.App.store('Calendar');
        calendarStore.get(Calendar.Provider.Local.calendarId,
          function(err, pulleventcalendar) {
            if (!pulleventcalendar) {
              callback(new Error('no calendar'));
              return;
            }
            if (!account) {
              self._retriveAccountAndPull(pulleventcalendar, stream, callback);
            } else {
              self._createPullEvent(
                pulleventcalendar,
                account,
                stream,
                callback
              );
            }
          }
        );
      } else if (!account) {
        self._retriveAccountAndPull(calendar, stream, callback);
      } else {
        self._createPullEvent(calendar, account, stream, callback);
      }
    },

    /**
     * Given a calendar, retrives account and creates a CaldavPullEvent.
     *
     * @param {Object} calendar, Calendar object for CaldavPullEvents.
     * @param {Calendar.Responder} stream to whose emitted events we
     *  have to commit.
     *
     * @param {Function} callback, node style callback.
     */
    _retriveAccountAndPull: function(calendar, stream, callback)  {
      var self = this;
      var accountStore = Calendar.App.store('Account');
      accountStore.get(calendar.accountId,
        function(err, pulleventaccount) {
          // pulleventaccount is used to initalize CaldavPullEvents
          if (!pulleventaccount) {
            callback(new Error('no account'));
            return;
          }
          self._createPullEvent(calendar, pulleventaccount, stream);
        }
      );
    },

    /**
     * Creates an instance of CaldavPullEvents and commits
     * ical data received on the stream.
     *
     * @param {Object} calendar, Calendar object for CaldavPullEvents.
     * @param {Object} account, Account object for CaldavPullEvents.
     * @param {Calendar.Responder} stream to whose emitted events we
     *  have to commit.
     *
     * @param {Function} callback, node style callback.
     */
    _createPullEvent: function(calendar, account, stream, callback) {
      var pull = new Calendar.Provider.CaldavPullEvents(stream, {
        calendar: calendar,
        account: account
      });
      pull.on('complete', callback);
      stream.request(function() {
        // stream is complete here the audit of
        // events can be made. They are flushed
        // to the cache where possible but not actually
        // persisted in the database.
      });
    },

    getAccount: function(account, callback) {
      callback(null, {});
    },

    findCalendars: function(account, callback) {
      var list = {};
      list[LOCAL_CALENDAR_ID] = Local.defaultCalendar();
      callback(null, list);
    },

    syncEvents: function(account, calendar, cb) {
      cb(null);
    },

    /**
     * @return {Calendar.EventMutations.Create} mutation object.
     */
    createEvent: function(event, callback) {
      // most providers come with their own built in
      // id system when creating a local event we need to generate
      // our own UUID.
      if (!event.remote.id) {
        // TOOD: uuid is provided by ext/uuid.js
        //       if/when platform supports a safe
        //       random number generator (values never conflict)
        //       we can use that instead of uuid.js
        event.remote.id = uuid();
      }

      var create = new Calendar.EventMutations.create({
        event: event
      });

      create.commit(function(err) {
        if (err) {
          callback(err);
          return;
        }
        callback(null, create.busytime, create.event);
      });

      return create;
    },

    deleteEvent: function(event, busytime, callback) {
      if (typeof(busytime) === 'function') {
        callback = busytime;
        busytime = null;
      }

      this.app.store('Event').remove(event._id, callback);
    },

    /**
     * @return {Calendar.EventMutations.Update} mutation object.
     */
    updateEvent: function(event, busytime, callback) {
      if (typeof(busytime) === 'function') {
        callback = busytime;
        busytime = null;
      }

      var update = Calendar.EventMutations.update({
        event: event
      });

      update.commit(function(err) {
        if (err) {
          callback(err);
          return;
        }
        callback(null, update.busytime, update.event);
      });

      return update;
    }

  };

  return Local;

}());
