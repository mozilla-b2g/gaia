requireCommon('test/synthetic_gestures.js');
require('/shared/js/gesture_detector.js');
requireLib('timespan.js');

suiteGroup('Views.MonthChild', function() {
  var subject,
      controller,
      busytimes,
      app,
      testEl,
      //Nov 1st, 2012
      month = new Date(2012, 10, 1);

  function range(start, end) {
    var list = [];

    for (; start <= end; start++) {
      list.push(start);
    }
    return list;
  }

  function createHour(hour) {
    return new Date(
      month.getFullYear(),
      month.getMonth(),
      month.getDate(),
      hour
    );
  }

  teardown(function() {
    testEl.parentNode.removeChild(testEl);
    testEl = null;
  });

  setup(function() {
    testEl = document.createElement('div');
    testEl.id = 'test';
    document.body.appendChild(testEl);

    app = testSupport.calendar.app();
    controller = app.timeController;

    busytimes = app.store('Busytime');
    subject = new Calendar.Views.MonthChild({
      app: app,
      date: month
    });

  });

  suite('initialization', function() {

    function view(month) {
      return new Calendar.Views.MonthChild({
        app: app,
        date: month
      });
    }

    test('sanity', function() {
      assert.equal(subject.controller, controller);
      assert.equal(subject.date, month);
      assert.equal(subject.id, subject.date.valueOf());

      assert.instanceOf(
        subject.timespan,
        Calendar.Timespan,
        'should create timespan'
      );

      assert.deepEqual(subject._days, {});

      assert.deepEqual(
        subject.timespan,
        Calendar.Calc.spanOfMonth(subject.date)
      );
    });

  });

  test('#_hourToBusyUnit', function() {
    assert.equal(subject._hourToBusyUnit(1), 1);
    assert.equal(subject._hourToBusyUnit(12), 6);
    assert.equal(subject._hourToBusyUnit(14), 7);
    assert.equal(subject._hourToBusyUnit(24), 12);
  });

  suite('_calculateBusytime', function() {
    var rangedRecord;

    setup(function() {
      rangedRecord = Factory('busytime', {
        startDate: new Date(2012, 1, 1, 12),
        endDate: new Date(2012, 1, 3, 6)
      });
    });

    function containsIds(result, record) {
      assert.equal(
        result.calendarId,
        record.calendarId,
        'should assign calendar id'
      );

      assert.equal(
        result.eventId,
        record.eventId,
        'should assign event id'
      );

      assert.equal(
        result._id,
        record._id,
        'should assign record id'
      );
    }

    test('ends as other starts', function() {
      var busytime = Factory('busytime', {
        startDate: new Date(2012, 1, 1),
        endDate: new Date(2012, 1, 2)
      });

      var date = new Date(2012, 1, 2);

      var result = subject._calculateBusytime(
        date,
        busytime
      );

      assert.ok(!result, 'should not render time');
    });

    test('whole day', function() {
      var result = subject._calculateBusytime(
        new Date(2012, 1, 2),
        rangedRecord
      );

      containsIds(result, rangedRecord);
      assert.equal(result.start, 1);
      assert.equal(result.length, 12);
    });

    test('start of range', function() {
      var result = subject._calculateBusytime(
        new Date(2012, 1, 1),
        rangedRecord
      );

      containsIds(result, rangedRecord);
      assert.equal(result.start, 6);
      assert.equal(result.length, 12);
    });


    test('end of range', function() {
      var result = subject._calculateBusytime(
        new Date(2012, 1, 3),
        rangedRecord
      );

      containsIds(result, rangedRecord);
      assert.equal(result.start, 1);
      assert.equal(result.length, 3);
    });


    test('in one day', function() {
      var record = Factory('busytime', {
        startDate: new Date(2012, 1, 1, 12),
        endDate: new Date(2012, 1, 1, 22)
      });

      var result = subject._calculateBusytime(
        new Date(2012, 1, 1),
        record
      );

      containsIds(result, record);
      assert.equal(result.start, 6);
      assert.equal(result.length, 6);
    });

  });

  test('#_initEvents', function() {
    subject._initEvents();

    var observers = controller._timeObservers;
    var record = observers[observers.length - 1];

    assert.equal(record[0], subject.timespan);
    assert.equal(record[1], subject);
  });

  test('#_destroyEvents', function() {
    subject._initEvents();
    var observers = controller._timeObservers;
    var len = observers.length;
    subject._destroyEvents();
    assert.equal(observers.length, len - 1);
  });

  suite('#_handleEvent', function() {

    setup(function() {
      subject._initEvents();
    });

    test('type: add', function() {
      var added = [];
      subject._renderBusytime = function(record) {
        added.push(record);
      };

      var record = Factory('busytime', {
        startDate: createHour(23)
      });

      controller.fireTimeEvent(
        'add',
        createHour(23).valueOf(),
        createHour(23).valueOf(),
        record
      );

      assert.deepEqual(added, [record]);
    });

    test('type: remove', function() {
      var removed = [];
      subject._removeBusytimes = function(list) {
        removed.push(list);
      };

      var record = Factory('busytime', {
        startDate: createHour(23)
      });

      controller.fireTimeEvent(
        'remove',
        createHour(23).valueOf(),
        createHour(23).valueOf(),
        record
      );

      assert.deepEqual(removed, [[record]]);
    });

  });

  suite('#_renderBusytime', function() {
    var calls;

    setup(function() {
      calls = [];

      subject.controller.move(month);

      subject.create(testEl);
      subject._addBusytime = function() {
        calls.push(Array.prototype.slice.call(arguments));
      };
    });

    test('same day', function() {
      var record = Factory('busytime', {
        startDate: new Date(2012, 1, 1, 12),
        endDate: new Date(2012, 1, 1, 23)
      });

      subject._renderBusytime(record);
      assert.equal(calls.length, 1);

      assert.isTrue(Calendar.Calc.isSameDate(
        calls[0][0],
        record.startDate
      ));

      assert.equal(calls[0][1], record);
    });

    test('whole month', function() {
      var span = subject.timespan;

      var record = Factory('busytime', {
        startDate: new Date(span.start - 60),
        endDate: new Date(span.end + 60)
      });

      var dates = [];
      var numberOfDays = 35;
      var start = record.startDate;

      for (var i = 1; i <= numberOfDays; i++) {
        var day = new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate() + i
        );

        dates.push([day, record]);
      }

      subject._renderBusytime(record);

      assert.equal(calls.length, 35);
      assert.deepEqual(calls.slice(1, 33), dates.slice(1, 33));

      assert.isTrue(
        Calendar.Calc.isSameDate(
          calls[0][0],
          new Date(subject.timespan.start)
        )
      );

      assert.isTrue(
        Calendar.Calc.isSameDate(
          calls[34][0],
          new Date(subject.timespan.end)
        )
      );

    });

    test('trailing before the timespan', function() {
      subject.timespan = new Calendar.Timespan(
        new Date(2012, 2, 1),
        new Date(2012, 2, 31)
      );

      var record = Factory('busytime', {
        startDate: new Date(2012, 1, 27),
        endDate: new Date(2012, 2, 3)
      });

      subject._renderBusytime(record);
      // the 30th is a monday of the 5th week
      // we know we need to render the rest of that
      // week which totals 6 days (Feb 27 - March 3rd)
      assert.equal(calls.length, 3);

      assert.isTrue(Calendar.Calc.isSameDate(
        calls[0][0],
        new Date(2012, 2, 1)
      ));

     assert.isTrue(Calendar.Calc.isSameDate(
        calls[1][0],
        new Date(2012, 2, 2)
      ));

      assert.isTrue(Calendar.Calc.isSameDate(
        calls[2][0],
        new Date(2012, 2, 3)
      ));
    });



    test('trailing after the timespan', function() {
      var end = new Date(2012, 2, 4);
      end.setMilliseconds(-1);

      subject.timespan = new Calendar.Timespan(
        new Date(2012, 1, 1),
        end
      );

      var record = Factory('busytime', {
        startDate: new Date(2012, 1, 27),
        endDate: new Date(2012, 2, 10)
      });

      subject._renderBusytime(record);
      // the 30th is a monday of the 5th week
      // we know we need to render the rest of that
      // week which totals 6 days (Feb 27 - March 3rd)
      assert.equal(calls.length, 6);

      assert.isTrue(Calendar.Calc.isSameDate(
        calls[0][0],
        record.startDate
      ));

      assert.isTrue(Calendar.Calc.isSameDate(
        calls[1][0],
        new Date(2012, 1, 28)
      ));

      assert.isTrue(Calendar.Calc.isSameDate(
        calls[2][0],
        new Date(2012, 1, 29)
      ));

     assert.isTrue(Calendar.Calc.isSameDate(
        calls[3][0],
        new Date(2012, 2, 1)
      ));

      assert.isTrue(Calendar.Calc.isSameDate(
        calls[4][0],
        new Date(2012, 2, 2)
      ));

      assert.isTrue(Calendar.Calc.isSameDate(
        calls[5][0],
        new Date(2012, 2, 3)
      ));
    });

    test('three days', function() {
      subject.timespan = new Calendar.Timespan(
        new Date(2011, 12, 1),
        new Date(2012, 4, 1)
      );

      var record = Factory('busytime', {
        startDate: new Date(2012, 1, 1),
        endDate: new Date(2012, 1, 3)
      });

      subject._renderBusytime(record);
      assert.equal(calls.length, 3);

      assert.isTrue(Calendar.Calc.isSameDate(
        calls[0][0],
        record.startDate
      ));

      assert.isTrue(Calendar.Calc.isSameDate(
        calls[1][0],
        new Date(2012, 1, 2)
      ));

      assert.isTrue(Calendar.Calc.isSameDate(
        calls[2][0],
        record.endDate
      ));
    });

  });

  test('#_addBusytime', function() {
    controller.move(month);
    subject.element = testEl;
    testEl.innerHTML = subject._renderDay(month);

    assert.ok(!testEl.querySelector('.busy-12'));

    subject._addBusytime(
      createHour(23),
      Factory('busytime', {
        startDate: createHour(20),
        endDate: createHour(23)
      })
    );

    assert.ok(testEl.querySelector('.busy-10'));
  });

  suite('#_removeBusytimes', function() {
    var id;
    var list;

    setup(function() {
      controller.cacheBusytime(Factory('busytime', {
        startDate: createHour(23),
        endDate: createHour(23)
      }));

      controller.cacheBusytime(Factory('busytime', {
        startDate: createHour(1),
        endDate: createHour(1)
      }));
    });

    setup(function() {
      controller.move(month);
      testEl.innerHTML = subject._renderDay(month);
      subject.element = testEl;

      //TODO: we should probably not be using
      //a private variable from a store here...
      //Maybe we should expose the tree directly
      //on busytimes and make it part of the public
      //api?
      list = controller._collection.items.map(function(item) {
        subject._renderBusytime(item);
        return item;
      });

      assert.ok(testEl.querySelector('.busy-1'));
      assert.ok(testEl.querySelector('.busy-12'));

      id = Calendar.Calc.getDayId(month);
    });

    test('when elements exist', function() {
      subject._removeBusytimes(list);

      assert.ok(
        !testEl.querySelector('.busy-12'),
        'should remove busy selector 12'
      );

      assert.ok(
        !testEl.querySelector('.busy-1'),
        'should remove busy selector 1'
      );
    });

    test('when elements are missing', function() {
      assert.ok(!testEl.querySelector('.busy-6'), 'should not have busy-6');
      subject._removeBusytimes([{ _id: 'nothere' }]);
    });

  });

  suite('#_renderDay', function() {

    var day = new Date(2000, 3, 7),
        id,
        oldStateFn,
        result;

    suiteSetup(function() {
      id = Calendar.Calc.getDayId(day);
      controller.move(day);
    });

    setup(function() {
      oldStateFn = Calendar.Calc.relativeState;
      Calendar.Calc.relativeState = function() {
        return 'fooz';
      };
    });

    teardown(function() {
      Calendar.Calc.relativeState = oldStateFn;
    });

    function rendersObject() {
      assert.ok(result);
      assert.include(
        result, Calendar.Calc.relativeState(day),
        'should include day id'
      );
      assert.include(result, 'fooz', 'should include state');
      assert.include(
        result, '>' + day.getDate() + '<',
        'should include current day'
      );
    }

    test('result', function() {
      var id = Calendar.Calc.getDayId(day);
      controller.move(day);
      result = subject._renderDay(day);

      rendersObject();

      var keys = Object.keys(subject._days);
      assert.equal(keys[0], id);

      assert.include(
        result, '<div class="busy-indicator"></div>',
        'has no indicators'
      );
    });

    function createHour(hour) {
      return new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        hour
      );
    }

  });

  suite('#_renderWeek', function() {
    var day = new Date(2012, 10, 1),
        result;

    setup(function() {
      controller.currentMonth = day;
      controller.move(day);
      result = subject._renderWeek(Calendar.Calc.getWeeksDays(day));
    });

    test('html output', function() {
      assert.ok(result);
      assert.include(result, '28');
      assert.include(result, '29');
      assert.include(result, '30');
      assert.include(result, '31');
      assert.include(result, '1');
      assert.include(result, '2');
      assert.include(result, '3');
    });
  });

  test('#_renderDayHeaders', function() {
    var result = subject._renderDayHeaders();
    var days = 7;
    var i = 0;
    var id;

    assert.ok(result);

    for (; i < days; i++) {
      id = 'weekday-' + i + '-short';

      assert.include(
        result,
        id,
        'has "' + id + '"'
      );
    }
  });

  suite('#_renderMonth', function() {

    function rendersWeeks(month, weekStartDates) {
      controller.move(month);

      var subject = new Calendar.Views.MonthChild({
        app: app,
        date: month
      });

      var result = subject._renderMonth();

      weekStartDates.forEach(function(date) {
        assert.include(
          result, subject._renderWeek(Calendar.Calc.getWeeksDays(date)),
          'should include week of ' + date.toString()
        );
      });

      assert.equal(subject.weeks, weekStartDates.length);
      assert.include(
        result, subject._renderDayHeaders(), 'should have headers'
      );
    }

    test('should compare header and four weeks', function() {
      var days = [
        new Date(2009, 1, 1),
        new Date(2009, 1, 8),
        new Date(2009, 1, 15),
        new Date(2009, 1, 25)
      ];

      rendersWeeks(new Date(2009, 1, 1), days);
    });

    test('should compose header and five weeks', function() {
      var days = [
        month,
        new Date(2012, 10, 8),
        new Date(2012, 10, 15),
        new Date(2012, 10, 22),
        new Date(2012, 10, 29)
      ];

      rendersWeeks(month, days);
    });

    test('should compose header and six weeks', function() {
      var days = [
        new Date(2012, 11, 1),
        new Date(2012, 11, 8),
        new Date(2012, 11, 15),
        new Date(2012, 11, 22),
        new Date(2012, 11, 29),
        new Date(2012, 12, 1)
      ];

      rendersWeeks(days[0], days);
    });

  });

  suite('#_busyElement', function() {
    setup(function() {
      controller.move(month);
    });

    test('trying to access outside of range', function() {
      assert.throws(function() {
        // throw because not rendered yet...
        subject._dayElement(new Date());
      });
    });

    test('access rendered day', function() {
      subject.create();

      var id = Calendar.Calc.getDayId(month);
      var result = subject._busyElement(month);
      var fromString = subject._busyElement(id);

      assert.ok(result);
      assert.equal(result, fromString);
      assert.equal(subject._days[id], result);
    });

  });

  suite('#create', function() {
    setup(function() {
      controller.move(month);
    });

    test('initial create', function() {
      var result,
          expected = subject._renderMonth();

      result = subject.create();
      assert.equal(subject.element, result);

      assert.equal(
        result.innerHTML, expected,
        'should render month'
      );
    });

  });

  suite('activations', function() {

    var list;

    setup(function() {
      controller.move(month);
      subject.create(testEl);

      list = subject.element.classList;
    });

    suite('#activate', function() {
      var slice;
      var calledCachedWith;
      var calledRenderWith;

      setup(function() {
        controller.move(month);
      });

      setup(function(done) {
        calledRenderWith = [];
        slice = [
          1, 2, 3
        ];

        controller.queryCache = function() {
          // wait for _renderBusytime to complete
          Calendar.nextTick(done);
          calledCachedWith = arguments;
          return slice;
        };

        subject._renderBusytime = function(item) {
          calledRenderWith.push(item);
        };

        subject.activate();
      });

      test('first activation', function() {
        assert.ok(list.contains(subject.ACTIVE));
        assert.equal(calledCachedWith[0], subject.timespan);
        assert.deepEqual(
          calledRenderWith,
          [1, 2, 3]
        );
      });

    });

    test('#deactivate', function() {
      subject.deactivate();
      assert.ok(!list.contains(subject.ACTIVE));
    });

  });

  suite('#destroy', function() {
    setup(function() {
      controller.move(month);
      subject._days = true;
    });

    test('when not created', function() {
      subject.destroy();
      assert.deepEqual(subject._days, {});
    });

    test('when created', function() {
      var el = subject.create(testEl);
      testEl.appendChild(el);

      assert.ok(subject.element);

      subject.destroy();

      assert.ok(!subject.element, 'should not have an element');
      assert.equal(testEl.children.length, 0);
    });

  });

});
