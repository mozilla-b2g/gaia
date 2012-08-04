Calendar.Timespan = (function() {

  function Timespan(startDate, endDate) {
    this.start = startDate.valueOf();
    this.end = endDate.valueOf();
  }

  Timespan.prototype = {
    /**
     * Checks if event or date
     * is in this timespan.
     *
     * @param {Date} date date or event.
     */
    contains: function(date) {
      if (date instanceof Date) {
        return this.start <= date && this.end >= date;
      }
    }

  };

  return Timespan;

}());
