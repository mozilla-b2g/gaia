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
        'getEvents'
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

      function emitData(data) {
        var event = data['calendar-data'];
        //XXX: Handle events
        if (event.status === 200) {
          data = self._formatEvent(event.value);
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
    }

  };

  return Service;

}());
