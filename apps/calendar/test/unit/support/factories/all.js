(function(window) {

  var calendarId = 0;

  Factory.define('remote.calendar', {
    properties: {
      id: '',
      url: '/',
      name: 'my calendar',
      color: '#333',
      description: 'description',
      syncToken: '1'
    },

    onbuild: function(obj) {
      var id = obj.id;
      if (!id) {
        id = obj.id = 'cuuid/' + calendarId++;
      }
    }
  });

  var eventId = 0;

  Factory.define('remote.event', {
    properties: {
      location: 'location',
      recurring: false
      //XXX: raw data
    },

    onbuild: function(obj) {
      var id = obj.id;
      if (!id) {
        id = obj.id = 'euuid/' + eventId++;
      }

      obj.title = 'title ' + id;
      obj.description = 'description ' + id;

      if (!obj.startDate)
        obj.startDate = new Date();

      if (!obj.endDate)
        obj.endDate = new Date();

      if (!obj.occurs)
        obj.occurs = [obj.startDate];
    }
  });

  Factory.define('remote.event.recurring', {
    extend: 'remote.event',

    onbuild: function(obj) {
      var parent = Factory.get('remote.event');
      parent.onbuild.apply(this, arguments);

      var lastEvent = obj.occurs[obj.occurs.length - 1];
      var recurres = 3;

      if (typeof(obj._recurres) !== 'undefined') {
        recurres = obj._recurres;
        delete obj._recurres;
      }
      for (var i = 0; i < recurres; i++) {
        obj.occurs.push(
          new Date(
            lastEvent.getFullYear(),
            lastEvent.getMonth(),
            lastEvent.getDate() + 1
          )
        );

        lastEvent = obj.occurs[
          obj.occurs.length - 1
        ];
      }

      obj.recurring = {
        expandedUntil: lastEvent,
        isExpaned: true
      };
    }
  });

  Factory.define('caldav.calendar', {

    get object() {
      return Caldav.Resources.Calendar;
    },

    properties: {
      url: '/cal',
      name: 'name',
      color: '#333',
      ctag: 'token',
      description: '1'
    }

  });

  Factory.define('caldav.account', {
    properties: {
      user: 'user',
      password: 'password',
      domain: 'http://google.com',
      url: '/'
    }
  });

  Factory.define('caldav.connection', {
    extend: 'caldav.account',

    get object() {
      return Caldav.Connection;
    }
  });

  Factory.define('account', {

    get object() {
      return Calendar.Models.Account;
    },

    properties: {
      providerType: 'Local',
      user: 'user',
      password: 'password',
      domain: 'http://google.com',
      url: '/',
      preset: 'local'
    }
  });

  Factory.define('calendar', {
    get object() {
      return Calendar.Models.Calendar;
    },

    properties: {
      accountId: 1,
      remote: Factory.get('remote.calendar')
    },

    oncreate: function(obj) {
      if (!obj._id) {
        obj._id = obj.accountId + '-' + obj.remote.id;
      }
    }

  });

  Factory.define('event', {
    properties: {
      calendarId: 1,
      remote: Factory.get('remote.event')
    },

    oncreate: function(obj) {
      if (!obj._id)
        obj._id = obj.calendarId + '-' + obj.remote.id;
    }
  });

  var busytimeId = 0;

  Factory.define('busytime', {
    properties: {
      calendarId: 'calendar-1',
      eventId: 'event-1'
    },

    oncreate: function(obj) {
      if (!obj._id) {
        obj._id = ++busytimeId;
      }

      if (obj.startDate && !obj.endDate) {
        var endDate = new Date(obj.startDate.valueOf());
        endDate.setHours(obj.startDate.getHours() + 2);
        obj.endDate = endDate;
      }
    }
  });

  Factory.define('event.recurring', {
    extend: 'event',
    properties: {
      remote: Factory.get('remote.event.recurring')
    }
  });

}(this));
