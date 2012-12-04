(function(window) {
  var Presets = {
    'google': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        providerType: 'Caldav',
        domain: 'https://calendar.google.com',
        entrypoint: '/calendar/dav/',
        user: '@gmail.com'
      }
    },
    'yahoo': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        domain: 'https://caldav.calendar.yahoo.com',
        providerType: 'Caldav',
        entrypoint: '/',
        user: '@yahoo.com'
      }
    },

    'caldav': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        domain: '',
        providerType: 'Caldav',
        entrypoint: ''
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
        entrypoint: '',
        user: '@mozilla.com'
      }
    }

  };

  Calendar.Presets = Presets;

}(this));
