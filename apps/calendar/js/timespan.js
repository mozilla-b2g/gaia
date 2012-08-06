Calendar.Timespan = (function() {

  function Timespan(startDate, endDate) {
    this.start = startDate.valueOf();
    this.end = endDate.valueOf();
  }

  Timespan.prototype = {
    /**
     * When given a date checks if
     * date is inside given range.
     *
     *
     * @param {Date} date date or event.
     */
    contains: function(date) {
      var start = this.start;
      var end = this.end;

      if (date instanceof Date) {
        return start <= date && end >= date;
      } else if (date instanceof Timespan) {
        return start <= date.start &&
               end >= date.end;
      }
    },

    /**
     * Numeric comparison assumes
     * given seconds since epoch.
     *
     * @param {Numeric} timestamp numeric timestamp.
     */
    containsNumeric: function(timestamp) {
      var start = this.start;
      var end = this.end;

      return start <= timestamp &&
             end >= timestamp;
    }

  };

  return Timespan;

}());
