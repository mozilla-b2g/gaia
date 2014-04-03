/* global _ */
/* exported Formatting */
'use strict';

var Formatting = (function() {

  var MINUTE = 60 * 1000;
  var HOUR = 60 * MINUTE;
  var DAY = 24 * HOUR;

  function getDaysOfDifference(a, b) {
    return Math.floor((a.getTime() - b.getTime()) / DAY);
  }

  function getFormattedDate(timestamp, format) {
    var dateFormatter = new window.navigator.mozL10n.DateTimeFormat();
    var formatted = dateFormatter.localeFormat(timestamp, format);
    return formatted;
  }

  function formatTime(timestamp, format) {
    if (!timestamp) {
      return _('never');
    }

    var now = new Date(), then = new Date(timestamp);
    if (format) {
      return getFormattedDate(then, format);
    }

    var date, time;
    var daysOfDifference = getDaysOfDifference(now, then);
    if (daysOfDifference === 0) {
      date = _('today');

    } else if (daysOfDifference === 1) {
      date = _('yesterday');

    } else {
      date = getFormattedDate(timestamp, '%a');
    }

    time = getFormattedDate(timestamp, _('shortTimeFormat'));
    return _('day-hour-format', {
      day: date,
      time: time
    });
  }

  function formatTimeSinceNow(timestamp) {
    var now = new Date(), then = new Date(timestamp);

    var formattedTime = formatTime(timestamp);
    if (getDaysOfDifference(now, then) > 0) {
      return formattedTime;
    }

    var age = now - then;
    if (age < MINUTE) {
      formattedTime = _('minutes-ago-short', { value: 0 });

    } else if (age < HOUR) {
      var minutes = Math.floor(age / MINUTE);
      formattedTime = _('minutes-ago-short', { value: minutes });

    } else if (age < DAY) {
      var hours = Math.floor(age / HOUR);
      formattedTime = _('hours-ago-short', { value: hours });
    }
    return formattedTime;
  }

  function formatData(dataArray) {
    return isNaN(dataArray[0]) ? '' :
           _('magnitude', { value: dataArray[0], unit: dataArray[1] });
  }

  function roundData(value, positions) {
    positions = (typeof positions === 'undefined') ? 2 : positions;
    if (value < 1000) {
      return [value.toFixed(positions), _('B')];
    }

    if (value < 1000000) {
      return [(value / 1000).toFixed(positions), _('KB')];
    }

    if (value < 1000000000) {
      return [(value / 1000000).toFixed(positions), _('MB')];
    }

    return [(value / 1000000000).toFixed(positions), _('GB')];
  }

  function getPositions(value, deltaPositions) {
    deltaPositions = (typeof deltaPositions === 'undefined') ? 0 :
                                                               deltaPositions;

    if (parseInt(value) === value) {
      return 0;
    }
    if (value < 10) {
      return 2 + deltaPositions;
    }
    if (value < 100) {
      return 1 + deltaPositions;
    }
    return 0;
  }

  function smartRound(value, deltaPositions) {
    deltaPositions = (typeof deltaPositions === 'undefined') ? 0 :
                                                               deltaPositions;
    if (value < 1000) {
      var bPositions = getPositions(value, deltaPositions);
      return [value.toFixed(bPositions), _('B')];
    }

    if (value < 1000000) {
      var kbytes = value / 1000;
      var kbPositions = getPositions(kbytes, deltaPositions);
      return [kbytes.toFixed(kbPositions), _('KB')];
    }

    if (value < 1000000000) {
      var mbytes = value / 1000000;
      var mPositions = getPositions(mbytes, deltaPositions);
      return [mbytes.toFixed(mPositions), _('MB')];
    }

    var gbytes = value / 1000000000;
    var gPositions = getPositions(gbytes, deltaPositions);
    return [gbytes.toFixed(gPositions), _('GB')];
  }

  function formatTimeHTML(timestampA, timestampB) {
    function timeElement(content) {
      var time = document.createElement('time');
      time.textContent = content;
      return time;
    }

    var fragment = document.createDocumentFragment();

    // No interval
    if (typeof timestampB === 'undefined') {
      fragment.appendChild(timeElement(Formatting.formatTime(timestampA)));
      return fragment;
    }

    // Same day case
    var dateA = new Date(timestampA);
    var dateB = new Date(timestampB);
    if (dateA.getFullYear() === dateB.getFullYear() &&
        dateA.getMonth() === dateB.getMonth() &&
        dateA.getDay() === dateB.getDay()) {

      return formatTimeHTML(timestampB);
    }

    // Interval
    fragment.appendChild(
      timeElement(Formatting.formatTime(timestampA, _('short-date-format')))
    );
    fragment.appendChild(document.createTextNode(' – '));
    fragment.appendChild(timeElement(Formatting.formatTime(timestampB)));
    return fragment;
  }

  function computeTelephonyMinutes(activity) {
    // Right now the activity for telephony is computed in milliseconds
    return Math.ceil(activity.calltime / 60000);
  }
  return {
    getFormattedDate: getFormattedDate,
    /*
     * Used with a Date and a format string, it is the same than using
     * `l10n.localeFormat()`.
     *
     * If format is not provided, default format is assumed to be:
     *   "Today|Yesterday|<WeekDay>, hh:mm"
     *
     */
    formatTime: formatTime,

    /*
     * Returns a human friendly string describing time transcurred since the
     * present moment to the timestamp passed as parameter in minutes or hours.
     *
     * If timestamps is yesterday or a day before yesterday, it is shown as
     * in `Formatting.formatTime()`
     */
    formatTimeSinceNow: formatTimeSinceNow,

    // Format data using magnitude localization
    // It exepcts a pair with the value and the unit
    formatData: formatData,

    // Return a fixed point data value in KB/MB/GB
    roundData: roundData,

    getPositions: getPositions,

    smartRound: smartRound,

    formatTimeHTML: formatTimeHTML,

    // Given the API information compute the human friendly minutes
    computeTelephonyMinutes: computeTelephonyMinutes
  };
}());
