'use strict';

function escapeHTML(str, escapeQuotes) {
  var span = document.createElement('span');
  span.textContent = str;

  if (escapeQuotes)
    return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  return span.innerHTML;
}

function summarizeDaysOfWeek(bitStr) {
  if (bitStr == '')
    return 'None';

  var _ = navigator.mozL10n.get;

  // Formate bits: 0123456(0000000)
  // Case: Everyday:  1111111
  // Case: Weekdays:  1111100
  // Case: Weekends:  0000011
  // Case: Never:     0000000
  // Case: Specific:  other case  (Mon, Tue, Thu)

  var summary = '';
  switch (bitStr)
  {
  case '1111111':
    summary = _('everyday');
    break;
  case '1111100':
    summary = _('weekdays');
    break;
  case '0000011':
    summary = _('weekends');
    break;
  case '0000000':
    summary = _('never');
    break;
  default:
    var weekdays = [];
    for (var i = 0; i < bitStr.length; i++) {
      if (bitStr.substr(i, 1) == '1') {
        weekdays.push(_('dayofweek-' + i + '-abbr'));
      }
    }
    summary = weekdays.join(', ');
  }
  return summary;
}

function getNextAlarmFireTime(alarm) { // get the next alarm fire time
  var repeat = alarm.repeat;
  var hour = alarm.hour;
  var minute = alarm.minute;
  var now = new Date();
  var nextAlarmFireTime = new Date();
  var diffDays = 0; // calculate the diff days from now
  if (repeat == '0000000') { // one time only and alarm within 24 hours
      // if alarm has passed already
      // XXX compare the hour after converted it to format 24-hours
      if (!(hour >= now.getHours() && minute > now.getMinutes()))
        diffDays = 1; // alarm tomorrow

      nextAlarmFireTime.setDate(nextAlarmFireTime.getDate() + diffDays);
      nextAlarmFireTime.setHours(hour);
      nextAlarmFireTime.setMinutes(minute);
      nextAlarmFireTime.setSeconds(0, 0);
      return nextAlarmFireTime;
  }
  // find out the first alarm day from the repeat info.
  var weekDayFormatRepeat =
    repeat.slice(-1).concat(repeat.slice(0, repeat.length - 1));
  var weekDayOfToday = now.getDay();
  var index = 0;
  for (var i = 0; i < weekDayFormatRepeat.length; i++) {
    index = (i + weekDayOfToday) % 7;
    if (weekDayFormatRepeat.charAt(index) == '1') {
      if (diffDays == 0) { // if alarm has passed already
        if (hour >= now.getHours() && minute > now.getMinutes()) {
          break;
        } else {
          diffDays++;
          continue;
        }
      }
      break;
    }
    diffDays++;
  }
  nextAlarmFireTime.setDate(nextAlarmFireTime.getDate() + diffDays);
  nextAlarmFireTime.setHours(hour);
  nextAlarmFireTime.setMinutes(minute);
  nextAlarmFireTime.setSeconds(0, 0);
  return nextAlarmFireTime;
}
