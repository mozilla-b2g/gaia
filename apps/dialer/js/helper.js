'use strict';

function profilePictureForNumber(number) {
  if (typeof(number) == 'string')
    number = parseInt(number.replace(/[^0-9]/g, ''));

  var image = '../contacts/contact' + (number % 10) + '.png';
  return '<img src="' + image + '" alt="profile picture" />';
}

// Based on Resig's pretty date
function prettyDate(time) {
  var diff = (Date.now() - time) / 1000;
  var day_diff = Math.floor(diff / 86400);

  if (isNaN(day_diff))
    return '(incorrect date)';

  if (day_diff < 0 || diff < 0) {
    // future time
    return (new Date(time)).toLocaleFormat('%x %R');
  }

  return day_diff == 0 && (
    diff < 60 && 'Just Now' ||
    diff < 120 && '1 Minute Ago' ||
    diff < 3600 && Math.floor(diff / 60) + ' Minutes Ago' ||
    diff < 7200 && '1 Hour Ago' ||
    diff < 86400 && Math.floor(diff / 3600) + ' Hours Ago') ||
    day_diff == 1 && 'Yesterday' ||
    day_diff < 7 && (new Date(time)).toLocaleFormat('%A') ||
    (new Date(time)).toLocaleFormat('%x');
}

setInterval(
  function updatePrettyDate() {
    var labels = document.querySelectorAll('[data-time]');
    var i = labels.length;
    while(i--) {
      labels[i].textContent = prettyDate(labels[i].dataset.time);
    }
  },
  60*1000
);
