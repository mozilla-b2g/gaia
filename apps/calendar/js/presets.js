(function(window) {
  var Presets = {
    'google': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        providerType: 'Caldav',
        domain: 'https://calendar.google.com',
        url: '/calendar/dav/',
        user: '@gmail.com'
      }
    },
    'yahoo': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        domain: 'https://caldav.calendar.yahoo.com',
        providerType: 'Caldav',
        url: '/',
        user: '@yahoo.com'
      }
    },

    'caldav': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        domain: '',
        providerType: 'Caldav',
        url: ''
      }
    },

    'local': {
      singleUse: true,
      providerType: 'Local',
      group: 'local',
      options: {
        providerType: 'Local'
      }
    },

    'mozilla': {
      providerType: 'Caldav',
      group: 'testing',
      options: {
        domain: 'https://mail.mozilla.com',
        providerType: 'Caldav',
        url: '',
        user: '@mozilla.com'
      }
    }

  };

  Calendar.Presets = Presets;

}(this));
