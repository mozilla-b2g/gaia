(function(window) {
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

  Calendar.ns('Provider').CalendarModel = Cal;

}(this));
