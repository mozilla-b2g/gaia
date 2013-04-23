(function(window) {
  var Presets = {
    'google': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        domain: 'https://calendar.google.com',
        entrypoint: '/calendar/dav/',
        providerType: 'Caldav',
        user: '@gmail.com',
        usernameType: 'email'
      }
    },

    'yahoo': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        domain: 'https://caldav.calendar.yahoo.com',
        entrypoint: '/',
        providerType: 'Caldav',
        user: '@yahoo.com',
        usernameType: 'email'
      }
    },

    'caldav': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        domain: '',
        entrypoint: '',
        providerType: 'Caldav'
      }
    },

    'local': {
      singleUse: true,
      providerType: 'Local',
      group: 'local',
      options: {
        providerType: 'Local'
      }
    }
  };

  Calendar.Presets = Presets;

}(this));
