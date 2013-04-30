requireLib('timespan.js');

suite('timespan', function() {

  var subject;
  var startDate;
  var endDate;

  setup(function() {
    startDate = new Date(2012, 1, 1);
    endDate = new Date(2012, 12, 1);

    subject = new Calendar.Timespan(
      startDate,
      endDate
    );
  });

  test('initializer', function() {
    assert.equal(
      subject.start,
      startDate.valueOf()
    );

    assert.equal(
      subject.end,
      endDate.valueOf()
    );
  });

  test('#isEqual', function() {
    var span = new Calendar.Timespan(
      new Date(2012, 1, 1),
      new Date(2012, 1, 5)
    );

    var eqlSpan = new Calendar.Timespan(
      new Date(2012, 1, 1),
      new Date(2012, 1, 5)
    );

    var notEqualSpan = new Calendar.Timespan(
      new Date(2012, 1, 1),
      new Date(2012, 1, 6)
    );

    assert.isTrue(span.isEqual(eqlSpan));
    assert.isFalse(span.isEqual(notEqualSpan));
  });

  test('#daysBetween', function() {
    var range = new Calendar.Timespan(
      new Date(2012, 1, 1),
      new Date(2012, 1, 3)
    );

    var dates = range.daysBetween();
    assert.deepEqual(
      dates[0],
      new Date(2012, 1, 1)
    );

    assert.deepEqual(
      dates[1],
      new Date(2012, 1, 2)
    );

    assert.deepEqual(
      dates[2],
      new Date(2012, 1, 3)
    );
  });

  suite('#trimOverlap', function() {
    var before;
    var subject;
    var none;

    setup(function() {
      none = new Calendar.Timespan(
        new Date(2012, 5, 1),
        new Date(2012, 5, 15)
      );

      before = new Calendar.Timespan(
        // July 1
        new Date(2012, 6, 1),
        // Aug 4th
        new Date(2012, 7, 4)
      );

      subject = new Calendar.Timespan(
        // July 29th
        new Date(2012, 6, 29),
        // Aug 31
        new Date(2012, 7, 31)
      );
    });

    test('middle', function() {
      var long = new Calendar.Timespan(
        new Date(2012, 0, 1),
        new Date(2012, 0, 31)
      );

      var short = new Calendar.Timespan(
        new Date(2012, 0, 5),
        new Date(2012, 0, 10)
      );

      assert.isNull(
        long.trimOverlap(short),
        'should return null subject contains given'
      );

      assert.isNull(
        short.trimOverlap(long),
        'should return null when given contains subject'
      );
    });

    test('no overlap', function() {
      var out = before.trimOverlap(none);
      assert.deepEqual(out, none);
    });

    test('overlaps && input.end > subject.start', function() {
      var output = subject.trimOverlap(
        before
      );

      var start = new Date(2012, 6, 1);
      var end = new Date(
        2012, 6, 29
      );

      end.setMilliseconds(-1);

      var expected = new Calendar.Timespan(
        start, end
      );

      assert.deepEqual(output, expected);
    });

    test('overlaps && subject.end > input.start', function() {
      var output = before.trimOverlap(
        subject
      );

      var start = new Date(2012, 7, 4);
      start.setMilliseconds(
        start.getMilliseconds() + 1
      );

      var end = new Date(
        2012, 7, 31
      );

      var expected = new Calendar.Timespan(
        start, end
      );

      assert.deepEqual(output, expected);
    });

  });

  suite('#overlaps', function() {
    var dates;

    suiteSetup(function() {
      dates = {
        'range: inside': {
          assert: true,
          value: new Calendar.Timespan(
            startDate,
            endDate
          )
        },

        'range: starts on end date': {
          assert: false,
          value: new Calendar.Timespan(
            endDate,
            new Date(2015, 1, 1)
          )
        },

        'range: outside before': {
          assert: false,
          value: new Calendar.Timespan(
            new Date(1991, 1, 1),
            new Date(2000, 1, 1)
          )
        },

        'range: outside after': {
          assert: false,
          value: new Calendar.Timespan(
            new Date(2015, 1, 1),
            new Date(2016, 1, 1)
          )
        },

        'range: greater': {
          assert: true,
          value: new Calendar.Timespan(
            new Date(2011, 12, 31),
            new Date(2012, 12, 2)
          )
        },

        'range overlap: start before': {
          assert: true,
          value: new Calendar.Timespan(
            new Date(2011, 1, 1),
            new Date(2012, 1, 15)
          )
        },

        'range overlap: end before': {
          assert: true,
          value: new Calendar.Timespan(
            new Date(2012, 1, 2),
            new Date(2012, 11, 12)
          )
        }
      };
    });

    test('overlaping times', function() {
      var key;
      var prefix = '';

      for (key in dates) {
        if (dates.hasOwnProperty(key)) {
          var value = dates[key].value;

          assert.equal(
            subject.overlaps(value),
            dates[key].assert,
            key
          );
        }
      }
    });

    test('overlaping times as dates', function() {
      var key;
      var prefix = '';

      for (key in dates) {
        if (dates.hasOwnProperty(key)) {
          var value = dates[key].value;
          var start = new Date(value.start);
          var end = new Date(value.end);

          assert.equal(
            subject.overlaps(start, end),
            dates[key].assert,
            key
          );
        }
      }
    });
  });

  suite('#contains', function() {
    var dates;

    suiteSetup(function() {
      dates = {
        'day of': {
          assert: true,
          value: new Date(2012, 1, 1)
        },

        'one day after': {
          assert: true,
          value: new Date(2012, 1, 2)
        },

        'day of end range': {
          assert: true,
          value: new Date(2012, 12, 1)
        },

        'day before range': {
          assert: false,
          value: new Date(2011, 12, 31)
        },

        'day after range': {
          assert: false,
          value: new Date(2012, 12, 2)
        }
      };
    });

    test('timespan in range', function() {
      var span = new Calendar.Timespan(
        new Date(2012, 1, 1),
        new Date(2012, 1, 5)
      );

      assert.isTrue(
        subject.contains(span)
      );

      assert.isFalse(
        span.contains(subject)
      );
    });

    function testWith(method, useNumeric) {
      var key;
      var prefix = '';

      if (useNumeric) {
        prefix += '[numeric] ';
      }

      prefix += method;

      for (key in dates) {
        if (dates.hasOwnProperty(key)) {
          var value = dates[key].value.valueOf();

          if (useNumeric) {
            value = value.valueOf();
          }

          assert.equal(
            subject.contains(value),
            dates[key].assert,
            prefix + key
          );
        }
      }
    }

    test('numeric (contains)', function() {
      testWith('contains', true);
    });

    test('numeric (containsNumeric)', function() {
      testWith('containsNumeric', true);
    });

    test('date', function() {
      testWith('contains', false);
    });
  });

});
