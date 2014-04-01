Calendar.ns('Service').Mixins = {

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
  }
};
