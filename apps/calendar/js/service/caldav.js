Calendar.ns('Service').Caldav = (function() {

  var debug = Calendar.debug('caldav service');

  /* TODO: ugly hack to enable system XHR fix upstream in Caldav lib */
  var xhrOpts = {
    /** system is required for cross domain XHR  */
    mozSystem: true,
    /** mozAnon is required to avoid system level popups on 401 status */
    mozAnon: true,
    /** enables use of mozilla only streaming api's when available */
    useMozChunkedText: true
  };

  Caldav.Xhr.prototype.globalXhrOptions = xhrOpts;

  function Service(service) {
    Calendar.Responder.call(this);

    this.service = service;
    this._initEvents();
  };

  Service.prototype = {

    __proto__: Calendar.Responder.prototype,

    /**
     * See: http://tools.ietf.org/html/rfc5545#section-3.7.3
     */
    icalProductId: '-//Mozilla//FirefoxOS',

    /**
     * See: http://tools.ietf.org/html/rfc5545#section-3.7.4
     */
    icalVersion: '2.0',

    _initEvents: function() {
      var events = [
        'noop',
        'getAccount',
        'findCalendars',
        'getCalendar',
        'streamEvents',
        'expandComponents',
        'expandRecurringEvent',
        'deleteEvent',
        'updateEvent',
        'createEvent'
      ];

      events.forEach(function(e) {
        this.service.on(e, this);
      }, this);
    },

    handleEvent: function(e) {
      this[e.type].apply(this, e.data);
    },

    /**
     * Builds an Caldav connection from an account model object.
     */
    _createConnection: function(account) {
      var params = Calendar.extend({}, account);
      var preset = Calendar.Presets[account.preset];

      if (
          preset &&
          preset.authenticationType &&
          preset.apiCredentials
      ) {
        switch (preset.authenticationType) {
          case 'oauth2':
            params.httpHandler = 'oauth2';

            // shallow copy the apiCredentials on the preset
            params.apiCredentials =
              Calendar.extend({}, preset.apiCredentials);

            // the url in this case will always be tokenUrl
            params.apiCredentials.url =
              preset.apiCredentials.tokenUrl;

            break;
        }
      }

      var connection = new Caldav.Connection(params);
      return connection;
    },

    _requestHome: function(connection, url) {
      return new Caldav.Request.CalendarHome(
        connection,
        { url: url }
      );
    },

    _requestCalendars: function(connection, url) {
      var Finder = Caldav.Request.Resources;
      var Resource = Caldav.Resources.Calendar;

      var req = new Finder(connection, { url: url });

      req.addResource('calendar', Resource);
      req.prop(['ical', 'calendar-color']);
      req.prop(['caldav', 'calendar-description']);
      req.prop('current-user-privilege-set');
      req.prop('displayname');
      req.prop('resourcetype');
      req.prop(['calserver', 'getctag']);

      return req;
    },

    _requestEvents: function(connection, cal, options) {
      var Resource = Caldav.Resources.Calendar;
      var remoteCal = new Resource(connection, cal);
      var query = remoteCal.createQuery();

      query.prop('getetag');

      // only return VEVENT & VTIMEZONE
      var filterQuery = query.filter.setComp('VCALENDAR');
      var filterEvent = filterQuery.comp('VEVENT');

      if (options && options.startDate) {
        // convert startDate to unix ical time.
        var icalDate = new ICAL.Time();

        // ical uses seconds not milliseconds
        icalDate.fromUnixTime(options.startDate.valueOf() / 1000);
        filterEvent.setTimeRange({ start: icalDate.toICALString() });
      }

      // include only the VEVENT/VTIMEZONE in the data
      query.data.setComp('VCALENDAR');

      return query;
    },

    noop: function(callback) {
      callback({ ready: true });
    },

    getAccount: function(account, callback) {
      var url = account.entrypoint;
      var connection = this._createConnection(account);

      var request = this._requestHome(connection, url);
      return request.send(function(err, data) {
        if (err) {
          callback(err);
          return;
        }

        var result = {};

        if (data.url)
          result.calendarHome = data.url;

        if (connection.oauth)
          result.oauth = connection.oauth;

        if (connection.user)
          result.user = connection.user;

        callback(null, result);
      });
    },

    _formatCalendar: function(cal) {
      var result = Object.create(null);

      result.id = cal.url;
      result.url = cal.url;
      result.name = cal.name;
      result.color = cal.color;
      result.description = cal.description;
      result.syncToken = cal.ctag;
      result.privilegeSet = cal.privilegeSet;

      return result;
    },

    findCalendars: function(account, callback) {
      var self = this;
      var url = account.calendarHome;
      var connection = this._createConnection(account);

      var request = this._requestCalendars(
        connection,
        url
      );

      request.send(function(err, data) {
        if (err) {
          callback(err);
          return;
        }

        var calendars = data.calendar;
        var results = {};
        var key;
        var item;
        var resource;

        for (key in calendars) {
          if (calendars.hasOwnProperty(key)) {
            item = calendars[key];
            var formattedCal = self._formatCalendar(
              item
            );

            // If privilegeSet is not present we will assume full permissions.
            // Its highly unlikey that it is missing however.
            if (('privilegeSet' in formattedCal) &&
                (formattedCal.privilegeSet.indexOf('read') === -1)) {

              // skip calendars without read permissions
              continue;
            }

            results[key] = formattedCal;
          }
        }
        callback(null, results);
      });
    },

    /**
     * Formats an alarm trigger
     * Returns the relative time for that trigger
     *
     * @param {ICAL.Property} trigger property.
     * @param {ICAL.Date} start date.
     */
    _formatTrigger: function(trigger, startDate) {
      var alarmTrigger;
      if (trigger.type == 'duration') {
        alarmTrigger = trigger.getFirstValue().toSeconds();
      } else {
        // Type is date-time
        alarmTrigger = trigger
          .getFirstValue()
          .subtractDate(startDate)
          .toSeconds();
      }

      return alarmTrigger;
    },

    /**
     * Formats an already parsed ICAL.Event instance.
     * Expects event to already contain exceptions, etc..
     *
     * @param {String} etag etag.
     * @param {String} url caldav url.
     * @param {String} ical raw ical string.
     * @param {ICAL.Event} event ical event.
     */
    _formatEvent: function(etag, url, ical, event) {
      var self = this;
      var exceptions = null;
      var key;

      if (event.exceptions) {
        exceptions = [];
        for (key in event.exceptions) {
          exceptions.push(this._formatEvent(
            etag,
            url,
            ical,
            event.exceptions[key]
          ));
        }

        if (!exceptions.length) {
          exceptions = null;
        }
      }

      var rid = event.recurrenceId;

      if (rid) {
        rid = this.formatICALTime(rid);
      }

      var resultAlarms = [];
      var alarms = event.component.getAllSubcomponents('valarm');
      alarms.forEach(function(instance) {
        var action = instance.getFirstPropertyValue('action');
        if (action && action === 'DISPLAY') {
          var triggers = instance.getAllProperties('trigger');
          var i = 0;
          var len = triggers.length;

          for (; i < len; i++) {

            var trigger = triggers[i];

            resultAlarms.push({
              action: action,
              trigger: self._formatTrigger(trigger, event.startDate)
            });
          }
        }
      });

      var result = {
        alarms: resultAlarms,
        syncToken: etag,
        url: url,
        id: event.uid,
        title: event.summary,
        recurrenceId: rid,
        isRecurring: event.isRecurring(),
        description: event.description,
        location: event.location,
        start: this.formatICALTime(event.startDate),
        end: this.formatICALTime(event.endDate),
        exceptions: exceptions
      };

      return result;
    },

    /**
     * Find and parse the display alarms for an event.
     *
     * @param {Object} details details for specific instance.
     */
    _displayAlarms: function(details) {
      var event = details.item;
      var comp = event.component;
      var alarms = comp.getAllSubcomponents('valarm');
      var result = [];

      var start = details.startDate;
      var self = this;

      alarms.forEach(function(instance) {
        var action = instance.getFirstPropertyValue('action');
        if (action && action === 'DISPLAY') {
          // lets just assume we might have multiple triggers
          var triggers = instance.getAllProperties('trigger');
          var i = 0;
          var len = triggers.length;

          for (; i < len; i++) {
            result.push({
              action: action,
              trigger: self._formatTrigger(triggers[i], event.startDate)
            });
          }
        }
      });

      return result;
    },

    /**
     * Takes an ICAL.Time object and converts it
     * into the storage format familiar to the calendar app.
     *
     *    var time = new ICAL.Time({
     *      year: 2012,
     *      month: 1,
     *      day: 1,
     *      zone: 'PST'
     *    });
     *
     *    // time is converted to a MS
     *    // then its UTC offset is added
     *    // so the time is at UTC (offset 0) then the
     *    // offset is associated with that time.
     *
     *    var output = {
     *      utc: ms,
     *      offset: (+|-)ms,
     *      // zone can mostly be ignored except
     *      // in the case where the event is "floating"
     *      // in time and we need to convert the utc value
     *      // to the current local time.
     *      tzid: ''
     *    };
     */
    formatICALTime: function(time) {
      var zone = time.zone;
      var offset = time.utcOffset() * 1000;
      var utc = time.toUnixTime() * 1000;

      utc += offset;

      var result = {
        tzid: zone.tzid,
        // from seconds to ms
        offset: offset,
        // from seconds to ms
        utc: utc
      };

      if (time.isDate) {
        result.isDate = true;
      }

      return result;
    },

    /**
     * Formats a given time/date into a ICAL.Time instance.
     * Suitable for converting the output of formatICALTime back
     * into a similar representation of the original.
     *
     * Once a time instance goes through this method it should _not_
     * be modified as the DST information is lost (offset is preserved).
     *
     * @param {ICAL.Time|Object} time formatted ical time
     *                                    or output of formatICALTime.
     */
    formatInputTime: function(time) {
      if (time instanceof ICAL.Time)
        return time;

      var utc = time.utc;
      var tzid = time.tzid;
      var offset = time.offset;
      var result;

      if (tzid === ICAL.Timezone.localTimezone.tzid) {
        result = new ICAL.Time();
        result.fromUnixTime(utc / 1000);
        result.zone = ICAL.Timezone.localTimezone;
      } else {
        result = new ICAL.Time();
        result.fromUnixTime((utc - offset) / 1000);
        result.zone = ICAL.Timezone.utcTimezone;
      }

      if (time.isDate) {
        result.isDate = true;
      }

      return result;
    },

    /**
     * Parse an ical data/string into primary
     * event and exceptions.
     *
     * It is assumed there is only one primary event
     * (does not have a RECURRENCE-ID) in the ical content.
     *
     * @param {Object|String|ICAL.Event} ical vcalendar chunk (and exceptions).
     * @param {Function} callback node style callback [err, primary event].
     */
    parseEvent: function(ical, callback) {
      if (ical instanceof ICAL.Event) {
        callback(null, ical);
        return;
      }

      var parser = new ICAL.ComponentParser();
      var primaryEvent;
      var exceptions = [];

      parser.ontimezone = function(zone) {
        var id = zone.tzid;

        if (!ICAL.TimezoneService.has(id)) {
          ICAL.TimezoneService.register(id, zone);
        }
      };

      parser.onevent = function(item) {
        if (item.isRecurrenceException()) {
          exceptions.push(item);
        } else {
          primaryEvent = item;
        }
      };

      parser.oncomplete = function() {
        if (!primaryEvent) {
          //TODO: in the error handling pass we need to define
          //     path to log this information so we can determine
          //     the cause of failures.
          callback(new Error('ical parse error'));
          return;
        }
        exceptions.forEach(primaryEvent.relateException, primaryEvent);
        callback(null, primaryEvent);
      };

      //XXX: Right now ICAL.js is all sync so we
      //     can catch the errors this way in the future
      //     onerror will replace this.
      try {
        parser.process(ical);
      } catch (e) {
        callback(e);
      }
    },

    _defaultMaxDate: function() {
      var now = new Date();

      return new ICAL.Time({
        year: now.getFullYear(),
        // three months in advance
        // +1 because js months are zero based
        month: now.getMonth() + 6,
        day: now.getDate()
      });
    },

    /**
     * Expands a list recurring events by their component.
     *
     * It is expected for this function to receive an array
     * of items each structured as a icalComponent.
     *
     *    [
     *      { ical: '...', lastRecurrenceId: '..', iterator: '...' },
     *      ...
     *    ]
     *
     * @param {Array[icalComponent]} components list of icalComponents.
     * @param {Calendar.Responder} stream to emit events.
     * @param {Object} options list of options.
     * @param {Object} options.maxDate maximum date to expand to.
     * @param {Function} callback only sends an error if fatal.
     */
    expandComponents: function(components, options, stream, callback) {
      var pending = components.length;

      function next() {
        if (!(--pending)) {
          callback();
        }
      }


      components.forEach(function(component) {
        var ical = component.ical;
        var localOpts = {
          maxDate: options.maxDate,
          iterator: component.iterator
        };

        if (component.lastRecurrenceId) {
          localOpts.minDate = component.lastRecurrenceId;
        }

        // expand each component
        this.expandRecurringEvent(ical, localOpts, stream,
                                  function(err, iter, lastRecurId, uid) {

          if (err) {
            stream.emit('error', err);
            next();
            return;
          }

          stream.emit('component', {
            eventId: uid,
            lastRecurrenceId: lastRecurId,
            ical: ical,
            iterator: iter
          });

          next();
        });
      }, this);
    },

    /**
     * Options:
     *
     *  - iterator: (ICAL.RecurExpander) optional recurrence expander
     *              used to resume the iterator state for existing events.
     *
     *  - maxDate: if instance ends after this date stop expansion.
     *
     *
     * Returns:
     *
     *    [
     *      {
     *        start: { offset: inMS, utc: ms },
     *        endDate: // same format as start,
     *        recurrenceId: // id of specific recurrence.
     *        uid: // uid of event
     *        isException: // true when is exception to usual rule.
     *      },
     *      //...
     *    ]
     */
    expandRecurringEvent: function(component, options, stream, callback) {
      var self = this;
      var startDate = options.startDate;

      var maxDate;
      var minDate = null;
      var now;

      if (options.minDate)
        minDate = this.formatInputTime(options.minDate);

      if (options.maxDate)
        maxDate = this.formatInputTime(options.maxDate);

      if (!('now' in options))
        options.now = ICAL.Time.now();

      now = options.now;

      // convert to rich ical event
      this.parseEvent(component, function(err, event) {
        if (err) {
          callback(err);
          return;
        }

        var iter = Calendar.Service.IcalRecurExpansion.forEach(
          event,
          options.iterator,
          occuranceHandler,
          minDate,
          maxDate
        );

        function occuranceHandler(next) {
          var details = event.getOccurrenceDetails(next);
          var lastStart = details.startDate;
          var inFuture = details.endDate.compare(now);

          if (Calendar.DEBUG) {
            debug('alarm time',
                  event.summary,
                  'will add ' + String(inFuture),
                  'start:', details.startDate.toJSDate().toString(),
                  'end:', details.endDate.toJSDate().toString(),
                  'now:', now.toJSDate().toString());
          }

          var occurrence = {
            start: self.formatICALTime(details.startDate),
            end: self.formatICALTime(details.endDate),
            recurrenceId: self.formatICALTime(next),
            eventId: details.item.uid,
            isException: details.item.isRecurrenceException()
          };

          // only set alarms for those dates in the future...
          if (inFuture >= 0) {
            var alarms = self._displayAlarms(details);
            if (alarms) {
              occurrence.alarms = alarms;
            }
          }

          stream.emit('occurrence', occurrence);
        }

        var lastRecurrence;

        if (iter.complete) {
          // when the iterator is complete
          // last recurrence is false.
          // We use this to signify the end
          // of the iteration cycle.
          lastRecurrence = false;
        } else {
          // its very important all times used
          // for comparison are based on the recurrence id
          // and not the start date as those can change
          // with exceptions...
          lastRecurrence = self.formatICALTime(
            iter.last
          );
        }

        callback(
          null,
          iter.toJSON(),
          lastRecurrence,
          event.uid
        );
      });
    },

    /**
     * Handle a single caldav event response.
     *
     * @param {String} url location of event.
     * @param {Object} response caldav response object.
     * @param {Calendar.Responder} responder event emitter.
     * @param {Function} callback node style callback fired after event parsing.
     */
    _handleCaldavEvent: function(url, response, stream, callback) {
      var self = this;
      var etag = response['getetag'];
      var event = response['calendar-data'];

      if (event.status != 200) {
        callback(new Error('non 200 status code "' + url + '"'));
        return;
      }

      // process event
      var ical = event.value;
      this.parseEvent(ical, function(err, event) {

        if (err) {
          callback(err);
          return;
        }

        var result = self._formatEvent(etag.value, url, ical, event);
        stream.emit('event', result);

        var options = {
          maxDate: self._defaultMaxDate(),
          now: ICAL.Time.now()
        };

        self.expandRecurringEvent(event, options, stream,
                                  function(err, iter, lastRecurrenceId) {

          if (err) {
            callback(err);
            return;
          }

          if (!event.isRecurring()) {
            stream.emit('component', {
              eventId: result.id,
              isRecurring: false,
              ical: ical
            });
          } else {
            stream.emit('component', {
              eventId: result.id,
              lastRecurrenceId: lastRecurrenceId,
              ical: ical,
              iterator: iter
            });
          }

          callback(null);
        });
      });
    },

    streamEvents: function(account, calendar, options, stream, callback) {
      var self = this;
      var hasCompleted = false;
      var connection = this._createConnection(account);

      var cache = options.cached;

      // we don't need to pass this around anywhere.
      //delete options.cache;

      var request = this._requestEvents(connection, calendar, options);
      var pending = 0;

      function next(err) {
        if (err) {
          try {
            stream.emit('error', err);
          } catch (e) {
            console.log('failed to transport err:', err.toString(), err.stack);
          }
        }

        if (!(--pending) && hasCompleted) {
          callback(null);
        }
      }

      function handleResponse(url, data) {
        if (!data || !data['calendar-data']) {
          // throw some error;
          console.log('Could not sync: ', url);
          return;
        }
        var etag = data.getetag.value;
        if (url in cache) {
          // don't need to track this for missing events.
          if (etag !== cache[url].syncToken) {
            pending++;
            self._handleCaldavEvent(url, data, stream, next);
          }

          delete cache[url];
        } else {
          pending++;
          self._handleCaldavEvent(url, data, stream, next);
        }
      }

      request.sax.on('DAV:/response', handleResponse);

      request.send(function(err) {
        hasCompleted = true;
        // when the request is completed stop listening
        // for sax events.
        request.sax.removeEventListener(
          'DAV:/response', handleResponse
        );

        if (err) {
          callback(err);
          return;
        }

        if (!pending) {
          var missing = [];

          for (var url in cache) {
            missing.push(cache[url].id);
          }

          // send missing events
          stream.emit('missingEvents', missing);

          // notify the requester that we have completed.
          callback();
        }
      });
    },

    _assetRequest: function(connection, url) {
      return new Caldav.Request.Asset(connection, url);
    },

    deleteEvent: function(account, calendar, event, callback) {
      var connection = this._createConnection(account);

      var req = this._assetRequest(connection, event.url);

      req.delete({}, function(err, data, xhr) {
        callback(err);
      });
    },

    addAlarms: function(component, alarms, account) {
      alarms = alarms || [];

      for (var i = 0, alarm; alarm = alarms[i]; i++) {

        var valarm = new ICAL.Component('valarm');

        // valarm details
        valarm.addPropertyWithValue('action', alarm.action);
        valarm.addPropertyWithValue('description', 'This is an event reminder');
        var trigger = valarm.addPropertyWithValue('trigger',
          ICAL.Duration.fromSeconds(
            alarm.trigger
          )
        );
        trigger.setParameter('relative', 'START');
        component.addSubcomponent(valarm);

        // Check if we need to mirror the VALARM onto email
        if (this.mirrorAlarms(account)) {
          var valarm = new ICAL.Component('valarm');
          valarm.addPropertyWithValue('action', 'EMAIL');
          valarm.addPropertyWithValue('description',
            'This is an event reminder');
          valarm.addPropertyWithValue('ATTENDEE', account.user);
          var trigger = valarm.addPropertyWithValue('trigger',
            ICAL.Duration.fromSeconds(
              alarm.trigger
            )
          );
          trigger.setParameter('relative', 'START');
          component.addSubcomponent(valarm);
        }
      }
    },

    /**
     * Update absolute alarm times when the startDate changes.
     *
     * @param {ICAL.Time} originalDate of the event.
     * @param {ICAL.Event} event to update.
     */
    adjustAbsoluteAlarms: function(originalDate, event) {
      var newDate = event.startDate;
      var alarms = event.component.getAllSubcomponents('valarm');

      alarms.forEach(function(alarm) {
        var trigger = alarm.getFirstProperty('trigger');
        var value = trigger.getValues()[0].clone();

        // absolute time
        if (value instanceof ICAL.Time) {
          // find absolute time difference
          var diff = value.subtractDateTz(originalDate);
          trigger.setValue(diff);
        }
      });
    },

    /**
     * Yahoo needs us to mirror all alarms as EMAIL alarms
     */
    mirrorAlarms: function(account) {
      return account && account.domain === 'https://caldav.calendar.yahoo.com';
    },

    createEvent: function(account, calendar, event, callback) {
      var connection = this._createConnection(account);
      var vcalendar = new ICAL.Component('vcalendar');
      var icalEvent = new ICAL.Event();

      // vcalendar details
      vcalendar.addPropertyWithValue('prodid', this.icalProductId);
      vcalendar.addPropertyWithValue('version', this.icalVersion);

      // text fields
      icalEvent.uid = uuid();
      icalEvent.summary = event.title;
      icalEvent.description = event.description;
      icalEvent.location = event.location;
      icalEvent.sequence = 1;

      // time fields
      icalEvent.startDate = this.formatInputTime(event.start);
      icalEvent.endDate = this.formatInputTime(event.end);

      // alarms
      this.addAlarms(icalEvent.component, event.alarms, account);

      vcalendar.addSubcomponent(icalEvent.component);

      var url = calendar.url + icalEvent.uid + '.ics';
      var req = this._assetRequest(connection, url);

      event.id = icalEvent.uid;
      event.url = url;
      event.icalComponent = vcalendar.toString();

      req.put({}, event.icalComponent, function(err, data, xhr) {
        if (err) {
          callback(err);
          return;
        }

        var token = xhr.getResponseHeader('Etag');
        event.syncToken = token;
        // TODO: error handling
        callback(err, event);
      });

    },

    /**
     * Updates a single caldav event.
     * Will handle updating both primary events and exceptions.
     *
     * @param {Object} account full account details.
     * @param {Object} calendar full calendar details.
     * @param {Object} eventDetails details to update the event.
     *  unmodified parsed ical component. (VCALENDAR).
     */
    updateEvent: function(account, calendar, eventDetails, callback) {
      var connection = this._createConnection(account);

      var icalComponent = eventDetails.icalComponent;
      var event = eventDetails.event;

      var self = this;
      var req = this._assetRequest(connection, event.url);
      var etag = event.syncToken;

      // parse event
      this.parseEvent(icalComponent, function(err, icalEvent) {
        if (err) {
          callback(err);
          return;
        }

        var target = icalEvent;
        var vcalendar = icalEvent.component.parent;
        var originalStartDate = target.startDate;

        // find correct event
        if (event.recurrenceId) {
          var rid = self.formatInputTime(event.recurrenceId);
          rid = rid.toString();
          if (icalEvent.exceptions[rid]) {
            target = icalEvent.exceptions[rid];
          }
        }

        // vcalendar pieces
        vcalendar.updatePropertyWithValue('prodid', self.icalProductId);

        // text fields
        target.summary = event.title;
        target.description = event.description;
        target.location = event.location;

        if (!target.sequence) {
          target.sequence = 0;
        }

        target.sequence = parseInt(target.sequence, 10) + 1;

        // time fields
        target.startDate = self.formatInputTime(
          event.start
        );

        target.endDate = self.formatInputTime(
          event.end
        );

        // adjust absolute alarm time ( we do this before adding/changing our
        // new alarm times )
        self.adjustAbsoluteAlarms(originalStartDate, target);

        // We generally want to remove all 'DISPLAY' alarms
        // UNLESS we are dealing with a YAHOO account
        // Then we overwrite all alarms
        var alarms = target.component.getAllSubcomponents('valarm');
        alarms.forEach(function(alarm) {
          var action = alarm.getFirstPropertyValue('action');
          if (action === 'DISPLAY' || self.mirrorAlarms(account)) {
            target.component.removeSubcomponent(alarm);
          }
        });
        self.addAlarms(target.component, event.alarms, account);

        var vcal = target.component.parent.toString();
        event.icalComponent = vcal;

        req.put({}, vcal, function(err, data, xhr) {
          if (err) {
            callback(err);
            return;
          }

          var token = xhr.getResponseHeader('Etag');
          event.syncToken = token;
          // TODO: error handling
          callback(err, event);
        });
      });
    }

  };

  return Service;

}());
