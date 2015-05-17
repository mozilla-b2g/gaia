/* global assert */
'use strict';
suite('time formatter', function() {
  var format = require('../../../../lib/formatters/time');

  test('basic functionality', function() {
    var time = new Date();
    time.setHours(3, 2, 1);
    assert.equal(format(time), '03:02:01');
  });
});
