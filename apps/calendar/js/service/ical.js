Calendar.ns('Service').Ical = (function() {

  var debug = Calendar.debug('ical service');

  /* TODO: ugly hack to enable system XHR fix upstream in Caldav lib */

  function Service(service) {
      Calendar.Responder.call(this);
      this.service = service;
      this.service.on('importFromUrl', this.importFromUrl.bind(this));
      this.service.on('importFromICS', this.importFromUrl.bind(this));
  };

  Service.prototype = {

    __proto__: Calendar.Responder.prototype,

    importFromUrl: function(account, url, stream, callback) {
      var xhr = new XMLHttpRequest({
            mozSystem: true
      });
      var self = this;
      xhr.open('GET', url, true);
      xhr.onload = function() {
        var ical = xhr.responseText;
        self.icalEventParser(ical, stream, url, callback);
      };
      xhr.send();
    },

    importFromICS: function(account, blob, stream, callback) {
      this.icalEventParser(blob, stream, '', callback);
    },

  /**
   * Handle an ical response blob.
   *
   * @param {Object} response ical response object.
   * @param {Calendar.Responder} responder event emitter.
   * @param {String} url location of event.
   * @param {Function} callback node style callback fired after event parsing.
   */
    icalEventParser: function(ical, stream, url, callback) {
      var self = this;
      self.parseEventIcal(ical, function(err, event) {

        if (err) {
          callback('error in parse event', null);
          return;
        }
        var sequence = event.sequence;
        var result = self._formatEvent(sequence, url, ical, event);
        stream.emit('event', result);

        var options = {
          maxDate: self._defaultMaxDate(),
          now: ICAL.Time.now()
        };

        self.expandRecurringEvent(event, options, stream,
                                  function(err, iter, lastRecurrenceId) {

          if (err)  {
            callback('error in recurring event expansion', null);
            return;
          }

          if (!event.isRecurring()) {
            stream.emit('component', {
              eventId: result.id,
              isRecurring: false,
              ical: ical
            });
          }
          else {
            stream.emit('component', {
              eventId: result.id,
              lastRecurrenceId: lastRecurrenceId,
              ical: ical,
              iterator: iter
            });
          }
        });
      });
      callback(null, 'ical parsed');
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
        var i = 0;
        var len = components.length;
        var component;

        for (; i < len; i++) {
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
        //this.oncomplete();
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
  for (var i in Calendar.Service.Mixins) {
    Service.prototype[i] = Calendar.Service.Mixins[i];
  }

  return Service;

}());
