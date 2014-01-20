
'use strict';

// Return a balance string in format DD.XX or -- if balance is null
function formatBalance(balance) {
  var formattedBalance = '--';
  if (balance !== null) {
    var splitBalance = (balance.toFixed(2)).split('.');
    formattedBalance = '&i.&d'
      .replace('&i', splitBalance[0])
      .replace('&d', splitBalance[1]);
  }
  return formattedBalance;
}

// Format data using magnitude localization
// It exepcts a pair with the value and the unit
function formatData(dataArray) {
  return isNaN(dataArray[0]) ? '' :
                    _('magnitude', { value: dataArray[0], unit: dataArray[1] });
}

// Return a fixed point data value in KB/MB/GB
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

function getPositions(value) {
  if (parseInt(value) === value) {
    return 0;
  }
  if (value < 10) {
    return 2;
  }
  if (value < 100) {
    return 1;
  }
  return 0;
}

function smartRound(value) {
  var positions;
  if (value < 1000) {
    return [value.toFixed(getPositions(value)), _('B')];
  }

  if (value < 1000000) {
    var kbytes = value / 1000;
    return [kbytes.toFixed(getPositions(kbytes)), _('KB')];
  }

  if (value < 1000000000) {
    var mbytes = value / 1000000;
    return [mbytes.toFixed(getPositions(mbytes)), _('MB')];
  }

  var gbytes = value / 1000000000;
  return [gbytes.toFixed(getPositions(gbytes)), _('GB')];
}

// Return a padded data value in MG/GB
function padData(v) {
  var rounded = roundData(v, 0);
  var value = rounded[0];
  var len = value.length;
  switch (len) {
    case 1:
      value = '00' + value;
      break;
    case 2:
      value = '0' + value;
      break;
  }
  rounded[0] = parseInt(value, 10) ? value : '0';
  return rounded;
}

// Given the API information compute the human friendly minutes
function computeTelephonyMinutes(activity) {
  // Right now the activity for telephony is computed in milliseconds
  return Math.ceil(activity.calltime / 60000);
}

var Formatting = (function() {

  var MINUTE = 60 * 1000;
  var HOUR = 60 * MINUTE;
  var DAY = 24 * HOUR;
  function getDaysOfDifference(a, b) {
    return Math.floor((a.getTime() - b.getTime()) / DAY);
  }

  return {
    /*
     * Used with a Date and a format string, it is the same than using
     * `l10n.localeFormat()`.
     *
     * If format is not provided, default format is assumed to be:
     *   "Today|Yesterday|<WeekDay>, hh:mm"
     *
     */
    formatTime: function(timestamp, format) {
      if (!timestamp) {
        return _('never');
      }

      var now = new Date(), then = new Date(timestamp);
      var dateFormatter = new navigator.mozL10n.DateTimeFormat();
      if (format) {
        return dateFormatter.localeFormat(then, format);
      }

      var date, time;
      var daysOfDifference = getDaysOfDifference(now, then);
      if (daysOfDifference === 0) {
        date = _('today');

      } else if (daysOfDifference === 1) {
        date = _('yesterday');

      } else {
        date = dateFormatter.localeFormat(timestamp, '%a');
      }

      time = dateFormatter.localeFormat(timestamp, _('shortTimeFormat'));
      return _('day-hour-format', {
        day: date,
        time: time
      });
    },

    /*
     * Returns a human friendly string describing time transcurred since the
     * present moment to the timestamp passed as parameter in minutes or hours.
     *
     * If timestamps is yesterday or a day before yesterday, it is shown as
     * in `Formatting.formatTime()`
     */
    formatTimeSinceNow: function(timestamp) {
      var now = new Date(), then = new Date(timestamp);

      var formattedTime = this.formatTime(timestamp);
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
  };
}());
