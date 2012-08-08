requireCommon('test/synthetic_gestures.js');
requireApp('calendar/test/unit/helper.js', function() {
  require('/shared/js/gesture_detector.js');
  requireLib('templates/month.js');
  requireLib('views/month_child.js');
  requireLib('timespan.js');
});


suite('views/month_child', function() {
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

  setup(function(done) {
    testEl = document.createElement('div');
    testEl.id = 'test';
    document.body.appendChild(testEl);

    app = testSupport.calendar.app();
    controller = app.timeController;

    busytimes = app.store('Busytime');
    subject = new Calendar.Views.MonthChild({
      app: app,
      month: month
    });

    app.db.open(function() {
      done();
    });
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      app.db,
      done
    );
  });

  teardown(function() {
    app.db.close();
  });

  test('initialization', function() {
    assert.equal(subject.controller, controller);
    assert.equal(subject.month, month);
    assert.equal(subject.monthId, Calendar.Calc.getMonthId(month));

    assert.instanceOf(
      subject._timespan,
      Calendar.Timespan,
      'should create timespan'
    );

    assert.deepEqual(subject._days, {});

    assert.deepEqual(
      subject._timespan,
      subject._setupTimespan(subject.month)
    );
  });

  test('#_setupTimespan', function() {
    var month = new Date(2012, 7, 1);

    var expectedStart = new Date(2012, 6, 29);
    var expectedEnd = new Date(2012, 8, 2);
    expectedEnd.setMilliseconds(-1);

    var range = subject._setupTimespan(month);

    assert.equal(
      range.start,
      expectedStart.valueOf()
    );

    assert.equal(
      range.end,
      expectedEnd.valueOf()
    );
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

    var observers = busytimes._timeObservers;
    var record = observers[observers.length - 1];

    assert.equal(record[0], subject._timespan);
    assert.equal(record[1], subject);
  });

  test('#_destroyEvents', function() {
    subject._initEvents();
    var observers = busytimes._timeObservers;
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
      }

      var record = Factory('busytime', {
        startDate: createHour(23)
      });

      busytimes.fireTimeEvent(
        'add',
        createHour(23).valueOf(),
        record
      );

      assert.deepEqual(added, [record]);
    });

    test('type: remove', function() {
      var removed = [];
      subject._removeBusytimes = function(list) {
        removed.push(list);
      }

      var record = Factory('busytime', {
        startDate: createHour(23)
      });

      busytimes.fireTimeEvent(
        'remove',
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

      subject.controller.currentMonth = month;

      subject.attach(testEl);
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
      var span = subject._timespan;

      var record = Factory('busytime', {
        startDate: new Date(span.start - 60),
        endDate: new Date(span.endDate + 60)
      });

      var dates = [];
      var numberOfDays = 35;
      var start = record.startDate;

      for (var i = 1; i <= numberOfDays; i++) {
        var id = Calendar.Calc.getDayId(
          new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate() + i
          )
        );

        dates.push([id, record]);
      }

      subject._renderBusytime(record);

      assert.equal(calls.length, 35);
      assert.deepEqual(calls, dates);
    });

    test('three days', function() {
      subject._timespan = new Calendar.Timespan(
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
    controller.currentMonth = month;
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

    setup(function(done) {
      var item = Factory('event', {
        remote: {
          startDate: createHour(1),
          endDate: createHour(1)
        }
      });
      app.store('Event').persist(item, done);
    });

    setup(function(done) {
      var item = Factory('event', {
        remote: {
          startDate: createHour(23),
          endDate: createHour(23)
        }
      });
      app.store('Event').persist(item, done);
    });

    setup(function() {
    });

    setup(function() {
      controller.currentMonth = month;
      testEl.innerHTML = subject._renderDay(month);
      subject.element = testEl;

      var keys = Object.keys(busytimes.cached);

      list = keys.map(function(key) {
        subject._renderBusytime(busytimes.cached[key]);
        return busytimes.cached[key];
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
      controller.currentMonth = day;
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
      controller.currentMonth = day;
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
      result = subject._renderWeek(day);
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

    assert.ok(subject.dayNames.length == 7);
    subject.dayNames.forEach(function(day) {
      assert.include(result, day, 'result should include ' + day);
    });
  });

  suite('#_renderMonth', function() {
    var days = [
      month,
      new Date(2012, 10, 8),
      new Date(2012, 10, 15),
      new Date(2012, 10, 22),
      new Date(2012, 10, 29)
    ];

    test('should compose header and five weeks', function() {
      controller.currentMonth = days[0];
      var result = subject._renderMonth();

      assert.ok(result);

      days.forEach(function(date) {
        assert.include(
          result, subject._renderWeek(date),
          'should include week of ' + date.getDate()
        );
      });

    });
  });

  suite('#_busyElement', function() {
    setup(function() {
      controller.currentMonth = month;
    });

    test('trying to access outside of range', function() {
      assert.throws(function() {
        // throw because not rendered yet...
        subject._dayElement(new Date());
      });
    });

    test('access rendered day', function() {
      subject.attach(testEl);

      var id = Calendar.Calc.getDayId(month);
      var result = subject._busyElement(month);
      var fromString = subject._busyElement(id);

      assert.ok(result);
      assert.equal(result, fromString);
      assert.equal(subject._days[id], result);
    });

  });

  suite('#attach', function() {
    var slice;
    var calledCachedWith;
    var calledRenderWith;

    setup(function() {
      controller.currentMonth = month;
    });

    setup(function() {
      calledRenderWith = [];
      slice = [
        1, 2, 3
      ];

      busytimes.cachedStartsIn = function() {
        calledCachedWith = arguments;
        return slice;
      };

      subject._renderBusytime = function(item) {
        calledRenderWith.push(item);
      };
    });

    test('initial attach', function() {
      var result,
          expected = subject._renderMonth();

      testEl.appendChild(document.createElement('div'));

      result = subject.attach(testEl);

      assert.equal(calledCachedWith[0], subject._timespan);
      assert.deepEqual(
        calledRenderWith,
        [1, 2, 3]
      );

      assert.equal(result.outerHTML, expected);
      assert.ok(testEl.children[1].id);

      assert.equal(testEl.children[0].tagName.toLowerCase(), 'div');
      assert.equal(result.id, testEl.children[1].id);
    });

  });

  suite('activations', function() {

    var list;

    setup(function() {
      controller.currentMonth = month;
      subject.attach(testEl);

      list = subject.element.classList;
    });

    test('#activate', function() {
      subject.activate();
      assert.ok(!list.contains(subject.INACTIVE));
    });

    test('#deactivate', function() {
      subject.deactivate();
      assert.ok(list.contains(subject.INACTIVE));
    });

  });

  suite('#destroy', function() {
    setup(function() {
      controller.currentMonth = month;
      subject._days = true;
    });

    test('when not attached', function() {
      subject.destroy();
      assert.deepEqual(subject._days, {});
    });

    test('when attached', function() {
      subject.attach(testEl);
      assert.ok(subject.element);

      subject.destroy();

      assert.ok(!subject.element, 'should not have an element');
      assert.equal(testEl.children.length, 0);
    });

  });

});

