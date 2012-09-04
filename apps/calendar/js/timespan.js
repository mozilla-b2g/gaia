Calendar.Timespan = (function() {

  function Timespan(startDate, endDate) {
    this.start = startDate.valueOf();
    this.end = endDate.valueOf();
  }

  Timespan.prototype = {

    /**
     * Returns all dates between the start and
     * end of the timespan. Shortcut for Calc.daysBetween
     *
     * @return {Array[Date]} array of dates in order.
     */
    daysBetween: function() {
      var start = new Date(this.start);
      var end = new Date(this.end);

      return Calendar.Calc.daysBetween(
        start,
        end
      );
    },

    isEqual: function(inputSpan) {
      return (
        this.start === inputSpan.start &&
        this.end === inputSpan.end
      );
    },

    /**
     * If given Timespan overlaps this timespan
     * return a new timespan with the overlapping
     * parts removed.
     *
     * See tests for examples...
     */
    trimOverlap: function(span) {
      if (this.contains(span) || span.contains(this)) {
        return null;
      }

      var start = span.start;
      var end = span.end;
      var ourEnd = this.end;
      var ourStart = this.start;

      var overlapsBefore = start >= ourStart && start < ourEnd;
      var overlapsAfter = ourStart >= start && ourStart < end;

      var newStart = span.start;
      var newEnd = span.end;

      if (overlapsBefore) {
        newStart = ourEnd + 1;
      }

      if (overlapsAfter) {
        newEnd = ourStart - 1;
      }

      return new Calendar.Timespan(
        newStart,
        newEnd
      );
    },

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
