(function(exports) {
'use strict';

var Utils = {};

Utils.escapeHTML = function(str, escapeQuotes) {
  var span = document.createElement('span');
  span.textContent = str;

  if (escapeQuotes)
    return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  return span.innerHTML;
};

Utils.summarizeDaysOfWeek = function(repeat) {
  var _ = navigator.mozL10n.get;
  // Build a bitset
  var value = 0;
  for (var i = 0; i < DAYS.length; i++) {
    var dayName = DAYS[i];
    if (repeat[dayName] === true) {
      value |= (1 << i);
    }
  }
  var summary;
  if (value === 127) { // 127 = 0b1111111
    summary = _('everyday');
  } else if (value === 31) { // 31 = 0b0011111
    summary = _('weekdays');
  } else if (value === 96) { // 96 = 0b1100000
    summary = _('weekends');
  } else if (value !== 0) { // any day was true
    var weekdays = [];
    for (var i = 0; i < DAYS.length; i++) {
      var dayName = DAYS[i];
      if (repeat[dayName]) {
        // Note: here, Monday is the first day of the week
        // whereas in JS Date(), it's Sunday -- hence the (+1) here.
        weekdays.push(_('weekday-' + ((i + 1) % 7) + '-short'));
      }
      summary = weekdays.join(', ');
    }
  } else { // no day was true
    summary = _('never');
  }
  return summary;
};

Utils.isEmptyRepeat = function(repeat) {
  for (var i in repeat) {
    if (repeat[i] === true) {
      return false;
    }
  }
  return true;
};

Utils.is12hFormat = function() {
  var localeTimeFormat = navigator.mozL10n.get('dateTimeFormat_%X');
  var is12h = (localeTimeFormat.indexOf('%p') >= 0);
  return is12h;
};

Utils.getLocaleTime = function(d) {
  var f = new navigator.mozL10n.DateTimeFormat();
  var is12h = Utils.is12hFormat();
  return {
    t: f.localeFormat(d, (is12h ? '%I:%M' : '%H:%M')).replace(/^0/, ''),
    p: is12h ? f.localeFormat(d, '%p') : ''
  };
};

// check alarm has passed or not
Utils.isAlarmPassToday = function(hour, minute) {
  var now = new Date();
  if (hour > now.getHours() ||
      (hour == now.getHours() && minute > now.getMinutes())) {
    return false;
  }
  return true;
};

// get the next alarm fire time
Utils.isDateInRepeat = function alarm_isDateInRepeat(repeat, date) {
  // return true if repeat contains date
  var day = DAYS[(date.getDay() + 6) % 7];
  return !!repeat[day];
};

Utils.repeatDays = function alarm_repeatDays(repeat) {
  var count = 0;
  for (var i in repeat) {
    if (repeat[i]) {
      count++;
    }
  }
  return count;
};

Utils.getNextAlarmFireTime = function(alarm) {
  var now = new Date(), next = new Date();
  next.setHours(alarm.hour, alarm.minute, 0, 0);
  while (next < now ||
          !(Utils.repeatDays(alarm.repeat) === 0 ||
            Utils.isDateInRepeat(alarm.repeat, next))) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

Utils.changeSelectByValue = function(selectElement, value) {
  var options = selectElement.options;
  for (var i = 0; i < options.length; i++) {
    if (options[i].value == value) {
      if (selectElement.selectedIndex != i) {
        selectElement.selectedIndex = i;
      }
      break;
    }
  }
};

Utils.getSelectedValue = function(selectElement) {
  return selectElement.options[selectElement.selectedIndex].value;
};

Utils.formatTime = function(hour, minute) {
  var period = '';
  if (Utils.is12hFormat()) {
    period = hour < 12 ? 'AM' : 'PM';
    hour = hour % 12;
    hour = (hour == 0) ? 12 : hour;
  }

  if (hour == 0) {
    hour = '00';
  }

  if (minute < 10) {
    minute = '0' + minute;
  }

  return hour + ':' + minute + period;
};

Utils.parseTime = function(time) {
  var parsed = time.split(':');
  var hour = +parsed[0]; // cast hour to int, but not minute yet
  var minute = parsed[1];

  // account for 'AM' or 'PM' vs 24 hour clock
  var periodIndex = minute.indexOf('M') - 1;
  if (periodIndex >= 0) {
    hour = (hour == 12) ? 0 : hour;
    hour += (minute.slice(periodIndex) == 'PM') ? 12 : 0;
    minute = minute.slice(0, periodIndex);
  }

  return {
    hour: hour,
    minute: +minute // now cast minute to int
  };
};

exports.Utils = Utils;

}(this));
