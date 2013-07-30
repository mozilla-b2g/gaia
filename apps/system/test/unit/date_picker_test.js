requireApp('system/js/value_selector/date_picker.js');

suite('value selector/date picker', function() {
  var subject;
  var Calc;
  var triggerEvent;

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    document.body.appendChild(div);
    subject = new DatePicker(div);
    Calc = DatePicker.Calc;
    subject._position = new Date(2012, 1, 1);
  });

  suite('Calc', function() {
    var mocked = {};

    function mock(fn, value) {
      if (!(fn in mocked)) {
        mocked[fn] = subject[fn];
      }
      subject[fn] = function() {
        return value;
      };
    }

    teardown(function() {
      var key;
      for (key in mocked) {
        if (mocked.hasOwnProperty(key)) {
          subject[key] = mocked[key];
        }
      }
    });

    setup(function() {
      subject = DatePicker.Calc;
    });

    suite('isSameDate', function() {

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

    suite('isToday', function() {
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

    suite('isPast', function() {
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

        assert.isFalse(result,
                       'should return false when date is in the future');
      });

    });

    suite('isFuture', function() {
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

    suite('dateFromId', function() {
      var id;
      var result;
      var date = new Date(2012, 7, 3);

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

    test('getDayId', function() {
      var result = subject.getDayId(
        new Date(2012, 3, 7)
      );

      assert.equal(result, '2012-3-7');
    });

    suite('relativeState', function() {

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

  suite('_daysIn', function() {
    test('leap year', function() {
      var result = subject._daysInMonth(2012, 1);
      assert.equal(result, 29);
    });

    test('normal', function() {
      var result = subject._daysInMonth(2012, 0);
      assert.equal(result, 31);
    });
  });

  suite('_renderDay', function() {

    test('simple', function() {
      var date = new Date(2012, 1, 27);
      var result = subject._renderDay(date).firstChild;
      var html = result.outerHTML;

      assert.ok(html);
      assert.equal(result.dataset.date, Calc.getDayId(date));
      assert.include(html, '27');
    });

    test('today', function() {
      var date = new Date();
      var result = subject._renderDay(date);
      assert.ok(result.classList.contains('present'));
    });

    test('past', function() {
      var date = new Date(2009, 1, 1);
      var result = subject._renderDay(date);
      assert.ok(result.classList.contains('past'));
    });

    test('future', function() {
      var date = new Date();
      date.setDate(date.getDate() + 2);

      var result = subject._renderDay(date);
      assert.ok(result.classList.contains('future'));
    });
  });

  suite('_renderWeek', function() {
    var days = [
      new Date(2012, 0, 29),
      new Date(2012, 0, 30),
      new Date(2012, 0, 31),
      new Date(2012, 1, 1),
      new Date(2012, 1, 2),
      new Date(2012, 1, 3),
      new Date(2012, 1, 4)
    ];

    var result;

    setup(function() {
      result = subject._renderWeek(days);
    });

    test('container', function() {
      assert.equal(result.tagName.toLowerCase(), 'ol');
      assert.ok(result.outerHTML);
    });

    days.forEach(function(day) {
      test('week day ' + day, function() {
        var expected = subject._renderDay(day);
        assert.include(result.outerHTML, expected.outerHTML);
      });
    });

  });

  suite('_renderMonth', function() {

    function weekHtml(start, end) {
      var range = Calc.daysBetween(start, end);
      return subject._renderWeek(range).outerHTML;
    }

    test('Feb 2012', function() {
      var month = 1;
      var year = 2012;

      var result = subject._renderMonth(year, month);
      var html = result.outerHTML;

      assert.ok(html, 'has contents');

      assert.include(
        html,
        weekHtml(new Date(2012, 0, 29), new Date(2012, 1, 4)),
        'has first week'
      );

      assert.include(
        html,
        weekHtml(new Date(2012, 1, 5), new Date(2012, 1, 11)),
        'has second week'
      );

      assert.include(
        html,
        weekHtml(new Date(2012, 1, 12), new Date(2012, 1, 18)),
        'has third week'
      );

      assert.include(
        html,
        weekHtml(new Date(2012, 1, 19), new Date(2012, 1, 25)),
        'has fourth week'
      );


      assert.include(
        html,
        weekHtml(new Date(2012, 1, 26), new Date(2012, 2, 3)),
        'has fifth week'
      );
    });
  });

  suite('prev/next', function() {
    var calledWith;

    setup(function() {
      subject.display(2012, 0, 1);
    });

    test('#next', function() {
      subject.next();
      assert.equal(subject.year, 2012);
      assert.equal(subject.month, 1);
    });

    test('#previous', function() {
      subject.previous();
      assert.equal(subject.year, 2011);
      assert.equal(subject.month, 11);
    });

  });

  suite('prev/next with last day of a month', function() {
    var calledWith;

    setup(function() {
      // init as 2012/3/31
      subject.display(2012, 2, 31);
    });

    test('next', function() {
      subject.next();

      // should be 2012/4/30
      assert.equal(subject.year, 2012);
      assert.equal(subject.month, 3);
      assert.equal(subject.date, 30);
    });

    test('previous', function() {
      subject.previous();

      // should be 2012/2/29
      assert.equal(subject.year, 2012);
      assert.equal(subject.month, 1);
      assert.equal(subject.date, 29);
    });

  });

  suite('display', function() {
    var year = 2012;
    var month = 11;
    var date = 1;
    var calledWith;

    setup(function() {
      calledWith = null;
      subject.onmonthchange = function() {
        calledWith = arguments;
      };

      subject.display(year, month, date);
    });

    test('initial render', function() {
      assert.deepEqual(
        calledWith[0],
        new Date(year, month),
        'should fire onmonthchange'
      );

      assert.equal(subject.year, 2012);
      assert.equal(subject.month, 11);
      assert.equal(subject.date, 1);
      assert.ok(subject.monthDisplay);
    });

    test('second rendering', function() {
      subject.display(2011, 2, 1);

      assert.deepEqual(
        calledWith[0],
        new Date(2011, 2),
        'should fire onmonthchange again'
      );

      assert.equal(subject.year, 2011);
      assert.equal(subject.month, 2);
      assert.equal(subject.date, 1);
      assert.ok(subject.monthDisplay);
    });
  });

  suite('setters', function() {
    test('value', function() {
      var calledWith;
      var date;

      subject.onvaluechange = function() {
        calledWith = arguments;
      };

      subject.value = date = new Date(2012, 1, 1);

      assert.deepEqual(subject.value, date);
      assert.deepEqual(calledWith, [date, null]);
    });
  });

  suite('dom events', function() {
    function triggerEvent(element, eventName) {
      var event = document.createEvent('HTMLEvents');
      event.initEvent(eventName, true, true);
      element.dispatchEvent(event);
    }

    setup(function() {
      subject.display(2012, 1, 1);
    });

    test('select', function() {
      var calledWith;
      subject.onvaluechange = function() {
        calledWith = arguments;
      };

      var target = subject.element.querySelector('[data-date="2012-1-1"]');
      triggerEvent(target, 'click');

      assert.ok(target.classList.contains('selected'), 'adds selected class');

      assert.deepEqual(
        subject.value,
        new Date(2012, 1, 1),
        'changes value'
      );

      assert.deepEqual(
        calledWith,
        [new Date(2012, 1, 1), new Date(2012, 1, 1)],
        'calls onvaluechange'
      );

      triggerEvent(
        subject.element.querySelector('[data-date="2012-1-2"]'),
        'click'
      );

      assert.ok(!target.classList.contains('selected'), 'clears past selected');
    });
  });

});

