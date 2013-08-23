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

    Calendar.Responder.call(this);

    this.stream = stream;
    stream.on('end', this);
    stream.on('eventComplete', this);
    stream.on('event', this);
    stream.on('component', this);
    stream.on('occurrence', this);
    stream.on('missingEvents', this);

    this.eventStore = this.app.store('Event');
    this.icalComponentStore = this.app.store('IcalComponent');
    this.calendarStore = this.app.store('Calendar');
    this.busytimeStore = this.app.store('Busytime');
    this.alarmStore = this.app.store('Alarm');

    this._busytimeStore = this.app.store('Busytime');
    this.groups = {};

    // Catch account events to watch for mid-sync removal
    this._accountStore = this.app.store('Account');
    this._accountStore.on('remove', this._onRemoveAccount.bind(this));

    this._aborted = false;

    this.addEventListener('complete', function() {});
  }

  function EventGroup(id) {
    this.id = id;
    this.events = [];
    this.components = [];
    this.occurrences = [];
    this.alarms = [];
  }

  PullEvents.prototype = {

    __proto__: Calendar.Responder.prototype,

    // object that stores eventGroups
    groups: null,

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

            if (!this.groups[alarm.eventId]) {
              this.groups[alarm.eventId] = new EventGroup(alarm.eventId);
            }
            this.groups[alarm.eventId].alarms.push(alarm);
          }
        }
      }

      this.app.timeController.cacheBusytime(item);

      if (!this.groups[item.eventId]) {
        this.groups[item.eventId] = new EventGroup(item.eventId);
      }
      this.groups[item.eventId].occurrences.push(item);
    },

    handleComponentSync: function(component) {
      component.eventId = this.eventIdFromRemote(component);
      component.calendarId = this.calendar._id;

      if (!component.lastRecurrenceId) {
        delete component.lastRecurrenceId;
      }

      if (!this.groups[component.eventId]) {
        this.groups[component.eventId] = new EventGroup(component.eventId);
      }
      this.groups[component.eventId].components.push(component);
    },

    handleEventSync: function(event) {
      var self = this;
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

      if (!this.groups[event._id]) {
        this.groups[event._id] = new EventGroup(event._id);
      }
      this.groups[event._id].events.push(event);

      var component = event.remote.icalComponent;
      delete event.remote.icalComponent;

      // don't save components for exceptions.
      // the parent has the ical data.
      if (!event.remote.recurrenceId) {

        this.groups[event._id].components.push({
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
      this.abortTransactions();
    },

    handleEvent: function(event) {
      if (this._aborted) {
        // Ignore all events, if the sync has been aborted.
        return;
      }

      var data = event.data;
      var self = this;
      if (event.type === 'missingEvents') {
        this.removeList = data[0];
      } else if (event.type === 'occurrence') {
        var occur = this.formatBusytime(data[0]);
        this.handleOccurrenceSync(occur);
      } else if (event.type === 'component') {
        this.handleComponentSync(data[0]);
      } else if (event.type === 'event') {
        var event = self.formatEvent(data[0]);
        self.handleEventSync(event);
      } else if (event.type === 'eventComplete') {
        self._commitGroup(self.eventIdFromRemote(data[0]));
      } else if (event.type === 'end') {
        var groupsArray = Object.keys(self.groups);
        if (groupsArray.length !== 0) {
          var lastEventGroupKey = groupsArray[groupsArray.length - 1];
          if (!self.groups[lastEventGroupKey].trans) {
            self.groups[lastEventGroupKey].trans =
              self.calendarStore.db.transaction(
                ['calendars',
                'events',
                'busytimes',
                'alarms',
                'icalComponents'],
                'readwrite'
              );
          }
          self.groups[lastEventGroupKey].trans.addEventListener('complete',
            self.emit.bind(self, 'complete')
          );
        } else {
          self.emit('complete');
        }
      }
    },

    /**
     *  Aborts remaining transactions.
     */
    abortTransactions: function() {
      var self = this;
      for (var eventId in self.groups) {
        var eventGroup = self.groups[eventId];
        eventGroup.trans.abort();
      }
    },

    /**
     * Commit eventGroups remaining in the event Group Collection
     * to the database.
     *
     * @param {Object} eventGroup, eventGroup that needs to
     * be committed to the database.
     *
     * @return {Object} trans, transaction to store to this.calendar.
     */
    _commitGroup: function(id) {

      if (this._aborted) {
        return this.abortTransactions();
      }

      if (!this.groups[id].trans) {
        this.groups[id].trans = this.calendarStore.db.transaction(
          ['calendars', 'events', 'busytimes', 'alarms', 'icalComponents'],
          'readwrite'
        );
      }

      var self = this;

      self.groups[id].events.forEach(function(event) {
        debug('add event', event);
        self.eventStore.persist(event, self.groups[id].trans);
      });

      self.groups[id].components.forEach(function(ical) {
        debug('add component', ical);
        self.icalComponentStore.persist(ical, self.groups[id].trans);
      });

      self.groups[id].occurrences.forEach(function(busy) {
        debug('add busytime', busy);
        self.busytimeStore.persist(busy, self.groups[id].trans);
      });

      self.groups[id].alarms.forEach(function(alarm) {
        debug('add alarm', alarm);
        self.alarmStore.persist(alarm, self.groups[id].trans);
      });

      if (this.removeList) {
        this.removeList.forEach(function(removeId) {
          self.eventStore.remove(removeId, self.groups[id].trans);
        });
      }

      function handleError(e) {
        if (e && e.type !== 'abort') {
          console.error('Error persisting sync results', e);
        }

        // if we have an event preventDefault so we don't trigger
        // window.onerror.
        if (e && e.preventDefault) {
          e.preventDefault();
        }
      }

      self.groups[id].trans.addEventListener('error', handleError);
      self.groups[id].trans.addEventListener('abort', handleError);
      self.groups[id].trans.addEventListener('complete', function() {
        delete self.groups[id];
      });

      return self.groups[id].trans;
    }

  };

  return PullEvents;

}());
