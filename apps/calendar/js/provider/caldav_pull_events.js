Calendar.ns('Provider').CaldavPullEvents = (function() {

  var Calc = Calendar.Calc;

  /**
   * Event synchronization class for caldav provider.
   *
   * Options:
   *  - app: current calendar app (Calendar.App by default)
   *  - account: (Calendar.Models.Account) required
   *  - calendar: (Calendar.Models.Calendar) required
   *  - cached: Currently cached events for this sync operation.
   *
   * Example:
   *
   *    // instance of a service stream
   *    var stream;
   *
   *    var pull = new Calendar.Provider.CaldavPullEvents(stream, {
   *      calendar: calendarModel,
   *      account: accountModel,
   *      app: Calendar.App,
   *      cached: [
   *        'eventId': eventModel,
   *        //...
   *      ]
   *    });
   *
   *    stream.request(function() {
   *      // stream is complete here the audit of
   *      // events can be made. They are flushed
   *      // to the cache where possible but not actually
   *      // persisted in the database.
   *
   *      // assuming we are ready commit the changes
   *      pull.commit(function(err) {
   *        // all changes have been committed at this point.
   *      });
   *    });
   *
   * @param {Calendar.Responder} stream event emitter usually
   *                                    a service stream.
   * @param {Object} options options for instance (see above).
   */
  function PullEvents(stream, options) {
    if (options.calendar) {
      this.calendar = options.calendar;
    } else {
      throw new Error('.calendar option must be given');
    }

    if (options.account) {
      this.account = options.account;
    } else {
      throw new Error('.account option must be given');
    }

    if (options.app) {
      this.app = options.app;
    } else {
      this.app = Calendar.App;
    }

    if (options.cached) {
      this.cached = options.cached;
    } else {
      throw new Error('.cached options must be provided');
    }

    stream.on('event', this);
    stream.on('occurrence', this);
    stream.on('recurring end', this);

    this.eventQueue = [];
    this.busytimeQueue = [];
    this.removeList = Object.keys(this.cached);
    this.syncStart = new Date();

    this._busytimeStore = this.app.store('Busytime');
  }

  PullEvents.prototype = {

    eventQueue: null,
    busytimeQueue: null,

    /**
     * Get db id for busytime.
     *
     * @param {Object} busytime service sent busytime.
     */
    busytimeIdFromRemote: function(busytime) {
      var eventId = this.eventIdFromRemote(busytime, !busytime.isException);

      return busytime.start.utc + '-' +
             busytime.end.utc + '-' +
             eventId;
    },

    /**
     * Get db id for event.
     *
     * @param {Object} event service sent event or '.remote'
     *                       property in db event.
     *
     * @param {Boolean} ignoreException when true will ignore
     *                                  recurrence exceptions.
     *
     * @return {String} database object id.
     */
    eventIdFromRemote: function(event, ignoreException) {
      var id = event.eventId || event.id;

      if (!ignoreException && event.recurrenceId) {
        id += '-' + event.recurrenceId.utc;
      }

      return this.calendar._id + '-' + id;
    },

    /**
     * Format an incoming event.
     *
     * @param {Object} event service sent event.
     */
    formatEvent: function(event) {
      // get id or parent id we ignore the exception
      // rules here so children (exceptions) can lookup
      // their parents id.
      var id = this.eventIdFromRemote(event, true);

      var result = Object.create(null);
      result.calendarId = this.calendar._id;
      result.remote = event;

      if (event.recurrenceId) {
        result.parentId = id;
        // don't ignore the exceptions
        result._id = this.eventIdFromRemote(event);
      } else {
        result._id = id;
      }

      return result;
    },

    /**
     * Formats and tags busytime sent from service.
     *
     * @param {Object} time service sent busytime.
     */
    formatBusytime: function(time) {
      var id = this.busytimeIdFromRemote(time);
      var eventId = this.eventIdFromRemote(time, !time.isException);

      time._id = id;
      time.calendarId = this.calendar._id;
      time.eventId = eventId;

      return time;
    },

    handleOccurrenceSync: function(item) {
      this._busytimeStore.addTime(item, true);
      this.busytimeQueue.push(item);
    },

    handleEventSync: function(event) {
      var exceptions = event.remote.exceptions;
      delete event.remote.exceptions;

      var id = event._id;
      var token = event.remote.syncToken;

      // clear any busytimes that could possibly be
      // related to this event as we will be adding new
      // ones as part of the sync.
      this._busytimeStore.removeEvent(id);

      if (id in this.cached) {
        // existing event
        var local = this.cached[id];
        var idx = this.removeList.indexOf(id);
        this.removeList.splice(idx, 1);

        if (local.remote.syncToken !== token) {
          this.eventQueue.push(event);
        }
      } else {
        this.eventQueue.push(event);
      }


      if (exceptions) {
        for (var i = 0; i < exceptions.length; i++) {
          this.handleEventSync(this.formatEvent(exceptions[i]));
        }
      }
    },

    handleEvent: function(event) {
      var data = event.data;

      switch (event.type) {
        case 'occurrence':
          var occur = this.formatBusytime(data[0]);
          this.handleOccurrenceSync(occur);
          break;
        case 'event':
          var event = this.formatEvent(data[0]);
          this.handleEventSync(event);
          break;
      }
    },

    commit: function(callback) {
      var eventStore = this.app.store('Event');
      var calendarStore = this.app.store('Calendar');
      var busytimeStore = this.app.store('Busytime');

      var calendar = this.calendar;
      var account = this.account;

      var trans = calendarStore.db.transaction(
        ['calendars', 'events', 'busytimes'], 'readwrite'
      );

      var self = this;

      this.eventQueue.forEach(function(event) {
        eventStore.persist(event, trans);
      });

      this.busytimeQueue.forEach(function(busy) {
        busytimeStore.persist(busy, trans);
      });

      this.removeList.forEach(function(id) {
        eventStore.remove(id, trans);
      });

      calendar.lastEventSyncToken = calendar.remote.syncToken;
      calendar.lastEventSyncDate = this.syncStart;

      if (!calendar.firstEventSyncDate) {
        calendar.firstEventSyncDate = this.syncStart;
      }

      calendarStore.persist(calendar, trans);

      trans.addEventListener('error', function(e) {
        callback(e);
      });

      trans.addEventListener('complete', function() {
        callback(null);
      });
    }

  };

  return PullEvents;

}());
