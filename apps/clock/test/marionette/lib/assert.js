var nodeAssert = require('assert');

// The exported function proxies to Node.js's `assert` function.
function assert() {
  return nodeAssert.apply(this, arguments);
}

module.exports = assert;

// Copy methods from the Node.js assert module
Object.keys(nodeAssert).forEach(function(key) {
  assert[key] = nodeAssert[key];
});

// Determine if the provided string contains a representation of the provided
// time in some form.
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

  var timeRe = new RegExp([
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

assert.hasDuration = function(str, ms, usrMsg) {
  var match = str.match(/(?:([0-9]+):)?([0-9]+):([0-9]+)(?:[:.]([0-9]+))?/);
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

  time = (match[1] || 0) * 60 * 1000 * 1000 +
    match[2] * 1000 * 1000 +
    match[3] * 1000 +
    (match[4] || 0);

  if (Array.isArray(ms)) {
    nodeAssert(
      time >= ms[0] && time <= ms[1],
      usrMsg + 'expected "' + str + '" to have a duration between ' + ms[0] +
        'ms and ' + ms[1] + 'ms'
    );
  } else {
    nodeAssert(
      time === ms,
      usrMsg + 'expected "' + str + '" to have duration of ' + ms + 'ms'
    );
  }
};
