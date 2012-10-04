  Calendar.ns('Provider').Local = (function() {

  const LOCAL_CALENDAR_ID = 'local-first';

  function Local() {
    Calendar.Provider.Abstract.apply(this, arguments);
  }

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
      name = 'Offline Calendar';
    }

    return {
      // XXX localize this name somewhere
      name: name,
      id: LOCAL_CALENDAR_ID,
      color: '#D2642A'
    };
  }

  Local.prototype = {
    __proto__: Calendar.Provider.Abstract.prototype,

    canCreateEvent: true,
    canUpdateEvent: true,
    canDeleteEvent: true,

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

      this.app.store('Event').persist(event, callback);
    },

    deleteEvent: function(event, busytime, callback) {
      if (typeof(busytime) === 'function') {
        callback = busytime;
        busytime = null;
      }

      this.app.store('Event').remove(event._id, callback);
    },

    updateEvent: function(event, busytime, callback) {
      if (typeof(busytime) === 'function') {
        callback = busytime;
        busytime = null;
      }

      // remove associated busytimes with previous event.
      this.app.store('Busytime').removeEvent(event._id);

      this.app.store('Event').persist(event, callback);
    }

  };

  return Local;

}());
