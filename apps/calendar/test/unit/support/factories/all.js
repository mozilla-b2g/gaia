(function(window) {
  Factory.define('remote.calendar', {
    properties: {
      id: '',
      url: '/',
      name: 'my calendar',
      color: '#333',
      description: 'description',
      syncToken: '1'
    }
  });

  var eventId = 0;
  Factory.define('remote.event', {
    properties: {
      location: 'location'
      //XXX: raw data
    },

    onbuild: function(obj) {
      var id = obj.id = eventId++;

      obj.title = 'title ' + id;
      obj.description = 'description ' + id;
      obj.startDate = new Date();
      obj.endDate = new Date();
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

  Factory.define('calendar', {
    get object() {
      return Calendar.Models.Calendar;
    },

    properties: {
      remote: Factory.get('remote.calendar')
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
}(this));
