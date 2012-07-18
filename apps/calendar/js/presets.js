(function(window) {
  var Presets = {
    /*
    'google': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        providerType: 'Caldav',
        domain: 'https://calendar.google.com',
        uri: '/calendar/dav/'
      }
    },

    'yahoo': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        domain: 'https://caldav.calendar.yahoo.com',
        providerType: 'Caldav',
        uri: '/'
      }
    },

    'caldav': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        domain: '',
        providerType: 'Caldav',
        uri: ''
      }
    },
    */

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
