Calendar.ns('Provider').Local = (function() {

  const LOCAL_CALENDAR_ID = 'local-first';

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
    var list = {};
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
    * @param {Object} account model.
    * @param {String} url location of event.
    * @param {Function} callback node style callback fired after event parsing.
    */
    importFromUrl: function(account, url, callback) {
      var stream = this.service.stream(
        'ical',
        'importFromUrl',
         account,
         url
        );      
      var calendar = Calendar.App.store('Calendar');
      calendar.get(Calendar.Provider.Local.calendarId,function(err, param){
        var pulleventcalendar = param;
        if (!param) {
          callback('no calendar', null);
          return;   
        }
        var preliminaryaccount = Calendar.App.store('Account');
        preliminaryaccount.get(pulleventcalendar.accountId,function(err, param){
          var pulleventaccount = param;
          if (!param) {
            callback('no account', null);
            return;   
          }
          var pull = new Calendar.Provider.CaldavPullEvents(stream, {
            calendar: pulleventcalendar,
            account: pulleventaccount
          });
          stream.request(function() {
            // stream is complete here the audit of
            // events can be made. They are flushed
            // to the cache where possible but not actually
            // persisted in the database.

            // assuming we are ready commit the changes
            pull.commit(function(err) {
              // all changes have been committed at this point.
            });
          });
        },null);
      },function(err, param){
      });
    },

    /**
    * Import events to a calendar from the .ics file represented by blob.
    *
    * @param {Object} account model.
    * @param {String} url location of event.
    * @param {Function} callback node style callback fired after event parsing.
    */
    importFromICS: function(account, blob, callback) {
      var stream = this.service.stream(
        'ical',
        'importFromICS',
         account,
         blob
        );      
      var calendar = Calendar.App.store('Calendar');
      calendar.get(Calendar.Provider.Local.calendarId,function(err, param){
        var pulleventcalendar = param;
        if (!param) {
          callback('no calendar', null);
          return;   
        }
        var preliminaryaccount = Calendar.App.store('Account');
        preliminaryaccount.get(pulleventcalendar.accountId,function(err, param){
          var pulleventaccount = param;
          if (!param) {
            callback('no account', null);
            return;   
          }
          var pull = new Calendar.Provider.CaldavPullEvents(stream, {
             calendar: pulleventcalendar,
             account: pulleventaccount
          });
          stream.request(function() {
            // stream is complete here the audit of
            // events can be made. They are flushed
            // to the cache where possible but not actually
            // persisted in the database.

            // assuming we are ready commit the changes
            pull.commit(function(err) {
              // all changes have been committed at this point.
            });
          });
        },null);
      },function(err, param){
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
