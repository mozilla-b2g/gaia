Calendar.ns('Service').Caldav = (function() {

  var debug = Calendar.debug('caldav service');

  /* TODO: ugly hack to enable system XHR fix upstream in Caldav lib */
  var xhrOpts = {
    mozSystem: true,
    mozAnon: true
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
     * Default number of occurrences to find
     * when expanding a recurring event.
     */
    _defaultOccurrenceLimit: 1000,

    _initEvents: function() {
      var events = [
        'noop',
        'getAccount',
        'findCalendars',
        'getCalendar',
        'streamEvents',
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

      // only return VEVENT
      var filterEvent = query.filter.setComp('VCALENDAR').
                                     comp('VEVENT');

      if (options && options.startDate) {
        // convert startDate to unix ical time.
        var icalDate = new ICAL.icaltime();

        // ical uses seconds not milliseconds
        icalDate.fromUnixTime(options.startDate.valueOf() / 1000);
        filterEvent.setTimeRange({ start: icalDate.toString() });
      }

      // include only the VEVENT in the data
      query.data.setComp('VCALENDAR').comp('VEVENT');
      return query;
    },

    noop: function(callback) {
      callback({ ready: true });
    },

    getAccount: function(account, callback) {
      var url = account.url;
      var connection = new Caldav.Connection(account);

      var request = this._requestHome(connection, url);
      return request.send(function() {
        callback.apply(this, arguments);
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

      return result;
    },

    findCalendars: function(account, callback) {
      var self = this;
      var url = account.url;
      var connection = new Caldav.Connection(
        account
      );

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
            results[key] = self._formatCalendar(
              item
            );
          }
        }
        callback(null, results);
      });
    },

    /**
     * Formats an already parsed ICAL.Event instance.
     * Expects event to already contain exceptions, etc..
     *
     * @param {String} etag etag.
     * @param {String} url caldav url.
     * @param {ICAL.Event} event ical event.
     * @param {Object} [component] parsed VCALENDAR component.
     */
    _formatEvent: function(etag, url, event, component) {
      var exceptions = null;
      var key;

      if (typeof(component) === 'undefined') {
        component = event.component.parent.toJSON();
      }

      if (event.exceptions) {
        exceptions = [];
        for (key in event.exceptions) {
          exceptions.push(this._formatEvent(
            etag,
            url,
            event.exceptions[key],
            component
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

      var result = {
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
        exceptions: exceptions,
        icalComponent: component
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
      var alarms = comp.getAllSubcomponents('VALARM');
      var result = [];

      var start = details.startDate;
      var self = this;

      alarms.forEach(function(instance) {
        var action = instance.getFirstPropertyValue('ACTION');
        if (action) {
          action = action.data.value[0];
          if (action === 'DISPLAY') {
            // lets just assume we might have multiple triggers
            var triggers = instance.getAllProperties('TRIGGER');
            var i = 0;
            var len = triggers.length;

            for (; i < len; i++) {
              var time = start.clone();
              time.addDuration(triggers[i].data.value[0]);

              result.push({
                startDate: self.formatICALTime(time)
              });
            }
          }
        }
      });

      return result;
    },

    /**
     * Takes an ICAL.icaltime object and converts it
     * into the storage format familiar to the calendar app.
     *
     *    var time = new ICAL.icaltime({
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
     *
     */
    formatICALTime: function(time) {
      var zone = time.zone;
      var offset = zone.utc_offset() * 1000;
      var utc = time.toUnixTime() * 1000;

      utc += offset;

      return {
        tzid: zone.tzid,
        // from seconds to ms
        offset: offset,
        // from seconds to ms
        utc: utc
      };
    },

    /**
     * Formats a given time/date into a ICAL.icaltime instance.
     * Suitable for converting the output of formatICALTime back
     * into a similar representation of the original.
     *
     * Once a time instance goes through this method it should _not_
     * be modified as the DST information is lost (offset is preserved).
     *
     * @param {ICAL.icaltime|Object} time formatted ical time
     *                                    or output of formatICALTime.
     */
    formatInputTime: function(time) {
      if (time instanceof ICAL.icaltime)
        return time;

      var utc = time.utc;
      var tzid = time.tzid;
      var offset = time.offset;
      var result;

      if (tzid === ICAL.icaltimezone.local_timezone.tzid) {
        result = new ICAL.icaltime();
        result.fromUnixTime(utc / 1000);
        result.zone = ICAL.icaltimezone.local_timezone;
      } else {
        result = new ICAL.icaltime();
        result.fromUnixTime((utc - offset) / 1000);
        result.zone = ICAL.icaltimezone.utc_timezone;
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

      parser.onevent = function(item) {
        if (item.isRecurrenceException()) {
          exceptions.push(item);
        } else {
          primaryEvent = item;
        }
      }

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
      }

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

      return new ICAL.icaltime({
        year: now.getFullYear(),
        // three months in advance
        // +1 because js months are zero based
        month: now.getMonth() + 12,
        day: now.getDate()
      });
    },

    /**
     * Options:
     *
     *  - iterator: (ICAL.RecurExpander) optional recurrence expander
     *              used to resume the iterator state for existing events.
     *
     *  - limit: maximum number to expand to
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
      var limit = options.limit || Infinity;

      var maxDate;
      var now;

      if (options.maxDate)
        maxDate = this.formatInputTime(options.maxDate);

      if (!('now' in options))
        options.now = ICAL.icaltime.now();

      now = options.now;

      // convert to rich ical event
      this.parseEvent(component, function(err, event) {
        if (err) {
          callback(err);
          return;
        }

        if (!startDate) {
          // default time needs to processing...
          startDate = event.startDate;
        } else {
          // when we have gotten a start date
          // from a different thread we may need
          // to process it.
          startDate = self.formatInputTime(startDate);
        }

        var iter;

        if (options.iterator) {
          iter = new ICAL.RecurExpansion(options.iterator);
        } else {
          iter = event.iterator(startDate);
        }

        var sent = 0;
        var lastStart;

        function isDone() {
          if (sent >= limit) {
            return true;
          }

          if (lastStart && maxDate && lastStart.compare(maxDate) >= 0) {
            return true;
          }

          return false;
        }

        var next;
        var details;
        var occurrence;
        var last;

        while (!isDone()) {
          next = iter.next();

          if (!next) {
            stream.emit('occurrences end');
            break;
          }


          details = event.getOccurrenceDetails(next);
          lastStart = details.startDate;


          var inFuture = details.endDate.compare(now);

          if (Calendar.DEBUG) {
            debug('alarm time',
                  event.summary,
                  'will add ' + String(inFuture),
                  'start:', details.startDate.toJSDate().toString(),
                  'end:', details.endDate.toJSDate().toString(),
                  'now:', now.toJSDate().toString());
          }

          occurrence = {
            start: self.formatICALTime(details.startDate),
            end: self.formatICALTime(details.endDate),
            recurrenceId: self.formatICALTime(details.recurrenceId),
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

          last = next;
          stream.emit('occurrence', occurrence);
          sent++;
        }

        callback(null, iter.toJSON());
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

        var result = self._formatEvent(etag.value, url, event);
        stream.emit('event', result);

        var options = {
          limit: self._defaultOccurrenceLimit,
          maxDate: self._defaultMaxDate(),
          now: ICAL.icaltime.now()
        };

        self.expandRecurringEvent(event, options, stream,
                                  function(err, iter) {

          if (err) {
            callback(err);
            return;
          }

          if (!iter.complete) {
            stream.emit('recurring iterator', {
              id: event.uid, iterator: iter
            });
          }

          callback(null);
        });
      });
    },

    streamEvents: function(account, calendar, options, stream, callback) {
      var self = this;
      var hasCompleted = false;
      var connection = new Caldav.Connection(
        account
      );

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

        if (!pending) {
          var missing = [];

          for (var url in cache) {
            missing.push(cache[url].id);
          }

          // send missing events
          stream.emit('missing events', missing);

          // notify the requester that we have completed.
          callback(err);
        }
      });
    },

    _assetRequest: function(connection, url) {
      return new Caldav.Request.Asset(connection, url);
    },

    deleteEvent: function(account, calendar, event, callback) {
      var connection = new Caldav.Connection(
        account
      );

      var req = this._assetRequest(connection, event.url);

      req.delete({ etag: event.syncToken }, function(err, data, xhr) {
        callback(err);
      });
    },

    createEvent: function(account, calendar, event, callback) {
      var connection = new Caldav.Connection(account);
      var vcalendar = new ICAL.icalcomponent({ name: 'VCALENDAR' });
      var icalEvent = new ICAL.Event();

      // text fields
      icalEvent.uid = uuid();
      icalEvent.summary = event.title;
      icalEvent.description = event.description;
      icalEvent.location = event.location;
      icalEvent.sequence = 1;

      // time fields
      icalEvent.startDate = this.formatInputTime(event.start);
      icalEvent.endDate = this.formatInputTime(event.end);

      vcalendar.addSubcomponent(icalEvent.component);
      event.icalComponent = vcalendar.toString();

      var url = calendar.url + icalEvent.uid + '.ics';
      var req = this._assetRequest(connection, url);

      event.id = icalEvent.uid;
      event.url = url;
      event.icalComponent = vcalendar.toJSON();

      req.put({}, vcalendar.toString(), function(err, data, xhr) {
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
     * @param {Object} eventDetails.event modified remote event details.
     * @param {Object} eventDetails.icalComponent
     *  unmodified parsed ical component. (VCALENDAR).
     */
    updateEvent: function(account, calendar, eventDetails, callback) {
      var connection = new Caldav.Connection(
        account
      );

      var icalComponent = eventDetails.icalComponent;
      var event = eventDetails.event;

      var self = this;
      var req = this._assetRequest(connection, event.url);
      var etag = event.syncToken;

      // parse event
      this.parseEvent(icalComponent, function(err, icalEvent) {
        var target = icalEvent;

        // find correct event
        if (event.recurrenceId) {
          var rid = self.formatInputTime(event.recurrenceId);
          rid = rid.toString();
          if (icalEvent.exceptions[rid]) {
            target = icalEvent.exceptions[rid];
          }
        }

        // text fields
        target.summary = event.title;
        target.description = event.description;
        target.location = event.location;
        target.sequence = parseInt(target.sequence, 10) + 1;

        // time fields
        target.startDate = self.formatInputTime(event.start);
        target.endDate = self.formatInputTime(event.end);

        var vcal = target.component.parent.toString();
        event.icalComponent = target.component.parent.toJSON();

        req.put({ etag: etag }, vcal, function(err, data, xhr) {
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
