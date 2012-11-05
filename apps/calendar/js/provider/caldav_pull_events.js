Calendar.ns('Provider').CaldavPullEvents = (function() {

  var Calc = Calendar.Calc;
  var debug = Calendar.debug('pull events');

  /**
   * Event synchronization class for caldav provider.
   *
   * Options:
   *  - app: current calendar app (Calendar.App by default)
   *  - account: (Calendar.Models.Account) required
   *  - calendar: (Calendar.Models.Calendar) required
   *
   * Example:
   *
   *    // instance of a service stream
   *    var stream;
   *
   *    var pull = new Calendar.Provider.CaldavPullEvents(stream, {
   *      calendar: calendarModel,
   *      account: accountModel,
   *      app: Calendar.App
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

    stream.on('event', this);
    stream.on('occurrence', this);
    stream.on('recurring end', this);
    stream.on('missing events', this);

    this.icalQueue = [];
    this.eventQueue = [];
    this.busytimeQueue = [];
    this.alarmQueue = [];

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
      var calendarId = this.calendar._id;

      time._id = id;
      time.calendarId = calendarId;
      time.eventId = eventId;

      if (time.alarms) {
        var i = 0;
        var len = time.alarms.length;
        var alarm;

        for (; i < len; i++) {
          alarm = time.alarms[i];
          alarm.eventId = eventId;
          alarm.busytimeId = id;
        }
      }

      return this._busytimeStore.initRecord(time);
    },

    handleOccurrenceSync: function(item) {
      var alarms;

      if ('alarms' in item) {
        alarms = item.alarms;
        delete item.alarms;

        if (alarms.length) {
          var i = 0;
          var len = alarms.length;

          for (; i < len; i++) {
            this.alarmQueue.push(alarms[i]);
          }
        }
      }

      this.app.timeController.cacheBusytime(item);
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
      this.app.timeController.cacheEvent(event);

      this.eventQueue.push(event);

      var component = event.remote.icalComponent;
      delete event.remote.icalComponent;


      this.icalQueue.push({
        data: event.remote.icalComponent,
        eventId: event._id
      });

      if (exceptions) {
        for (var i = 0; i < exceptions.length; i++) {
          this.handleEventSync(this.formatEvent(exceptions[i]));
        }
      }
    },


    handleEvent: function(event) {
      var data = event.data;

      switch (event.type) {
        case 'missing events':
          this.removeList = data[0];
          break;
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
      var icalComponentStore = this.app.store('IcalComponent');
      var calendarStore = this.app.store('Calendar');
      var busytimeStore = this.app.store('Busytime');
      var alarmStore = this.app.store('Alarm');

      var calendar = this.calendar;
      var account = this.account;

      var trans = calendarStore.db.transaction(
        ['calendars', 'events', 'busytimes', 'alarms', 'icalComponents'],
        'readwrite'
      );

      var self = this;

      this.eventQueue.forEach(function(event) {
        debug('add event', event);
        eventStore.persist(event, trans);
      });

      this.icalQueue.forEach(function(ical) {
        debug('add component', ical);
        icalComponentStore.persist(ical, trans);
      });

      this.busytimeQueue.forEach(function(busy) {
        debug('add busytime', busy);
        busytimeStore.persist(busy, trans);
      });

      this.alarmQueue.forEach(function(alarm) {
        debug('add alarm', alarm);
        alarmStore.persist(alarm, trans);
      });

      if (this.removeList) {
        this.removeList.forEach(function(id) {
          eventStore.remove(id, trans);
        });
      }

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
