Factory.define('remoteCalendar', {
  properties: {
    id: '',
    url: '/',
    name: 'my calendar',
    color: '#333',
    description: 'description',
    syncToken: '1'
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
    remote: Factory.get('remoteCalendar')
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
