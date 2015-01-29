define(function(require, exports) {
'use strict';

var Timespan = require('timespan');

const SECOND = 1000;
const MINUTE = (SECOND * 60);
const HOUR = MINUTE * 60;

exports._hourDate = new Date();
exports.startDay = 0;
exports.FLOATING = 'floating';
exports.ALLDAY = 'allday';
exports.SECOND = SECOND;
exports.MINUTE = MINUTE;
exports.HOUR = HOUR;
exports.PAST = 'past';
exports.NEXT_MONTH = 'next-month';
exports.OTHER_MONTH = 'other-month';
exports.PRESENT = 'present';
exports.FUTURE = 'future';

Object.defineProperty(exports, 'today', {
  get: function() {
    return new Date();
  }
});

exports.getTimeL10nLabel = function(timeLabel) {
  return timeLabel + (navigator.mozHour12 ? '12' : '24');
};

exports.daysInWeek = function() {
  // XXX: We need to localize this...
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
 * Calculates day of week from startDay value
 * passed by the locale currently being used
 */
exports.dayOfWeekFromStartDay = function(numeric) {
  var day = numeric - exports.startDay;
  if (day < 0) {
    return 7 + day;
  }
  return day;
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
  return new Timespan(date, end);
};

/**
 * Creates timespan for a given month.
 * Starts at the first week that occurs
 * in the given month. Ends at the
 * last day, minute, second of given month.
 */
exports.spanOfMonth = function(month) {
  month = exports.monthStart(month);
  var startDay = exports.getWeekStartDate(month);
  var endDay = exports.monthEnd(month);
  endDay = exports.getWeekEndDate(endDay);
  return new Timespan(startDay, endDay);
};

exports.monthEnd = function(date, diff = 0) {
  var endDay = new Date(
    date.getFullYear(),
    date.getMonth() + diff + 1,
    1
  );
  endDay.setMilliseconds(-1);
  return endDay;
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
    year != null ? year : date.getFullYear(),
    month != null ? month : date.getMonth(),
    day != null ? day : date.getDate()
  );
};

exports.endOfDay = function(date) {
  var day = exports.createDay(date, date.getDate() + 1);
  day.setMilliseconds(-1);
  return day;
};

exports.monthStart = function(date, diff = 0) {
  return new Date(date.getFullYear(), date.getMonth() + diff, 1);
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
  return exports.dayOfWeekFromStartDay(number);
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
  if (start instanceof Timespan) {
    if (end) {
      includeTime = end;
    }

    end = new Date(start.end);
    start = new Date(start.start);
  }

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
      list.push(exports.createDay(start));
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
},

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
    result.push(exports.createDay(weeksDayStart, weeksDayStart.getDate() + i));
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
  //var today = exports.today;

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

/**
 * Computes the relative hour (0...23.9999) inside the given day.
 * If `date` is on a different day than `baseDate` it will return `0`.
 * Used by week view to compute the position of the busytimes relative to
 * the top of the view.
 */
exports.relativeOffset = function(baseDate, date) {
  if (exports.isSameDate(baseDate, date)) {
    return date.getHours() + (date.getMinutes() / 60);
  }
  // different day!
  return 0;
};

/**
 * Computes the relative duration between startDate and endDate inside
 * a given baseDate. Returns a number between 0 and 24.
 * Used by MultiDay view to compute the height of the busytimes relative to
 * the length inside the baseDate.
 */
exports.relativeDuration = function(baseDate, startDate, endDate) {
  if (!exports.isSameDate(startDate, endDate)) {
    if (exports.isSameDate(baseDate, startDate)) {
      endDate = exports.endOfDay(baseDate);
    } else if (exports.isSameDate(baseDate, endDate)) {
      startDate = exports.createDay(endDate);
    } else {
      // started before baseDate and ends on a different day
      return 24;
    }
  }
  return exports.hourDiff(startDate, endDate);
};

/**
 * Check if event spans thru the whole day.
 */
exports.isAllDay = function(baseDate, startDate, endDate) {
  // beginning reference point (start of given date)
  var refStart = exports.createDay(baseDate);
  var refEnd = exports.endOfDay(baseDate);

  var startBefore = startDate <= refStart;
  var endsAfter = endDate >= refEnd;

  // yahoo uses same start/end date for recurring all day events!!!
  return (startBefore && endsAfter) || Number(startDate) === Number(endDate);
};

window.addEventListener('localized', function changeStartDay() {
  exports.startDay = parseInt(navigator.mozL10n.get('firstDayOfTheWeek'), 10);
});

});
