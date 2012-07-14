(function(window) {
  if (typeof(Calendar) === 'undefined') {
    Calendar = {};
  }

  var Presets = {

    'google': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        domain: 'https://calendar.google.com',
        uri: '/calendar/dav/'
      }
    },

    'yahoo': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        domain: 'https://caldav.calendar.yahoo.com',
        uri: '/'
      }
    },

    'local': {
      providerType: 'Local',
      group: 'local',
      options: {}
    }

  };

  Calendar.Presets = Presets;

}(this));
