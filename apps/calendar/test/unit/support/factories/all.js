(function(window) {

  var calendarId = 0;
  var Calc = Calendar.Calc;

  function handleTransportDate(obj) {

    // handle case of incoming start date

    if (obj.startDate) {
      obj.start = Calc.dateToTransport(obj.startDate);
    }

    if (obj.endDate) {
      obj.end = Calc.dateToTransport(obj.endDate);
    }

    // handle case of defaults

    if (!obj.start) {
      obj.start = Calc.dateToTransport(
        new Date()
      );
    }

    if (!obj.end) {
      obj.end = Calc.dateToTransport(
        // 1 hour after now
        new Date(Date.now() + 3600 * 1000)
      );
    }

    // handle case of given .start\end or defaults

    if (obj.start) {
      obj.startDate = Calc.dateFromTransport(obj.start);
    }

    if (obj.end) {
      obj.endDate = Calc.dateFromTransport(obj.end);
    }
  }

  Factory.define('remote.calendar', {
    properties: {
      id: '',
      url: '/',
      name: 'my calendar',
      color: '#333',
      description: 'description',
      syncToken: '1',
      // read, write, delete
      privilegeSet: ['read', 'write-content', 'unbind']
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
      isRecurring: false,
      alarms: [
        {action: 'DISPLAY', trigger: 60000}
      ]
      //XXX: raw data
    },

    onbuild: function(obj) {
      var id = obj.id;
      if (!id) {
        id = obj.id = 'euuid/' + eventId++;
      }

      handleTransportDate(obj);

      if (!obj.title)
        obj.title = 'title ' + id;

      if (!obj.description)
        obj.description = 'description ' + id;

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
      description: '1',
      privilegeSet: [
        'read',
        'write',
        'write-content'
      ]
    }

  });

  Factory.define('caldav.account', {
    properties: {
      user: 'user',
      password: 'password',
      domain: 'http://google.com',
      entrypoint: '/dav/',
      calendarHome: '/dav/my/foobar'
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
      entrypoint: '/',
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
        obj._id = obj.eventId + '-' + (++busytimeId);
      }

      handleTransportDate(obj);

      if (obj.endDate == obj.startDate) {
        obj.endDate.setHours(endDate.getHours() + 2);
        handleTransportDate(obj);
      }
    }

  });

  Factory.define('alarm', {
    oncreate: function(obj) {
      if (obj.startDate && obj.startDate instanceof Date) {
        obj.startDate = Calc.dateToTransport(obj.startDate);
      }
    }
  });

  Factory.define('icalComponent', {
    oncreate: function(obj) {
      if (obj.lastRecurrenceId && obj.lastRecurrenceId instanceof Date) {
        obj.lastRecurrenceId = Calc.dateToTransport(obj.lastRecurrenceId);
      }
    },

    properties: {
      ical: 'fooo!'
    }
  });

}(this));
