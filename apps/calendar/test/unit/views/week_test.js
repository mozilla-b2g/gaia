define(function(require) {
'use strict';

var Calc = require('common/calc');
var Week = require('views/week');

suite('Views.Week', function() {
  var subject;

  setup(function() {
    subject = new Week();
  });

  suite('#_calcBaseDate', function() {
    test('Get same date if equal to base date', function() {
      var date = new Date(1983, 8, 8);
      subject.baseDate = date;
      var baseDate = subject._calcBaseDate(date);
      assert.isTrue(Calc.isSameDate(baseDate, date));
    });

    test('Get same date if it is Saturday', function() {
      // It is Saturday.
      var date = new Date(1983, 8, 10);
      var baseDate = subject._calcBaseDate(date);
      assert.isTrue(Calc.isSameDate(baseDate, date));
    });

    test('Get same date if it is Sunday', function() {
      // It is Sunday.
      var date = new Date(1983, 8, 11);
      var baseDate = subject._calcBaseDate(date);
      assert.isTrue(Calc.isSameDate(baseDate, date));
    });

    test('Get monday if date is between Mon to Fri', function() {
      // It is Thursday.
      var date = new Date(1983, 8, 8);
      var baseDate = subject._calcBaseDate(date);
      assert.equal(baseDate.getDay(), 1);
    });
  });
});

});

