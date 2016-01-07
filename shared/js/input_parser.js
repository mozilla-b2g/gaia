/* exported InputParser */
'use strict';

/**
 * Stateless object for input parser functions..
 * The intent is the methods here will only relate to the parsing
 * of input[type="date|time"]
 */
var InputParser = (function() {

  var InputParser = {
    _dateParts: ['year', 'month', 'date'],
    _timeParts: ['hours', 'minutes', 'seconds'],

    /**
     * Import HTML5 input[type="time"] string value
     *
     * @param {String} value 23:20:50.52, 17:39:57.
     * @return {Object} { hours: 23, minutes: 20, seconds: 50 }.
     */
    importTime: function(value) {
      var result = {
        hours: 0,
        minutes: 0,
        seconds: 0
      };

      if (!value) {
        return result;
      }


      var parts = value.split(':');
      var part;
      var partName;

      var i = 0;
      var len = InputParser._timeParts.length;

      for (; i < len; i++) {
        partName = InputParser._timeParts[i];
        part = parts[i];
        if (part) {
          result[partName] = parseInt(part.slice(0, 2), 10) || 0;
        }
      }

      return result;
    },

    /**
     * Export date to HTML5 input[type="time"]
     *
     * @param {Date} value export value.
     * @return {String} 17:39:57.
     */
    exportTime: function(value) {
      return value.toLocaleString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    },

    /**
     * Import HTML5 input[type="time"] to object.
     *
     * @param {String} value 1997-12-19.
     * @return {Object} { year: 1997, month: 12, date: 19 }.
     */
    importDate: function(value) {
      var result = {
        year: 0,
        month: 0,
        date: 0
      };

      if (!value) {
        return result;
      }

      var parts = value.split('-');
      var part;
      var partName;

      var i = 0;
      var len = InputParser._dateParts.length;

      for (; i < len; i++) {
        partName = InputParser._dateParts[i];
        part = parts[i];
        if (part) {
          result[partName] = parseInt(part, 10);
        }
      }

      if (result.month > 0) {
        result.month = result.month - 1;
      }

      result.date = result.date || 1;

      return result;
    },

    /**
     * Export js local date to HTML5 input[type="date"].
     *
     * @param {Date} value export value.
     * @return {String} date string (1997-12-19).
     */
    exportDate: function(value) {
      var year = value.getFullYear();
      var month = value.getMonth() + 1;
      var day = value.getDate();

      if (month < 10) {
        month = `0${month}`;
      }
      if (day < 10) {
        day = `0${day}`;
      }
      return `${year}-${month}-${day}`;
    },

    /**
     * Designed to take a date & time value from
     * html5 input types and returns a JS Date.
     *
     * @param {String} date input date.
     * @param {String} time input time.
     *
     * @return {Date} full date object from date/time.
     */
    formatInputDate: function(date, time) {
      time = InputParser.importTime(time);
      date = InputParser.importDate(date);

      return new Date(
        date.year,
        date.month,
        date.date,
        time.hours,
        time.minutes,
        time.seconds
      );
    },
  };

  return InputParser;
}());
