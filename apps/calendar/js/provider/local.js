Calendar.ns('Provider').Local = (function() {

  const LOCAL_CALENDAR_ID = 'local-first';

  function Local() {
    Calendar.Provider.Abstract.apply(this, arguments);

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
