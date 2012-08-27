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
      return this.isSameDate(date, this.today);
    },

    offsetMinutesToMs: function(offset) {
      return offset * (60 * 1000);
    },

    /**
     * Creates timespan for a given month.
     * Starts at the first week that occurs
     * in the given month. Ends at the
     * last day, minute, second of given month.
     */
    spanOfMonth: function(month) {
      month = new Date(
        month.getFullYear(),
        month.getMonth(),
        1
      );

      var startDay = this.getWeekStartDate(month);

      var endDay = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        1
      );

      endDay.setMilliseconds(-1);
      endDay = this.getWeekEndDate(endDay);

      return new Calendar.Timespan(
        startDay,
        endDay
      );
    },

    /**
     * Take a date and convert it to UTC-0 time
     * removing offset.
     */
    utcMs: function(date) {
      var offset = this.offsetMinutesToMs(
        date.getTimezoneOffset()
      );

      return date.valueOf() - offset;
    },

    fromUtcMs: function(ms, offset) {
      if (typeof(offset) === 'undefined') {
        // no offset relative position in time.
        var utcDate = new Date(ms);
        return new Date(
          utcDate.getUTCFullYear(),
          utcDate.getUTCMonth(),
          utcDate.getUTCDate(),
          utcDate.getUTCHours(),
          utcDate.getUTCMinutes(),
          utcDate.getUTCSeconds()
        );
      } else {
        // when there is an offset it is an absolute
        // position in time.
        ms = ms + this.offsetMinutesToMs(offset);
        return new Date(ms);
      }
    },

    /**
     * Checks if two date objects occur
     * on the same date (in the same month, year, day).
     * Disregards time.
     *
     * @param {Date} first date.
     * @param {Date} second date.
     * @return {Boolean} true when they are the same date.
     */
    isSameDate: function(first, second) {
      return first.getMonth() == second.getMonth() &&
             first.getDate() == second.getDate() &&
             first.getFullYear() == second.getFullYear();
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
     * Finds localized week start date of given date.
     *
     * @param {Date} date any day the week.
     * @return {Date} first date in the week of given date.
     */
    getWeekStartDate: function(date) {
      var currentDay = date.getDay();
      var startDay = date.getDate() - currentDay;

      return this.createDay(date, startDay);
    },

    getWeekEndDate: function(date) {
      // TODO: There are localization problems
      // with this approach as we assume a 7 day week.
      var start = this.getWeekStartDate(date);
      start.setDate(start.getDate() + 7);
      start.setMilliseconds(-1);

      return start;
    },

    /**
     * Returns an array of dates objects.
     * Inclusive. First and last are
     * the given instances.
     *
     * @param {Date} start starting day.
     * @param {Date} end ending day.
     */
    daysBetween: function(start, end) {
      if (start > end) {
        var tmp = end;
        end = start;
        start = tmp;
        tmp = null;
      }

      var list = [start];
      var last = start.getDate();
      var cur;

      while (true) {
        var next = new Date(
          start.getFullYear(),
          start.getMonth(),
          ++last
        );

        if (next > end) {
          throw new Error(
            'sanity fails next is greater then end'
          );
        }

        if (!this.isSameDate(next, end)) {
          list.push(next);
          continue;
        }

        break;
      }

      list.push(end);
      return list;
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
      var weeksDayStart = this.getWeekStartDate(startDate);
      var result = [weeksDayStart];

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

    /*
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
