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
    stream.on('component', this);
    stream.on('occurrence', this);
    stream.on('missingEvents', this);

    this.icalQueue = [];
    this.eventQueue = [];
    this.busytimeQueue = [];
    this.alarmQueue = [];

    this._busytimeStore = this.app.store('Busytime');

    // Catch account events to watch for mid-sync removal
    this._accountStore = this.app.store('Account');
    this._accountStore.on('remove', this._onRemoveAccount.bind(this));

    this._aborted = false;
    this._trans = null;
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
      var eventId = this.eventIdFromRemote(time, !time.isException);
      var id = eventId + '-' + uuid.v4();
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
          var now = Date.now();

          for (; i < len; i++) {
            var alarm = {
              startDate: {},
              eventId: item.eventId,
              busytimeId: item._id
            };

            // Copy the start object
            for (var j in item.start) {
              alarm.startDate[j] = item.start[j];
            }
            alarm.startDate.utc += (alarms[i].trigger * 1000);

            var alarmDate = Calc.dateFromTransport(item.end);
            if (alarmDate.valueOf() < now) {
              continue;
            }
            this.alarmQueue.push(alarm);
          }
        }
      }

      this.app.timeController.cacheBusytime(item);
      this.busytimeQueue.push(item);
    },

    handleComponentSync: function(component) {
      component.eventId = this.eventIdFromRemote(component);
      component.calendarId = this.calendar._id;

      if (!component.lastRecurrenceId) {
        delete component.lastRecurrenceId;
      }

      this.icalQueue.push(component);
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
      // remove details of past cached events....
      this.app.timeController.removeCachedEvent(event._id);
      this.app.timeController.cacheEvent(event);

      this.eventQueue.push(event);

      var component = event.remote.icalComponent;
      delete event.remote.icalComponent;

      // don't save components for exceptions.
      // the parent has the ical data.
      if (!event.remote.recurrenceId) {
        this.icalQueue.push({
          data: component,
          eventId: event._id
        });
      }

      if (exceptions) {
        for (var i = 0; i < exceptions.length; i++) {
          this.handleEventSync(this.formatEvent(exceptions[i]));
        }
      }
    },

    /**
     * Account removal event handler. Aborts the rest of sync processing, if
     * the account deleted is the subject of the current sync.
     *
     * @param {String} database object id.
     */
    _onRemoveAccount: function(id) {
      if (id === this.account._id) {
        // This is our account, so abort the sync.
        this.abort();
      }
    },

    /**
     * Abort the sync. After this, further events will be ignored and commit()
     * will do nothing.
     */
    abort: function() {
      if (this._aborted) {
        // Bail, if already aborted.
        return;
      }
      // Flag that the sync should be aborted.
      this._aborted = true;
      if (this._trans) {
        // Attempt to abort the in-progress commit transaction
        this._trans.abort();
      }
    },

    handleEvent: function(event) {
      if (this._aborted) {
        // Ignore all events, if the sync has been aborted.
        return;
      }

      var data = event.data;

      switch (event.type) {
        case 'missingEvents':
          this.removeList = data[0];
          break;
        case 'occurrence':
          var occur = this.formatBusytime(data[0]);
          this.handleOccurrenceSync(occur);
          break;
        case 'component':
          this.handleComponentSync(data[0]);
          break;
        case 'event':
          var event = this.formatEvent(data[0]);
          this.handleEventSync(event);
          break;
      }
    },

    /**
     * Commit all pending records.
     *
     *
     * @param {IDBTransaction} [trans] optional transaction.
     * @param {Function} callback fired when transaction completes.
     */
    commit: function(trans, callback) {
      var eventStore = this.app.store('Event');
      var icalComponentStore = this.app.store('IcalComponent');
      var calendarStore = this.app.store('Calendar');
      var busytimeStore = this.app.store('Busytime');
      var alarmStore = this.app.store('Alarm');

      if (typeof(trans) === 'function') {
        callback = trans;
        trans = calendarStore.db.transaction(
          ['calendars', 'events', 'busytimes', 'alarms', 'icalComponents'],
          'readwrite'
        );
      }

      if (this._aborted) {
        // Commit nothing, if sync was aborted.
        return callback && callback(null);
      }

      var calendar = this.calendar;
      var account = this.account;

      // Stash a reference to the transaction, in case we still need to abort.
      this._trans = trans;

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

      function handleError(e) {
        if (e && e.type !== 'abort') {
          console.error('Error persisting sync results', e);
        }

        // if we have an event preventDefault so we don't trigger window.onerror
        if (e && e.preventDefault) {
          e.preventDefault();
        }

        self._trans = null;
        callback && callback(e);
      }

      trans.addEventListener('error', handleError);
      trans.addEventListener('abort', handleError);


      trans.addEventListener('complete', function() {
        self._trans = null;
        callback && callback(null);
      });

      return trans;
    }

  };

  return PullEvents;

}());
