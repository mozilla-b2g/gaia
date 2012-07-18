(function(window) {

  function Caldav(options) {
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  Caldav.prototype = {
    calendarType: 'Caldav'
  };

  Calendar.ns('Caldav').Caldav = Caldav;

}(this));

