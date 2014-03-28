'use strict';
var nodeAssert = require('assert');

// The exported function proxies to Node.js's `assert` function.
var assert = function() {
  return nodeAssert.apply(this, arguments);
};

module.exports = assert;

// Copy methods from the Node.js assert module
Object.keys(nodeAssert).forEach(function(key) {
  assert[key] = nodeAssert[key];
});

var durationRe = new RegExp([
  // Hours (optional)
  '(?:([0-9]+):)?',
  // Minutes
  '([0-9]+):',
  // Seconds
  '([0-9]+)',
  // Milliseconds (optional);
  '(?:[:.]([0-9]{2}))?'
].join(''));

/**
 * Assert the presence of a given time within a given string.
 *
 * Given the time 1:30 PM, the following strings would be accepted:
 *
 * - It is 13:30.
 * - The time is now 01:30 pm.
 * - At 1:30P.M. we will have a party.
 *
 * @param {String} str - The string to test.
 * @param {Date} date - The time expected.
 * @param {String} usrMsg - Message to display on failure.
 */
assert.hasTime = function(str, date, usrMsg) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var msg = 'expected "' + str + '" to have time ' + date.toString();
  var meridian, timeRe, hours12;

  if (hours > 12) {
    hours12 = hours - 12;
    meridian = 'P';
  } else {
    hours12 = hours === 0 ? 12 : hours;
    meridian = 'A';
  }

  hours = (hours < 10 ? '0?' : '') + hours;
  hours12 = (hours12 < 10 ? '0?' : '') + hours12;
  minutes = (minutes < 10 ? '0' : '') + minutes;
  meridian = meridian + '\\.?M\\.?';

  timeRe = new RegExp([
    '\\b(',
      hours12, '\\s*:\\s*', minutes, '\\s*', meridian,
      '|',
      hours, '\\s*:\\s*', minutes, '\\s*',
    ')\\b'
    ].join(''),
    'i'
  );

  if (usrMsg) {
    msg = usrMsg + ': ' + msg;
  }

  nodeAssert(timeRe.test(str), msg);
};

/*
 * Assert the presence of a given duration within a given string.
 *
 * Given the duration 1002345, the following strings would be accepted:
 *
 * - Only 01:02 remaining!
 * - In 1:02:34 we will dine.
 *
 * @param {String} str - The string to test.
 * @param {Number|Object} ms - The expected duration in milliseconds. If an
 *                             object, the `upper` and `lower` attributes will
 *                             be used as bounds on the accepted duration
 *                             (inclusive).
 * @param {String} [usrMsg] - Message to display on failure.
 */
assert.hasDuration = function(str, ms, usrMsg) {
  var match = str.match(durationRe);
  var time;

  if (usrMsg) {
    usrMsg += ': ';
  } else {
    usrMsg = '';
  }

  nodeAssert(
    !!match,
    usrMsg + 'expected "' + str + '" to contain a duration string'
  );

  time = (match[1] || 0) * 60 * 60 * 1000 +
    match[2] * 60 * 1000 +
    match[3] * 1000 +
    (match[4] || 0) * 10;

  if (typeof ms !== 'number') {
    nodeAssert(
      time >= ms.lower && time <= ms.upper,
      usrMsg + 'expected "' + str + '" to have a duration between ' +
        ms.lower + 'ms and ' + ms.upper + 'ms'
    );
  } else {
    nodeAssert(
      time === ms,
      usrMsg + 'expected "' + str + '" to have duration of ' + ms + 'ms'
    );
  }
};
