Calendar.ns('Service').Caldav = (function() {


  /* TODO: ugly hack to enable system XHR fix upstream in Caldav lib */
  var xhrOpts = {
    mozSystem: true
  };

  Caldav.Xhr.prototype.globalXhrOptions = xhrOpts;

  function Service(service) {
    Calendar.Responder.call(this);

    this.service = service;
    this._initEvents();
  };

  Service.prototype = {

    __proto__: Calendar.Responder.prototype,

    _initEvents: function() {
      var events = [
        'noop',
        'getAccount',
        'findCalendars',
        'getCalendar',
        'getEvents',
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

    _requestEvents: function(connection, cal) {
      var Resource = Caldav.Resources.Calendar;
      var remoteCal = new Resource(connection, cal);
      var query = remoteCal.createQuery();

      query.prop('getetag');

      // include only the VEVENT
      query.filters.add('VEVENT', true);
      query.fields.select('VCALENDAR', [{'VEVENT': true}]);

      return query;
    },

    noop: function(callback) {
      callback({ ready: true });
    },

    getAccount: function(account, callback) {
      var url = account.url;
      var connection = new Caldav.Connection(account);

      var request = this._requestHome(connection, url);
      return request.send(callback);
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

    _remoteString: function(vevent, prop) {
      if (vevent.hasProperty(prop)) {
        return vevent.getFirstPropertyValue(prop).toString();
      }

      return '';
    },

    _remoteDate: function(vevent, prop) {

      if (vevent.hasProperty(prop)) {
        var data = vevent.getFirstProperty(prop).data;
        return data.value[0].toJSDate();
      }

      return null;
    },

    _formatEvent: function(rawData) {
      var event;
      // TODO: We do a round trip through ICAL.js
      // right now to parse and then get back
      // the raw upstream in ICAL.js the
      // component modifies its input so we need
      // to restore it to a clean state after.
      // We should probably avoid this in ICAL.js
      // so we don't need to do the roundtrip.
      if (!(rawData instanceof ICAL.icalcomponent)) {
        event = new ICAL.icalcomponent(rawData);
        rawData = event.toJSON();
      } else {
        event = rawData;
        rawData = event.toJSON();
      }

      var result = {};
      var vevent = event.getFirstSubcomponent(
        'VEVENT'
      );

      // simple strings...

      result.id = this._remoteString(
        vevent, 'UID'
      );

      result.title = this._remoteString(
        vevent, 'SUMMARY'
      );

      result.description = this._remoteString(
        vevent, 'DESCRIPTION'
      );

      result.location = this._remoteString(
        vevent, 'LOCATION'
      );

      result.startDate = this._remoteDate(
        vevent, 'DTSTART'
      );

      result.endDate = this._remoteDate(
        vevent, 'DTEND'
      );

      //XXX: quick hack for now
      //we need to expand recurring in
      //the future.
      result.occurs = [
        result.startDate
      ];

      result._rawData = rawData;

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

    streamEvents: function(account, calendar, stream, callback) {
      var self = this;
      var connection = new Caldav.Connection(
        account
      );

      var request = this._requestEvents(connection, calendar);

      function emitData(url, data) {
        var event = data['calendar-data'];
        var token = data['getetag'];

        //XXX: Handle events
        if (event.status == 200) {
          data = self._formatEvent(event.value);
          if (token.status == 200) {
            data.syncToken = token.value;
          }
          stream.emit('data', data);
        }
      }
      request.sax.on('DAV:/response', emitData);

      request.send(function(err) {
        request.sax.removeEventListener(
          'DAV:/response', emitData
        );
        callback(err);
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

    updateEvent: function(account, calendar, event, callback) {
      var connection = new Caldav.Connection(
        account
      );

      var self = this;
      var req = this._assetRequest(connection, event.url);
      var etag = event.syncToken;

      // parse event
      this.parseEvent(event.icalComponent, function(err, icalEvent) {
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
