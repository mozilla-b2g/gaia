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

    assert.equal(
      subject._timespan.start,
      month.valueOf(),
      'timespan should start at very begining of month'
    );

    var endMonth = new Date(month.valueOf());
    endMonth.setMonth(month.getMonth() + 1);
    endMonth.setMilliseconds(-1);

    assert.equal(
      subject._timespan.end,
      endMonth.valueOf(),
      'timespan should end at the very end of month'
    );
  });

  test('#_hourToBusyUnit', function() {
    assert.equal(subject._hourToBusyUnit(1), 1);
    assert.equal(subject._hourToBusyUnit(12), 6);
    assert.equal(subject._hourToBusyUnit(14), 7);
    assert.equal(subject._hourToBusyUnit(24), 12);
  });

  suite('#_busyBlockFromRecord', function() {

    test('multi length', function() {
      // start: 4 length: 8
      var record = Factory('busytime', {
        startDate: new Date(2012, 1, 1, 8),
        endDate: new Date(2012, 1, 1, 23)
      });

      var expected = {
        _id: record._id,
        calendarId: record.calendarId,
        start: 4,
        length: 8
      };

      var html = Calendar.Templates.Month.busy.render(
        expected
      );

      assert.equal(
        subject._busyBlockFromRecord(record),
        html
      );
    });

    test('last block', function() {
      var record = Factory('busytime', {
        startDate: new Date(2012, 1, 1, 23),
        endDate: new Date(2012, 1, 1, 23)
      });

      var expected = {
        _id: record._id,
        calendarId: record.calendarId,
        start: 12,
        length: 1
      };

      var html = Calendar.Templates.Month.busy.render(
        expected
      );

      assert.equal(
        subject._busyBlockFromRecord(record),
        html
      );
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
      subject._addBusyUnit = function(record) {
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
      subject._removeBusyUnits = function(list) {
        removed.push(list);
      }

      var record = Factory('busytime', {
        startDate: createHour(23)
      });

      busytimes.fireTimeEvent(
        'remove',
        createHour(23).valueOf(),
        record._id
      );

      assert.deepEqual(removed, [[record._id]]);
    });

  });

  test('#_addBusyUnit', function() {
    controller.currentMonth = month;
    testEl.innerHTML = subject._renderDay(month);

    assert.ok(!testEl.querySelector('.busy-12'));

    subject._addBusyUnit(
      Factory('busytime', {
        startDate: createHour(23)
      })
    );

    assert.ok(testEl.querySelector('.busy-12'));
  });

  suite('#_removeBusyUnits', function() {
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
      list = Object.keys(app.store('Busytime').cached);
    });

    setup(function() {
      controller.currentMonth = month;
      testEl.innerHTML = subject._renderDay(month);
      subject.element = testEl;

      assert.ok(testEl.querySelector('.busy-1'));
      assert.ok(testEl.querySelector('.busy-12'));

      id = Calendar.Calc.getDayId(month);
    });

    test('when elements exist', function() {
      subject._removeBusyUnits(list);

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
      subject._removeBusyUnits(id, [6]);
    });

  });

  suite('#_renderBusyUnits', function() {
    var events;
    var busytimes;

    setup(function() {
      events = app.store('Event');
      busytimes = app.store('Busytime');
    });

    function add(start, end) {
      setup(function(done) {
        events.persist(Factory('event', {
          remote: {
            startDate: start,
            endDate: end,
            occurs: [start]
          }
        }), done);
      });
    }

    // start 1, length 6
    add(
      new Date(2012, 1, 1, 1),
      new Date(2012, 1, 1, 12)
    );

    add(
      new Date(2012, 1, 1, 20),
      new Date(2012, 1, 1, 23)
    );

    add(
      new Date(2012, 1, 2),
      new Date(2012, 1, 5)
    );

    test('output of single date', function() {
      var start = new Date(2012, 1, 1);
      var end = new Date(2012, 1, 2);
      end.setMilliseconds(-1);

      var span = new Calendar.Timespan(
        start, end
      );

      var list = busytimes.cachedStartsIn(span);
      var html = '';

      list.forEach(function(e) {
        html += subject._busyBlockFromRecord(e);
      });

      assert.equal(
        subject._renderBusyUnits(start),
        html
      );
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

    test('without busy times', function() {
      controller.currentMonth = day;
      result = subject._renderDay(day);

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

    test('with busy times', function() {
      var event = Factory('event', {
        remote: {
          occurs: [
            createHour(1),
            createHour(12),
            createHour(23)
          ]
        }
      });

      busytimes.addEvent(event);
      controller.currentMonth = day;
      result = subject._renderDay(day);
      rendersObject();

      assert.ok(result);

      assert.include(result, 'busy-1');
      assert.include(result, 'busy-6');
      assert.include(result, 'busy-12');
    });

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

  suite('#attach', function() {

    setup(function() {
      controller.currentMonth = month;
    });

    test('initial attach', function() {
      var result,
          expected = subject._renderMonth();

      testEl.appendChild(document.createElement('div'));

      result = subject.attach(testEl);

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
    });

    test('when not attached', function() {
      subject.destroy();
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

