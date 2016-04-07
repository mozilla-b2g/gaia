/**
 * parse-loose-time v1.0.0
 * https://github.com/millermedeiros/parse-loose-time/
 * released under the MIT License
 */
define(function(require, exports, module) {
'use strict';

// Release the ZALGO!
var numeric = /\d{1,2}[^\d]*(\d{2})?/i;
var oclock = /\d+.*o.*clock/i;
var british = /(half|quarter|\d+).*(to|past)[^\d]*\d{1,2}/i;
var knownWords = [
  'noon',
  'noontime',
  'midday',
  'half-day',
  'midnight'
];
// match "p" after digit for "pm"
var rPm = /\d\s*(o.*clock\s*)?p/i;

var checkKnowWords = {
  test: function(str) {
    return knownWords.indexOf(str) !== -1;
  }
};

var map = [
  [checkKnowWords, parseWords],
  [british, parseBritish],
  [oclock, parseOClock],
  [numeric, parseNumeric]
];

module.exports = parseTime;
function parseTime(time) {
  time = time.trim().toLowerCase();
  // node 0.12 don't support Array#find :/
  var fn;
  map.some(function(a) {
    if (a[0].test(time)) {
      fn = a[1];
      return true;
    }
  });
  return fn ? fn(time) : null;
}

function parseNumeric(str) {
  var hour;
  var minute;
  var num = extractNumbers(str);

  switch (num.length) {
    case 4:
      hour = num.slice(0, 2);
      minute = num.slice(2, 4);
      break;
    case 3:
      hour = num.slice(0, 1);
      minute = num.slice(1, 3);
      break;
    case 2:
    case 1:
      hour = num.slice(0, 2);
      minute = 0;
      break;
    default:
      return '';
  }

  hour = Number(hour);
  minute = Number(minute);

  if (num.length === 2 && hour > 24) {
    return null;
  }

  if (hour < 12 && str.match(rPm)) {
    hour += 12;
  }

  return {
    hour: Math.min(hour, 24),
    minute: Math.min(minute, 59)
  };
}

function extractNumbers(str) {
  return str.replace(/[^0-9]/g, '');
}

function parseOClock(str) {
  // yes, we will consider "1:23 o'clock" the same as "1 o'clock"
  var time = parseNumeric(str);
  if (!time) {
    return null;
  }
  time.minute = 0;
  return time;
}

function parseBritish(str) {
  // need to handle case where it is a custom numeric value
  var parts = str.match(/(.+)(to|past)(.+)/i);
  var time = parseNumeric(parts[3]);
  if (!time) {
    return null;
  }

  var diff;
  if (str.indexOf('quarter') !== -1) {
    diff = 15;
  } else if (str.indexOf('half') !== -1) {
    diff = 30;
  } else {
    diff = Number(extractNumbers(parts[1]));
  }

  var isTo = str.indexOf('to') !== -1;
  if (isTo) {
    time.hour -= 1;
    time.minute = 60 - diff;
  } else {
    time.minute = diff;
  }

  return time;
}

function parseWords(str) {
  if (str === 'midnight') {
    return { hour: 0, minute: 0 };
  }
  return { hour: 12, minute: 0 };
}
});
