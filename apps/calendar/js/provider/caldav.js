(function(window) {

  /* Set global XHR options */
  var Backend = window.Caldav;
  var xhrOpts = {
    mozSystem: true
  };

  Backend.Xhr.prototype.globalXhrOptions = xhrOpts;

  function Caldav(options) {
    Calendar.Provider.Local.apply(this, arguments);
  }

  Caldav.prototype = {
    __proto__: Calendar.Provider.Local.prototype,

    useUrl: true,
    useCredentials: true,

    _buildConnection: function(force) {
      if (typeof(force) === 'undefined') {
        force = false;
      }
      if (force || !this._connection) {
        this._connection = new Backend.Connection({
          domain: this.domain,
          user: this.user,
          password: this.password
        });
      }
      return this._connection;
    },

    _homeRequest: function() {
      var request = new Backend.Request.CalendarHome(
        this._connection,
        { url: this.url }
      );

      return request;
    },

    setupConnection: function(callback) {
      this._buildConnection(true);
      var req = this._homeRequest();

      req.send(callback);
    },

    findCalendars: function(callback) {
      var ResourceFinder = Backend.Request.Resources;
      var CalendarResource = Backend.Resources.Calendar;
      var Cal = Calendar.Provider.Calendar.Caldav;

      var req = new ResourceFinder(this._connection, {
        url: this.url
      });

      req.addResource('calendar', CalendarResource);
      req.prop(['ical', 'calendar-color']);
      req.prop(['caldav', 'calendar-description']);
      req.prop('displayname');
      req.prop('resourcetype');
      req.prop(['calserver', 'getctag']);

      req.send(function(err, data) {
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
            results[key] = new Cal();
            results[key].mapRemoteCalendar(item);
          }
        }
        callback(null, results);
      });
    }
  };

  Calendar.ns('Provider').Caldav = Caldav;

}(this));

