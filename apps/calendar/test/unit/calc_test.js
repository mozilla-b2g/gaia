requireApp('calendar/test/unit/helper.js', function() {
  requireLib('calc.js');
});

//Worth noting that these tests will fail
//in horrible ways outside of US timezone.
suite('calendar/calc', function() {
  var subject, mocked = {};

  setup(function() {
    subject = Calendar.Calc;
  });

  teardown(function() {
    var key;
    for (key in mocked) {
      if (mocked.hasOwnProperty(key)) {
        subject[key] = mocked[key];
      }
    }
  });

  function mock(fn, value) {
    if (!(fn in mocked)) {
      mocked[fn] = subject[fn];
    }
    subject[fn] = function() {
      return value;
    };
  }

  suite('#getWeekStartDate', function() {
    // we are testing for first week of Aug 2012
    var expected = new Date(2012, 6, 29);

    function matches(given) {
      assert.equal(
        subject.getWeekStartDate(given).valueOf(),
        expected.valueOf()
      );
    }

    test('when given middle', function() {
      matches(new Date(2012, 7, 2));
    });

    test('when given start', function() {
      matches(new Date(2012, 6, 29));
    });

  });

  test('#daysBetween', function() {
    //Nov 29th 2012
    var start = new Date(2012, 10, 29);

    // Dec 2nd 2012
    var end = new Date(2012, 11, 2);

    var expected = [
      start,
      new Date(2012, 10, 30),
      new Date(2012, 11, 1),
      end
    ];

    assert.deepEqual(
      subject.daysBetween(start, end),
      expected
    );
  });

  suite('#getWeekEndDate', function() {
    // we are testing for first week of Aug 2012
    var expected = new Date(2012, 7, 4, 23, 59, 59, 999);

    function matches(given) {
      assert.equal(
        subject.getWeekEndDate(given).valueOf(),
        expected.valueOf()
      );
    }

    test('when given middle', function() {
      matches(new Date(2012, 7, 2));
    });

    test('when given start', function() {
      matches(new Date(2012, 6, 29));
    });
  });

  suite('#isSameDate', function() {

    test('same day', function() {
      assert.isTrue(subject.isSameDate(
        new Date(2012, 1, 1, 8),
        new Date(2012, 1, 1, 23)
      ));
    });

    test('same day different month', function() {
      assert.isFalse(subject.isSameDate(
        new Date(2012, 2, 1, 8),
        new Date(2012, 1, 1, 8)
      ));
    });
  });

  suite('#isToday', function() {
    test('when given is today', function() {
      var result = subject.isToday(new Date());

      assert.isTrue(result, 'should be true when given today');
    });

    test('when given is not today', function() {
      var now = new Date();
      now.setDate(now.getDate() - 1);
      var result = subject.isToday(now);

      assert.isFalse(result, 'should be false when given is not today');
    });
  });

  suite('#isPast', function() {
    test('when date is passed', function() {
      var date = new Date();
      date.setTime(Date.now() - 1000);
      var result = subject.isPast(date);

      assert.isTrue(result, 'should be true when given is in the past');
    });

    test('when given is in the future', function() {
      var date = new Date();
      date.setTime(Date.now() + 100);
      var result = subject.isPast(date);

      assert.isFalse(result, 'should return false when date is in the future');
    });

  });

  suite('#isFuture', function() {
    test('when date is passed', function() {
      var date = new Date();
      date.setTime(Date.now() - 100);
      var result = subject.isFuture(date);

      assert.isFalse(result);
    });

    test('when given is in the future', function() {
      var date = new Date(Date.now() + 100);
      var result = subject.isFuture(date);

      assert.isTrue(result);
    });

  });

  suite('#dateFromId', function() {
    var id,
        result,
        date = new Date(2012, 7, 3);

    suite('from day', function() {
      setup(function() {
        id = subject.getDayId(date);
      });

      test('id to date', function() {
        assert.deepEqual(
          subject.dateFromId(id),
          date
        );
      });
    });

    suite('from month', function() {
      setup(function() {
        id = subject.getMonthId(date);
      });

      test('id to date', function() {
        assert.deepEqual(
          subject.dateFromId(id),
          new Date(2012, 7, 1)
        );
      });
    });

  });

  suite('#getWeeksDays', function() {

    test('starting from monday', function() {
      //starts on thursday
      var start = new Date(2012, 10, 1);

      //expected days by their getDayId
      var expected = [
        'd-2012-9-28',
        'd-2012-9-29',
        'd-2012-9-30',
        'd-2012-9-31',
        'd-2012-10-1',
        'd-2012-10-2',
        'd-2012-10-3'
      ];

      var result = subject.getWeeksDays(start).map(
        subject.getDayId
      );

      assert.deepEqual(result, expected);

    });

  });

  test('#getDayId', function() {
    var result = subject.getDayId(
      new Date(2012, 3, 7)
    );

    assert.equal(result, 'd-2012-3-7');
  });

  test('#getMonthId', function() {
    var result = subject.getMonthId(
      new Date(2012, 3, 7)
    );

    assert.equal(result, 'm-2012-3');
  });

  suite('#relativeState', function() {

    setup(function() {
      mock('isToday', false);
    });

    test('when in the past', function() {
      mock('isPast', true);
      var state = subject.relativeState(
        new Date(1991, 1, 1),
        new Date(1991, 1, 1)
      );

      assert.equal(state, subject.PAST);
    });

    test('when in the future', function() {
      mock('isPast', false);
      var state = subject.relativeState(
        new Date(1991, subject.today.getMonth(), 1),
        new Date(1991, subject.today.getMonth(), 1)
      );
      assert.equal(state, subject.FUTURE);
    });

    test('when is in a different month in the past', function() {
      mock('isPast', true);

      var state = subject.relativeState(
        new Date(1991, subject.today.getMonth() - 1, 1),
        new Date(1991, subject.today.getMonth(), 1)
      );

      assert.include(state, subject.PAST);
      assert.include(state, subject.OTHER_MONTH);
    });

    test('when is in a different month in the future', function() {
      mock('isPast', false);

      var state = subject.relativeState(
        new Date(1991, subject.today.getMonth() + 1, 1),
        new Date(1991, subject.today.getMonth(), 1)
      );

      assert.include(state, subject.FUTURE);
      assert.include(state, subject.OTHER_MONTH);
    });


    test('when is today', function() {
      mock('isToday', true);
      var state = subject.relativeState(new Date(1991, 1, 1));

      assert.equal(state, subject.PRESENT);
    });

  });

});
