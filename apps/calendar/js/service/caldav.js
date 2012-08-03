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
        //FIXME: This should always start
        //       as a UTC time and then
        //       translated into the current
        //       global timezone.
        return new Date(
          data.year,
          // ICAL.js is 1 based
          (data.month - 1),
          data.day,
          data.hour,
          data.minute,
          data.second
        );
      }

      return null;
    },

    _formatEvent: function(event) {
      // map to a component
      if (!(event instanceof ICAL.icalcomponent)) {
        event = new ICAL.icalcomponent(event);
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

    getEvents: function(account, calendar) {
    }
  };

  return Service;

}());
