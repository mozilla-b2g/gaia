Calendar.Timespan = (function() {

  function Timespan(startDate, endDate) {
    this.start = startDate.valueOf();
    this.end = endDate.valueOf();
  }

  Timespan.prototype = {

    /**
     * Checks if given time overlaps with
     * range.
     *
     * @param {Date|Numeric|Timespan} start range or one position.
     * @param {Date|Numeric} [end] do a span comparison.
     */
    overlaps: function(start, end) {
      var ourStart = this.start;
      var ourEnd = this.end;

      if (start instanceof Timespan) {
        end = start.end;
        start = start.start;
      } else {
        // start/end expected
        start = (start instanceof Date) ? start.valueOf() : start;
        end = (end instanceof Date) ? end.valueOf() : end;
      }

      return (
          start >= ourStart && start < ourEnd ||
          ourStart >= start && ourStart < end
      );
    },

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
      } else {
        return this.containsNumeric(date);
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
