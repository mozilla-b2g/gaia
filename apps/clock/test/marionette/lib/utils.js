'use strict';

var assert = require('assert');

/**
 * Extract a duration from any point in the given string. See the
 * inline assertions below for expected usage.
 *
 * @return Duration found in milliseconds, or null if none found.
 */
exports.extractDuration = function(str) {
  var match = /(?:(\d+):)?(\d+):(\d+)(?:[:.](\d)?(\d)?(\d)?)?/i.exec(str);
  if (!match) { return null; }
  var factors = [60 * 60 * 1000, 60 * 1000, 1000, 100, 10, 1];
  return match.slice(1).reduce(function(sum, value, i) {
    return sum + ((value || 0) * factors[i]);
  }, 0);
};

assert.equal(exports.extractDuration('It took 0:00:00.000'), 0);
assert.equal(exports.extractDuration('It took 00:00.1'), 100);
assert.equal(exports.extractDuration('It took 1:00:00.010'), 3600010);
assert.equal(exports.extractDuration('It took 1:05:10.050'), 3910050);
assert.equal(exports.extractDuration('It took 30:22:22.55'), 109342550);

/**
 * Extract a time from any point in the given string. See the inline
 * assertions below for expected usage.
 *
 * @return An object with { hours: N, minutes: N } in 24-hour format.
 */
function extractTime(str) {
  var match = /\b([0-9]+):([0-9]+)\s*(am|pm|a\.m\.|p\.m\.)?/i.exec(str);
  var hr = parseInt(match[1], 10);
  var min = parseInt(match[2], 10);
  var hasAmPm = !!match[3];
  if (hasAmPm && /p/i.test(match[3])) {
    if (hr < 12) {
      hr += 12;
    }
  } else {
    if (hr === 12) {
      hr = 0;
    }
  }
  return { hours: hr, minutes: min, hasAmPm: hasAmPm };
}

exports.assertStringContainsTime = function(str, date) {
  var time = extractTime(str);
  if (time.hasAmPm) {
    assert.equal(time.hours, date.getHours());
  } else {
    assert.equal(time.hours % 12, date.getHours() % 12);
  }
  assert.equal(time.minutes, date.getMinutes());
};

exports.stringContainsTime = function(str, date) {
  try {
    exports.assertStringContainsTime(str, date);
    return true;
  } catch (e) {
    return false;
  }
};

assert.deepEqual(extractTime('It is 12:30 PM.'),
                 { hours: 12, minutes: 30, hasAmPm: true });
assert.deepEqual(extractTime('It is 12:30 AM.'),
                 { hours: 0, minutes: 30, hasAmPm: true });
assert.deepEqual(extractTime('It is 15:22.'),
                 { hours: 15, minutes: 22, hasAmPm: false });
assert.deepEqual(extractTime('It is 0:00.'),
                 { hours: 0, minutes: 0, hasAmPm: false });
assert.deepEqual(extractTime('It is 6:00 p.m..'),
                 { hours: 18, minutes: 0, hasAmPm: true });
