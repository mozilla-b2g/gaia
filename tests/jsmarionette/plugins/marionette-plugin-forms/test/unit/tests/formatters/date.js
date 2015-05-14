/* global assert */
'use strict';
suite('date formatter', function() {
  var format = require('../../../../lib/formatters/date');

  test('basic functionality', function() {
    var date = new Date();
    date.setYear(1997);
    date.setMonth(4);
    date.setDate(3);
    assert.equal(format(date), '1997-05-03');
  });
});
