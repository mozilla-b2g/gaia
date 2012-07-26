Calendar.ns('Provider.Event').Abstract = (function() {

  function Event(options) {
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

  Event.prototype = {
    title: '',
    description: '',
    location: '',

    startDate: null,
    endDate: null,

    toJSON: function() {
      return {
        title: this.title,
        description: this.description,
        location: this.location,
        startDate: this.startDate,
        endDate: this.endDate
      };
    }

  };

  return Event;

}());
