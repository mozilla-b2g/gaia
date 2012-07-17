Calendar.ns('Controllers').Time = (function() {

  function Time(app) {
    this.app = app;
    Calendar.Responder.call(this);
  }

  function setter(attr, value) {
    var oldVal = this[attr];
    this[attr] = value;
    this.emit(attr + 'Change', value, oldVal);
  }

  Time.prototype = {
    __proto__: Calendar.Responder.prototype,

    /**
     * Sets current month and emits currentMonthChange event.
     *
     * @param {Date} month month.
     */
    setCurrentMonth: function(value) {
      setter.call(this, 'currentMonth', value);
    },

    /**
     * Sets current day and emits selectedDayChange event.
     *
     * @param {Date} day current day.
     */
    setSelectedDay: function(value) {
      setter.call(this, 'selectedDay', value);
    }
  };

  return Time;

}());
