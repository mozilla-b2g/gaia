define(function(require, exports) {
  'use strict';

  var dateFormat = require('app').dateFormat;
  var defaultCompare = require('calendar').compare;
  var Timespan = require('timespan');

  const SECOND = 1000;
  const MINUTE = (SECOND * 60);
  const HOUR = MINUTE * 60;

  exports._hourDate = new Date();

  exports.startsOnMonday = false;

  exports.FLOATING = 'floating';

  exports.ALLDAY = 'allday';

  /**
   * MS in a second
   */
  exports.SECOND = SECOND;
  /**
   * MS in a minute
   */
  exports.MINUTE = MINUTE;

  /**
   * MS in an hour
   */
  exports.HOUR = HOUR;

  exports.PAST = 'past';

  exports.NEXT_MONTH = 'next-month';

  exports.OTHER_MONTH = 'other-month';

  exports.PRESENT = 'present';

  exports.FUTURE = 'future';

  Object.defineProperty(exports, 'today', {
    get: function() {
      //TODO: implement cache
      return new Date();
    }
  });

  /**
   * Formats a numeric value for an hour.
   * Useful to convert absolute hour into
   * a display hour localizes for am/pm
   */
  exports.formatHour = function(hour) {
    var format = navigator.mozL10n.get('hour-format');

    if (hour === exports.ALLDAY) {
      return navigator.mozL10n.get('hour-allday');
    }

    exports._hourDate.setHours(hour);

    var result = dateFormat.localeFormat(
      exports._hourDate,
      format
    );

    // remove leading zero
    result = result.replace(/^0/, '');

    return result;
  };

  exports.daysInWeek = function() {
    //XXX: We need to localize this...
    return 7;
  };

  /**
   * Calculates day of week when starting day is Monday.
   */
  exports.dayOfWeekFromMonday = function(numeric) {
    var day = numeric - 1;
    if (day < 0) {
      return 6;
    }

    return day;
  };

  /**
   * Calculates day of week when starting day is Sunday.
   */
  exports.dayOfWeekFromSunday = function(numeric) {
    return numeric;
  };

  /**
   * Checks is given date is today.
   *
   * @param {Date} date compare.
   * @return {Boolean} true when today.
   */
  exports.isToday = function(date) {
    return exports.isSameDate(date, exports.today);
  };

  /**
   * Intended to be used in combination
   * with hoursOfOccurance used to sort
   * hours. ALLDAY is always first.
   */
  exports.compareHours = function(a, b) {
    // to cover the case of a is allday
    // and b is also allday
    if (a === b) {
      return 0;
    }

    if (a === exports.ALLDAY) {
      return -1;
    }

    if (b === exports.ALLDAY) {
      return 1;
    }

    return defaultCompare(a, b);
  };

  /**
   * Checks if date object only contains date information (not time).
   *
   * Example:
   *
   *    var time = new Date(2012, 0, 1, 1);
   *    this._isOnlyDate(time); // false
   *
   *    var time = new Date(2012, 0, 1);
   *    this._isOnlyDate(time); // true
   *
   * @param {Date} date to verify.
   * @return {Boolean} see above.
   */
  exports.isOnlyDate = function(date) {
    if (
      date.getHours() === 0 &&
      date.getMinutes() === 0 &&
      date.getSeconds() === 0
    ) {
      return true;
    }
    return false;
  };

  /**
   * Given a start and end date will
   * calculate which hours given
   * event occurs (in order from allday -> 23).
   *
   * When an event occurs all of the given
   * date will return only "allday"
   *
   * @param {Date} day point for all day calculations.
   * @param {Date} start start point of given span.
   * @param {Date} end point of given span.
   * @return {Array} end end point of given span.
   */
  exports.hoursOfOccurance = function(day, start, end) {
    // beginning reference point (start of given date)
    var refStart = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate()
    );

    var refEnd = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate() + 1
    );

    refEnd.setMilliseconds(-1);

    var startBefore = start <= refStart;
    var endsAfter = end >= refEnd;

    if (startBefore && endsAfter) {
      return [exports.ALLDAY];
    }

    start = (startBefore) ? refStart : start;
    end = (endsAfter) ? refEnd : end;

    var curHour = start.getHours();
    var lastHour = end.getHours();
    var hours = [];

    // using < not <= because we only
    // want to include the last hour if
    // it contains some minutes or seconds.
    for (; curHour < lastHour; curHour++) {
      hours.push(curHour);
    }

    //XXX: just minutes would probably be fine?
    //     seconds are here for consistency.
    if (end.getMinutes() || end.getSeconds()) {
      hours.push(end.getHours());
    }

    return hours;
  };

  /**
   * Calculates the difference between
   * two points in hours.
   *
   * @param {Date|Numeric} start start hour.
   * @param {Date|Numeric} end end hour.
   */
  exports.hourDiff = function(start, end) {
    start = (start instanceof Date) ? start.valueOf() : start;
    end = (end instanceof Date) ? end.valueOf() : end;

    start = start / HOUR;
    end = end / HOUR;

    return end - start;
  };

  /**
   * Creates timespan for given day.
   *
   * @param {Date} date date of span.
   * @param {Boolean} includeTime uses given date
   *                           as the start time of the timespan
   *                           rather then the absolute start of
   *                           the day of the given date.
   */
  exports.spanOfDay = function(date, includeTime) {
    if (typeof(includeTime) === 'undefined') {
      date = exports.createDay(date);
    }

    var end = exports.createDay(date);
    end.setDate(end.getDate() + 1);

    return new Timespan(
      date,
      end
    );
  };

  /**
   * Creates timespan for a given month.
   * Starts at the first week that occurs
   * in the given month. Ends at the
   * last day, minute, second of given month.
   */
  exports.spanOfMonth = function(month) {
    month = new Date(
      month.getFullYear(),
      month.getMonth(),
      1
    );

    var startDay = exports.getWeekStartDate(month);

    var endDay = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      1
    );

    endDay.setMilliseconds(-1);
    endDay = exports.getWeekEndDate(endDay);

    return new Timespan(
      startDay,
      endDay
    );
  };

  /**
   * Converts a date to UTC
   */
  exports.getUTC = function(date) {
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    );
  };

  /**
   * Converts transport time into a JS Date object.
   *
   * @param {Object} transport date in transport format.
   * @return {Date} javascript date converts the transport into
   *                the current time.
   */
  exports.dateFromTransport = function(transport) {
    var utc = transport.utc;
    var offset = transport.offset;
    var zone = transport.tzid;

    var date = new Date(
      // offset is expected to be 0 in the floating case
      parseInt(utc) - parseInt(offset)
    );

    if (zone && zone === exports.FLOATING) {
      return exports.getUTC(date);
    }

    return date;
  };

  /**
   * Converts a date object into a transport value
   * which can be stored in the database or sent
   * to a service.
   *
   * When the tzid value is given an is the string
   * value of "floating" it will convert the local
   * time directly to UTC zero and record no offset.
   * This along with the tzid is understood to be
   * a "floating" time which will occur at that position
   * regardless of the current tzid's offset.
   *
   * @param {Date} date js date object.
   * @param {String} [tzid] optional tzid.
   * @param {Boolean} isDate true when is a "date" representation.
   */
  exports.dateToTransport = function(date, tzid, isDate) {
    var result = Object.create(null);

    if (isDate) {
      result.isDate = isDate;
    }

    if (tzid) {
      result.tzid = tzid;
    }

    var utc = Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds()
    );

    // remember a "date" is always a floating
    // point in time otherwise we don't use it...
    if (isDate || tzid && tzid === exports.FLOATING) {
      result.utc = utc;
      result.offset = 0;
      result.tzid = exports.FLOATING;
    } else {
      var localUtc = date.valueOf();
      var offset = utc - localUtc;

      result.utc = utc;
      result.offset = offset;
    }

    return result;
  };

  /**
   * Checks if two date objects occur
   * on the same date (in the same month, year, day).
   * Disregards time.
   *
   * @param {Date} first date.
   * @param {Date} second date.
   * @return {Boolean} true when they are the same date.
   */
  exports.isSameDate = function(first, second) {
    return first.getMonth() == second.getMonth() &&
           first.getDate() == second.getDate() &&
           first.getFullYear() == second.getFullYear();
  };

  /**
   * Returns an identifier for a specific
   * date in time for a given date
   *
   * @param {Date} date to get id for.
   * @return {String} identifier.
   */
  exports.getDayId = function(date) {
    return [
      'd',
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ].join('-');
  };

  /**
   * Returns a date object from
   * a string id for a date.
   *
   * @param {String} id identifier for date.
   * @return {Date} date output.
   */
  exports.dateFromId = function(id) {
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
  };

  /**
   * Returns an identifier for a specific
   * month in time for a given date.
   *
   * @return {String} identifier.
   */
  exports.getMonthId = function(date) {
    return [
      'm',
      date.getFullYear(),
      date.getMonth()
    ].join('-');
  };

  exports.createDay = function(date, day, month, year) {
    return new Date(
      typeof year !== 'undefined' ? year : date.getFullYear(),
      typeof month !== 'undefined' ? month : date.getMonth(),
      typeof day !== 'undefined' ? day : date.getDate()
    );
  };

  /**
   * Returns localized day of week.
   *
   * @param {Date|Number} date numeric or date object.
   */
  exports.dayOfWeek = function(date) {
    var number = date;

    if (typeof(date) !== 'number') {
      number = date.getDay();
    }

    if (exports.startsOnMonday) {
      return this.dayOfWeekFromMonday(number);
    }
    return this.dayOfWeekFromSunday(number);
  };

  /**
   * Finds localized week start date of given date.
   *
   * @param {Date} date any day the week.
   * @return {Date} first date in the week of given date.
   */
  exports.getWeekStartDate = function(date) {
    var currentDay = exports.dayOfWeek(date);
    var startDay = (date.getDate() - currentDay);

    return exports.createDay(date, startDay);
  };

  exports.getWeekEndDate = function(date) {
    // TODO: There are localization problems
    // with this approach as we assume a 7 day week.
    var start = exports.getWeekStartDate(date);
    start.setDate(start.getDate() + 7);
    start.setMilliseconds(-1);

    return start;
  };

  /**
   * Returns an array of dates objects.
   * Inclusive. First and last are
   * the given instances.
   *
   * @param {Date} start starting day.
   * @param {Date} end ending day.
   * @param {Boolean} includeTime include times start/end ?
   */
  exports.daysBetween = function(start, end, includeTime) {
    if (start > end) {
      var tmp = end;
      end = start;
      start = tmp;
      tmp = null;
    }

    var list = [];
    var last = start.getDate();

    // handle the case where start & end dates
    // are the same date.
    if (exports.isSameDate(start, end)) {
      if (includeTime) {
        list.push(end);
      } else {
        list.push(this.createDay(start));
      }
      return list;
    }

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

      if (!exports.isSameDate(next, end)) {
        list.push(next);
        continue;
      }

      break;
    }

    if (includeTime) {
      list.unshift(start);
      list.push(end);
    } else {
      list.unshift(exports.createDay(start));
      list.push(exports.createDay(end));
    }

    return list;
  };

  /**
   * Returns an array of weekdays based on the start date.
   * Will always return the 7 daysof that week regardless of
   * what the start date isbut they will be returned
   * in the order of their localized getDay function.
   *
   * @param {Date} startDate point of origin.
   * @return {Array} a list of dates in order of getDay().
   */
  exports.getWeeksDays = function(startDate) {
    //local day position
    var weeksDayStart = exports.getWeekStartDate(startDate);
    var result = [weeksDayStart];

    for (var i = 1; i < 7; i++) {
      result.push(new Date(
        weeksDayStart.getFullYear(),
        weeksDayStart.getMonth(),
        weeksDayStart.getDate() + i
      ));
    }

    return result;
  };

  /**
   * Checks if date is in the past
   *
   * @param {Date} date to check.
   * @return {Boolean} true when date is in the past.
   */
  exports.isPast = function(date) {
    return (date.valueOf() < exports.today.valueOf());
  };

  /**
   * Checks if date is in the future
   *
   * @param {Date} date to check.
   * @return {Boolean} true when date is in the future.
   */
  exports.isFuture = function(date) {
    return !exports.isPast(date);
  };

  /**
   * Based on the input date
   * will return one of the following states
   *
   *  past, present, future
   *
   * @param {Date} day for compare.
   * @param {Date} month comparison month.
   * @return {String} state.
   */
  exports.relativeState = function(day, month) {
    var states;

    // 1. the date is today (real time)
    if (exports.isToday(day)) {
      return exports.PRESENT;
    }

    // 2. the date is in the past (real time)
    if (exports.isPast(day)) {
      states = exports.PAST;
    // 3. the date is in the future (real time)
    } else {
      states = exports.FUTURE;
    }

    // 4. the date is not in the current month (relative time)
    if (day.getMonth() !== month.getMonth()) {
      states += ' ' + exports.OTHER_MONTH;
    }

    return states;
  };

  window.addEventListener('localized', function changeStartDay() {
    var startDay = navigator.mozL10n.get('weekStartsOnMonday');

    if (startDay && parseInt(startDay, 10)) {
      exports.startsOnMonday = true;
    } else {
      exports.startsOnMonday = false;
    }
  });

});
