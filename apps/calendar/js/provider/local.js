  Calendar.ns('Provider').Local = (function() {

  const LOCAL_CALENDAR_ID = 'local-first';

  function Local() {
    Calendar.Provider.Abstract.apply(this, arguments);

    this.events = this.app.store('Event');
    this.busytimes = this.app.store('Busytime');
    this.alarms = this.app.store('Alarm');
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

      var trans = this.events.db.transaction(
        this.events._dependentStores,
        'readwrite'
      );

      var self = this;
      var controller = this.app.timeController;

      trans.addEventListener('complete', function() {
        //XXX: until we turn on event memory caching
        //     this needs to come after the db persistence.
        controller.cacheBusytime(
          self.busytimes.initRecord(busytime)
        );

        callback(null, busytime, event);
      });

      this.events.persist(event, trans);

      // needs to come after event persistence
      var busytime = this.busytimes.factory(event);
      this.busytimes.persist(busytime, trans);
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

      var self = this;
      var busytime = self.busytimes.factory(event);
      var controller = this.app.timeController;

      // delete must not be in same transaction as
      // creation of busytime records.
      this.busytimes.removeEvent(event._id, function(err) {
        if (err) {
          callback(err);
          return;
        }

        // update after busytimes are removed.
        var trans = self.events.db.transaction(
          self.events._dependentStores,
          'readwrite'
        );

        trans.addEventListener('complete', function() {
          // must come after removeEvent above
          // to avoid having the new record removed.

          // TODO: move this outside of the persist
          // once the event caching is turned on again.
          controller.cacheBusytime(
            self.busytimes.initRecord(busytime)
          );

          callback(null, busytime, event);
        });

        self.events.persist(event, trans);
        self.busytimes.persist(busytime, trans);
      });

    }

  };

  return Local;

}());
