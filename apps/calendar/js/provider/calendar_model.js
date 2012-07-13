(function(window) {
  if (typeof(Calendar) === 'undefined') {
    Calendar = {};
  }

  if (typeof(Calendar.Provider) === 'undefined') {
    Calendar.Provider = {};
  }

  function Cal(provider, options) {
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

    this.provider = provider;
  }

  Cal.prototype = {
    color: '#CCC'
  };

  Calendar.Provider.CalendarModel = Cal;

}(this));
