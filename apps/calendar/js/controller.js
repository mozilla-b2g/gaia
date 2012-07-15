(function(window) {

  Calendar.Controller = function(options) {
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

    Calendar.Responder.call(this);
  };

  var proto = Calendar.Controller.prototype = Object.create(
    Calendar.Responder.prototype
  );


  function setter(attr, value) {
    var oldVal = this[attr];
    this[attr] = value;
    this.emit(attr + 'Change', value, oldVal);
  }

  /**
   * Navigates app to a new location.
   *
   * @param {String} url new view url.
   */
  proto.go = function(url) {
    page.show(url);
  };

  /**
   * Sets current month and emits currentMonthChange event.
   *
   * @param {Date} month month.
   */
  proto.setCurrentMonth = function(value) {
    setter.call(this, 'currentMonth', value);
  };

  /**
   * Sets current day and emits selectedDayChange event.
   *
   * @param {Date} day current day.
   */
  proto.setSelectedDay = function(value, el) {
    setter.call(this, 'selectedDay', value);
  };



}(this));
