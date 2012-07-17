'use strict';

// Based on Resig's pretty date
function prettyDate(time) {
  var date = new Date(time);
  var hours = date.getHours();
  var hoursStr = new String(hours);
  var minutes = date.getMinutes();
  var minutesStr = new String(minutes);
  var meridiem = 'AM';
  if (hours < 10) {
    hoursStr = '0' + hoursStr;
  } else if (hours >= 12) {
    meridiem = "PM";
    if (hours > 12) {
      hoursStr = new String(hours - 12);
    }
  } 
  if (minutes < 10) {
    minutesStr = '0' + minutesStr;
  }
  return (hoursStr + ':' + minutesStr + " " + meridiem);
}

function headerDate(time) {
  var diff = (Date.now() - time) / 1000;
  var day_diff = Math.floor(diff / 86400);
  if (isNaN(day_diff))
    return '(incorrect date)';

  if (day_diff < 0 || diff < 0) {
    return (new Date(time)).toLocaleFormat('%x %R');
  }
  return day_diff == 0 && 'Today' ||
    day_diff == 1 && 'Yesterday' ||
    day_diff < 4 && (new Date(time)).toLocaleFormat('%A') ||
    (new Date(time)).toLocaleFormat('%x');
}
