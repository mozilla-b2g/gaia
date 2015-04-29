define(function(require) {
'use strict';

var Timespan = require('common/timespan');
var Calc = require('common/calc');

//Worth noting that these tests will fail
//in horrible ways outside of US timezone.
suite('calendar/calc', function() {
  var subject, mocked = {};

  setup(function() {
    subject = Calc;
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

  suite('#isOnlyDate', function() {
    function verify(date, message, isTrue=true) {
      test(message + ' ' + date.toString() + ' === ' + isTrue, function() {
        assert.equal(
          subject.isOnlyDate(date),
          isTrue,
          message
        );
      });
    }

    verify(new Date(2012, 1), 'month');

    verify(
      new Date(2012, 1, 1),
      'YYYY:DD:MM'
    );

    verify(
      new Date(2012, 1, 1, 1),
      'hour',
      false
    );

    verify(
      new Date(2012, 1, 1, 0, 1),
      'minute',
      false
    );

    verify(
      new Date(2012, 1, 1, 0, 0, 1),
      'second',
      false
    );

  });

  suite('#dayOfWeekFromStartDay', function() {
    test('sunday', function() {
      subject.startDay = 0;

      var expected = [
        ['sun', 0, 0],
        ['mon', 1, 1],
        ['tue', 2, 2],
        ['wed', 3, 3],
        ['thu', 4, 4],
        ['fri', 5, 5],
        ['sat', 6, 6]
      ];

      expected.forEach(function(line) {
        var [name, date, numeric] = line;
        assert.equal(
          subject.dayOfWeekFromStartDay(date),
          numeric,
          name
        );
      });
    });

    test('Monday', function() {
      subject.startDay = 1;

      var expected = [
        ['mon', 1, 0],
        ['tue', 2, 1],
        ['wed', 3, 2],
        ['thu', 4, 3],
        ['fri', 5, 4],
        ['sat', 6, 5],
        ['sun', 0, 6]
      ];

      expected.forEach(function(line) {
        var [name, date, numeric] = line;
        assert.equal(
          subject.dayOfWeekFromStartDay(date),
          numeric,
          name
        );
      });
    });

    test('Saturday', function() {
      subject.startDay = 6;

      var expected = [
        ['sat', 6, 0],
        ['sun', 0, 1],
        ['mon', 1, 2],
        ['tue', 2, 3],
        ['wed', 3, 4],
        ['thu', 4, 5],
        ['fri', 5, 6]
      ];

      expected.forEach(function(line) {
        var [name, date, numeric] = line;
        assert.equal(
          subject.dayOfWeekFromStartDay(date),
          numeric,
          name
        );
      });
    });
  });

  test('#dayOfWeekFromMonday', function() {
    var expected = [
      ['mon', 1, 0],
      ['tue', 2, 1],
      ['wed', 3, 2],
      ['thu', 4, 3],
      ['fri', 5, 4],
      ['sat', 6, 5],
      ['sun', 0, 6]
    ];

    expected.forEach(function(line) {
      var [name, date, numeric] = line;
      assert.equal(
        subject.dayOfWeekFromMonday(date),
        numeric,
        name
      );
    });
  });

  suite('#dayOfWeek', function() {
    var realStartDay;
    var date = new Date(2012, 0, 1); // 2012-01-01 is a Sunday

    suiteSetup(function() {
      realStartDay = subject.startDay;
    });

    suiteTeardown(function() {
      subject.startDay = realStartDay;
    });

    test('weekStartDay = 0', function() {
      subject.startDay = 0; // week starts on Sunday => Sunday is day 0
      assert.equal(
        subject.dayOfWeek(date),
        0
      );
    });

    test('weekStartDay = 1', function() {
      subject.startDay = 1; // week starts on Monday => Sunday is day 6
      assert.equal(
        subject.dayOfWeek(date),
        6
      );
    });

    test('weekStartDay = 6', function() {
      subject.startDay = 6; // week starts on Saturday => Sunday is day 1
      assert.equal(
        subject.dayOfWeek(date),
        1
      );
    });
  });

  suite('handle localization events', function() {
    var reaL10n;
    var firstDayOfTheWeek = 0;

    suiteSetup(function() {
      reaL10n = navigator.mozL10n;
      navigator.mozL10n = {
        get: function(name) {
          if (name === 'firstDayOfTheWeek') {
            return firstDayOfTheWeek;
          }
          return reaL10n.get.apply(this, arguments);
        }
      };
    });

    suiteTeardown(function() {
      navigator.mozL10n = reaL10n;
    });

    test('firstDayOfTheWeek = 1', function() {
      firstDayOfTheWeek = 1;
      window.dispatchEvent(new window.Event('localized'));
      assert.equal(subject.startDay, 1, 'week starts on Monday');
    });

    test('firstDayOfTheWeek = 6', function() {
      firstDayOfTheWeek = 6;
      window.dispatchEvent(new window.Event('localized'));
      assert.equal(subject.startDay, 6, 'week starts on Saturday');
    });

    test('firstDayOfTheWeek = 0', function() {
      firstDayOfTheWeek = 0;
      window.dispatchEvent(new window.Event('localized'));
      assert.equal(subject.startDay, 0, 'week starts on Sunday');
    });
  });

  suite('#spanOfMonth', function() {

    function time(year, month, day, hour, min) {
      var date = new Date(
        year,
        month || 0,
        day || 1,
        hour || 0,
        min || 0
      );
      return v(date);
    }

    function v(date) {
      return date.valueOf();
    }

    test('5 week month', function() {
      var date = new Date(2012, 3, 1, 5, 1);
      var range = subject.spanOfMonth(date);

      assert.equal(
        time(2012, 3, 1),
        range.start
      );

      var end = new Date(2012, 4, 6);
      end.setMilliseconds(-1);

      assert.equal(
        range.end,
        v(end)
      );

    });

    test('6 week month', function() {
      var date = new Date(2012, 11, 1);
      var range = subject.spanOfMonth(date);

      assert.equal(
        time(2012, 10, 25),
        range.start
      );

      var end = new Date(2013, 0, 6);
      end.setMilliseconds(-1);

      assert.equal(
        range.end,
        v(end)
      );
    });

    test('4 week month', function() {
      var date = new Date(2009, 1, 1);
      var range = subject.spanOfMonth(date);

      var end = new Date(2009, 2, 1);
      end.setMilliseconds(-1);

      assert.equal(
        range.end,
        v(end)
      );
    });

  });

  suite('#dateToTransport', function() {

    test('ICAL date', function() {
      var date = new Date(2012, 0, 1, 11);
      var utc = Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
      );

      var expected = {
        tzid: subject.FLOATING,
        utc: utc,
        offset: 0,
        isDate: true
      };

      assert.deepEqual(
        subject.dateToTransport(date, null, true),
        expected
      );
    });

    test('floating tz', function() {
      var date = new Date(2012, 0, 1, 11, 1, 7);
      var utc = Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
      );

      var expected = {
        tzid: subject.FLOATING,
        utc: utc,
        offset: 0
      };

      assert.deepEqual(
        subject.dateToTransport(date, subject.FLOATING),
        expected
      );
    });

    test('utc', function() {
      var date = new Date(2012, 0, 1, 11, 1);
      var utc = Date.UTC(2012, 0, 1, 11, 1);
      var offset = utc - date;

      var expected = {
        offset: offset,
        utc: utc
      };

      assert.deepEqual(
        subject.dateToTransport(date),
        expected
      );
    });
  });

  suite('#getUTC', function() {
    test('utc - conversion', function() {
      var date = new Date(2012, 9, 1, 7, 11);

      assert.notEqual(
        date,
        subject.getUTC(date)
      );
    });
  });

  suite('#dateFromTransport', function() {

    test('utc - DST', function() {
      // NOTE: I don't expect this test to fail
      //       in other timezones but it relies on
      //       hard coded DST info to verify that DST
      //       actually works in PST.

      var date = new Date(2012, 9, 1, 7, 11);
      var data = subject.dateToTransport(date);

      assert.deepEqual(
        subject.dateFromTransport(data),
        date
      );
    });

    test('utc - standard', function() {
      var expected = new Date(2012, 0, 1, 0, 5);
      var data = subject.dateToTransport(expected);

      assert.deepEqual(
        subject.dateFromTransport(data),
        expected
      );
    });

    test('floating', function() {
      var expected = new Date(2012, 0, 8, 9, 10);

      var data = subject.dateToTransport(
        expected, subject.FLOATING
      );

      assert.deepEqual(
        subject.dateFromTransport(data),
        expected
      );
    });
  });

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

  suite('#spanOfDay', function() {

    var date = new Date(2012, 1, 1, 10, 33);

    test('include time', function() {
      var end = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + 1
      );

      var out = subject.spanOfDay(date, true);

      assert.deepEqual(out, new Timespan(date, end));
    });

    test('ignore time', function() {
      var start = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      var end = new Date(start.valueOf());
      end.setDate(end.getDate() + 1);

      var out = subject.spanOfDay(date);

      assert.deepEqual(out, new Timespan(start, end));
    });

  });

  test('#hourDiff', function() {
    var start = new Date(2012, 0, 5);
    var end = new Date(2012, 0, 7);

    var expected = 48;
    var out = subject.hourDiff(start, end);

    assert.equal(out, expected);
  });

  suite('#daysBetween', function() {
    //Nov 29th 2012
    var start = new Date(2012, 10, 29, 2);
    // Dec 2nd 2012
    var end = new Date(2012, 11, 2, 5);

    test('same day', function() {
      var end = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate(),
        start.getHours() + 1
      );

      var expected = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      );

      assert.deepEqual(
        subject.daysBetween(start, end),
        [expected]
      );
    });

    test('include time', function() {
      var expected = [
        start,
        new Date(2012, 10, 30),
        new Date(2012, 11, 1),
        end
      ];

      assert.deepEqual(
        subject.daysBetween(start, end, true),
        expected
      );
    });

    test('exclude time', function() {
      var expected = [
        new Date(2012, 10, 29),
        new Date(2012, 10, 30),
        new Date(2012, 11, 1),
        new Date(2012, 11, 2)
      ];

      assert.deepEqual(
        subject.daysBetween(start, end),
        expected
      );
    });

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

  suite('#isAllDay', function() {
    test('full day', function() {
      assert.isTrue(subject.isAllDay(
        new Date(2014, 9, 5),
        new Date(2014, 9, 5),
        new Date(2014, 9, 6)
      ));
    });

    test('not start of the day', function() {
      assert.isFalse(subject.isAllDay(
        new Date(2014, 9, 5),
        new Date(2014, 9, 5, 5),
        new Date(2014, 9, 6)
      ));
    });

    test('longer than a full day', function() {
      assert.isTrue(subject.isAllDay(
        new Date(2014, 9, 5),
        new Date(2014, 9, 5),
        new Date(2014, 9, 6, 5)
      ));
    });

    test('multiple days', function() {
      assert.isTrue(subject.isAllDay(
        new Date(2014, 9, 5),
        new Date(2014, 9, 5),
        new Date(2014, 9, 16)
      ));
      assert.isTrue(subject.isAllDay(
        new Date(2014, 9, 8),
        new Date(2014, 9, 5),
        new Date(2014, 9, 16)
      ));
    });

    test('same date', function() {
      // yahoo uses same start/end dates for recurring all day events
      assert.isTrue(subject.isAllDay(
        new Date(2014, 9, 5),
        new Date(2014, 9, 5),
        new Date(2014, 9, 5)
      ));
    });
  });

  test('#monthStart', function() {
    assert.deepEqual(
      Calc.monthStart(new Date(2014, 10, 1)),
      new Date(2014, 10, 1),
      'first day'
    );
    assert.deepEqual(
      Calc.monthStart(new Date(2014, 10, 12)),
      new Date(2014, 10, 1),
      'middle'
    );
  });

});

});
