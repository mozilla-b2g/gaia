(function(window) {
  if (typeof(Calendar) === 'undefined') {
    Calendar = {};
  }

  var Presets = {
    'google': {
      provider: 'Caldav',
      group: 'remote',
      options: {
        domain: 'https://calendar.google.com',
        uri: '/calendar/dav/'
      }
    },

    'yahoo': {
      provider: 'Caldav',
      group: 'remote',
      options: {
        domain: 'https://caldav.calendar.yahoo.com',
        uri: '/'
      }
    },

    'local': {
      provider: 'Local',
      group: 'local',
      options: {}
    }

  };

  Calendar.Presets = Presets;

}(this));
