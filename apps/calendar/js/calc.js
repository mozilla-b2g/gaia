(function(window) {
  Calendar.Calc = {

    PAST: 'past',

    NEXT_MONTH: 'next-month',

    OTHER_MONTH: 'other-month',

    PRESENT: 'present',

    FUTURE: 'future',

    get today() {
      //TODO: implement cache
      return new Date();
    },

    /**
     * Checks is given date is today.
     *
     * @param {Date} date compare.
     * @return {Boolean} true when today.
     */
    isToday: function(date) {
      return date.getMonth() == this.today.getMonth() &&
             date.getDate() == this.today.getDate() &&
             date.getFullYear() == this.today.getFullYear();
    },

    /**
     * Returns an identifier for a specific
     * date in time for a given date
     *
     * @param {Date} date to get id for.
     * @return {String} identifier.
     */
    getDayId: function(date) {
      return [
        'd',
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      ].join('-');
    },

    /**
     * Returns a date object from
     * a string id for a date.
     *
     * @param {String} id identifier for date.
     * @return {Date} date output.
     */
    dateFromId: function(id) {
      var parts = id.split('-'),
          date,
          type;

      if (parts.length > 1) {
        type = parts.shift();
        switch (type) {
          case 'd':
            date = new Date(parts[0], parts[1], parts[2]);
            break;
          case 'm':
            date = new Date(parts[0], parts[1]);
            break;
        }
      }

      return date;
    },

    /**
     * Returns an identifier for a specific
     * month in time for a given date.
     *
     * @return {String} identifier.
     */
    getMonthId: function(date) {
      return [
        'm',
        date.getFullYear(),
        date.getMonth()
      ].join('-');
    },

    createDay: function(date, day, month, year) {
      return new Date(
        year || date.getFullYear(),
        month || date.getMonth(),
        day || date.getDate()
      );
    },

    /**
     * Returns an array of weekdays
     * based on the start date.
     * Will always return the 7 days
     * of that week regardless of what the start date is
     * but they will be returned in the order
     * of their localized getDay function.
     *
     * @param {Date} startDate point of origin.
     * @return {Array} a list of dates in order of getDay().
     */
    getWeeksDays: function(startDate) {
      //local day position
      var currentDay = startDate.getDay(),
          startDay = startDate.getDate() - currentDay,
          weeksDayStart = this.createDay(startDate, startDay),
          result = [weeksDayStart];

      for (var i = 1; i < 7; i++) {
        result.push(new Date(
          weeksDayStart.getFullYear(),
          weeksDayStart.getMonth(),
          weeksDayStart.getDate() + i
        ));
      }

      return result;
    },

    /**
     * Checks if date is in the past
     *
     * @param {Date} date to check.
     * @return {Boolean} true when date is in the past.
     */
    isPast: function(date) {
      return (date.valueOf() < this.today.valueOf());
    },

    /**
     * Checks if date is in the future
     *
     * @param {Date} date to check.
     * @return {Boolean} true when date is in the future.
     */
    isFuture: function(date) {
      return !this.isPast(date);
    },

    /**
     * Based on the input date
     * will return one of the following states
     *
     *  past, present, future
     *
     * @param {Date} day for compare.
     * @param {Date} month today's date.
     * @return {String} state.
     */
    relativeState: function(day, month) {
      var states;

      // 1. the date is today (real time)
      if (this.isToday(day)) {
        return this.PRESENT;
      }

      // 2. the date is in the past (real time)
      if (this.isPast(day)) {
        states = this.PAST;
      // 3. the date is in the future (real time)
      } else {
        states = this.FUTURE;
      }

      // 4. the date is not in the current month (relative time)
      if (day.getMonth() !== month.getMonth()) {
        states += ' ' + this.OTHER_MONTH;
      }

      return states;
    }

  };

}(this));
