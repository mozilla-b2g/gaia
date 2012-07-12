(function(window) {
  if (typeof(Calendar) === 'undefined') {
    Calendar = {};
  }

  if (typeof(Calendar.Store) === 'undefined') {
    Calendar.Store = {};
  }

  function Busytime() {
    Calendar.Responder.call(this);

    this.ids = {};
    this.times = {};
  }

  var proto = Busytime.prototype = Object.create(
    Calendar.Responder.prototype
  );

  /**
   * Adds a date into busy times.
   *
   * @param {Date} date time to add.
   * @param {String} id unique identifier for busy time.
   */
  proto.add = function(date, id) {
    //don't check for uniqueness
    var dateId = Calendar.Calc.getDayId(date),
        monthId = Calendar.Calc.getMonthId(date);

    if (!(dateId in this.times)) {
      this.times[dateId] = {};
    }

    this.times[dateId][id] = true;
    this.ids[id] = date;

    this.emit('add', id, date);
    this.emit('add ' + monthId, id, date);
  };

  /**
   * Finds busy time based on its id
   *
   * @param {String} id busy time id.
   */
  proto.get = function(id) {
    return this.ids[id];
  };

  /**
   * Returns an array of hours
   * that user is busy during
   * that specific day.
   *
   * @param {Date} date date.
   */
  proto.getHours = function(date) {
    var dateId = Calendar.Calc.getDayId(date),
        key,
        times,
        hours = [];

    if (dateId in this.times) {
      times = this.times[dateId];
      for (key in times) {
        if (times.hasOwnProperty(key)) {
          hours.push(this.ids[key].getHours());
        }
      }
    }

    return hours;
  };

  /**
   * Removes a specific busy time based
   * on its id.
   *
   * @param {String} id busy time id.
   */
  proto.remove = function(id) {
    var dateId, monthId, date;
    if (id in this.ids) {
      date = this.ids[id];
      dateId = Calendar.Calc.getDayId(date);
      monthId = Calendar.Calc.getMonthId(date);

      delete this.times[dateId][id];
      delete this.ids[id];

      this.emit('remove', id, date);
      this.emit('remove ' + monthId, id, date);

      return true;
    }

    return false;
  };

  Calendar.Store.Busytime = Busytime;

}(this));
