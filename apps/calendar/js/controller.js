(function(window) {

  if (typeof(Calendar) === 'undefined') {
    Calendar = {};
  }

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
   * Enter/exit settings mode.
   *
   * @param {Boolean} value settings mode.
   */
  proto.setInSettings = function(bool) {
    setter.call(this, 'inSettings', !!bool);
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
