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
    hours12 = hours;
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
