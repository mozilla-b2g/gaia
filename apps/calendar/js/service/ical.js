Calendar.ns('Service').Ical = (function() {

  var debug = Calendar.debug('ical service');

  function Service(service) {
    Calendar.Responder.call(this);
    this.service = service;
    this.service.on('importCalendar', this.importCalendar.bind(this));
  };

  Service.prototype = {

    __proto__: Calendar.Responder.prototype,

    /**
     * @param {Object} url location of the calendar.
     * @param {Calendar.Responder} stream responder event emitter.
     * @param {Function} callback node style callback fired after event parsing.
     */
    importCalendar: function(url, stream, callback) {
      if (url.length === 0) {
        callback(new Error('url is empty'));
        return;
      }
      var self = this;
      var xhr = new XMLHttpRequest({
        mozSystem: true
      });
      // this is the case that we have a file blob.
      xhr.onerror = function() {
        self.icalEventParser(url, stream, url, callback);
      };
      xhr.open('GET', url, true);
      xhr.onload = function() {
        var ical = xhr.responseText;
        self.icalEventParser(ical, stream, url, callback);
      };
      xhr.send();
    },

    /**
     * Handle an ical response blob.
     *
     * @param {Object} ical response ical response object.
     * @param {Calendar.Responder} stream responder event emitter.
     * @param {String} url location of event.
     * @param {Function} callback node style callback fired after event parsing.
     */
    icalEventParser: function(ical, stream, url, callback) {
      if (ical.length === 0) {
        callback(new Error('ical is empty'));
        return;
      }
      this.parseEventIcal(ical, function(err, event) {

        if (err) {
          callback(err);
          return;
        }
        var sequence = event.sequence;
        var result = this._formatEvent(sequence, url, ical, event);
        stream.emit('event', result);

        // options are the default as in the mixins
        var options = {
          maxDate: this._defaultMaxDate(),
          now: ICAL.Time.now()
        };

        this.expandRecurringEvent(event, options, stream,
                                  function(err, iter, lastRecurrenceId) {

          if (err) {
            callback(new Error('error in recurring event expansion'));
            return;
          }

          if (event.isRecurring()) {
            stream.emit('component', {
              eventId: result.id,
              lastRecurrenceId: lastRecurrenceId,
              ical: ical,
              iterator: iter
            });
          } else {
            stream.emit('component', {
              eventId: result.id,
              isRecurring: false,
              ical: ical
            });
          }

          stream.emit('eventComplete', {
            eventId: result.id
          });

        }.bind(this));
      }.bind(this));
      // callback is called to signal Calendar Pull Events to begin commit.
      callback(null);
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
    parseEventIcal: function(ical, callback) {
      if (ical instanceof ICAL.Event) {
        callback(null, ical);
        return;
      }

      var parser = new ICAL.ComponentParser();
      var primaryEvent;
      var exceptions = [];

      parser.onicaltimezone = function(zone) {
        var id = zone.tzid;

        if (!ICAL.TimezoneService.has(id)) {
          ICAL.TimezoneService.register(id, zone);
        }
      };

      /**
       * Process a string or parse ical object.
       * This function itself will return nothing but
       * will start the parsing process.
       *
       * Events must be registered prior to calling this method.
       *
       * @param {String|Object} ical string or parsed ical object.
       * @param {Function} callback node style callback [err, primary event].
       */
      parser.processicalcomponents = function(ical, callback) {
        //TODO: this is sync now in the future we
        // will have a incremental parser.
        if (typeof(ical) === 'string') {
          ical = ICAL.parse(ical)[1];
        }

        if (!(ical instanceof ICAL.Component)) {
          ical = new ICAL.Component(ical);
        }

        var components = ical.getAllSubcomponents();
        var len = components.length;
        var component;

        for (var i = 0; i < len; i++) {
          component = components[i];

          switch (component.name) {
            case 'vtimezone':
              if (this.parseTimezone) {
                var tzid = component.getFirstPropertyValue('tzid');
                if (tzid) {
                  this.onicaltimezone(new ICAL.Timezone({
                    tzid: tzid,
                    component: component
                  }));
                }
              }
              break;
            case 'vevent':
              var event = new ICAL.Event(component);
              callback(null, event);
              break;
            default:
              continue;
          }
        }
        //XXX: ideally we should do a "nextTick" here
        //     so in all cases this is actually async.
      };
      //XXX: Right now ICAL.js is all sync so we
      //     can catch the errors this way in the future
      //     onerror will replace this.
      try {
        parser.processicalcomponents(ical, callback);
      } catch (e) {
        callback(e, null);
        return;
      }
    }
  };

  // Add mixin functions
  for (var key in Calendar.Service.Mixins) {
    Service.prototype[key] = Calendar.Service.Mixins[key];
  }

  return Service;

}());
