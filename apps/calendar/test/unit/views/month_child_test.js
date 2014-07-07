requireCommon('test/synthetic_gestures.js');
require('/shared/js/gesture_detector.js');
requireLib('timespan.js');

suiteGroup('Views.MonthChild', function() {
  'use strict';

  var subject,
      controller,
      busytimes,
      app,
      testEl,
      //Nov 1st, 2012
      month = new Date(2012, 10, 1);

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
      id = 'weekday-' + i + '-single-char';

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
      var calledUpdateWith;

      setup(function() {
        controller.move(month);
      });

      setup(function(done) {
        slice = [
          1, 2, 3
        ];

        controller.queryCache = function() {
          // wait for _renderBusytime to complete
          Calendar.nextTick(done);
          calledCachedWith = arguments;
          return slice;
        };

        subject._updateBusytimes = function(options) {
          calledUpdateWith = options;
        };

        subject.activate();
      });

      test('first activation', function() {
        assert.ok(list.contains(subject.ACTIVE));
        assert.equal(calledCachedWith[0], subject.timespan);
        assert.deepEqual(
          calledUpdateWith,
          { added: [1, 2, 3] }
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

  suite('#handleEvent', function() {
    var busytime = { id: '007' };
    var stub;

    setup(function() {
      stub = sinon.stub(subject, '_updateBusyCount');
    });

    teardown(function() {
      stub.restore();
    });

    test('add event should increment day busy count', function() {
      subject.handleEvent({ type: 'add', data: busytime });
      sinon.assert.calledWith(stub, busytime, 1);
    });

    test('remove event should decrement day busy count', function() {
      subject.handleEvent({ type: 'remove', data: busytime });
      sinon.assert.calledWith(stub, busytime, -1);
    });
  });

  suite('#_updateBusyCount', function() {
    var busytime = { startDate: new Date('January 17, 1998') };
    var dayId = Calendar.Calc.getDayId(busytime.startDate);
    var stub;

    setup(function() {
      stub = sinon.stub(subject, '_setBusyCount');
      subject._dayToBusyCount = Object.create(null);
      subject._dayToBusyCount[dayId] = 2;
    });

    teardown(function() {
      stub.restore();
    });

    test('should update appropriate day', function() {
      subject._updateBusyCount(busytime, 1);
      sinon.assert.calledOnce(stub);
      sinon.assert.calledWith(stub, dayId, 3);
    });
  });

  suite('#_setBusyCount', function() {
    var dayId = Calendar.Calc.getDayId(new Date('January 17, 1998'));
    var mock;

    test('ok', function() {
      assert.ok(true);
    });

    setup(function() {
      subject._dayToBusyCount = Object.create(null);
      var element = {
        childNodes: [1, 2],
        appendChild: function() {},
        removeChild: function() {}
      };
      mock = sinon.mock(element);
      sinon
        .stub(subject, '_busyElement')
        .withArgs(dayId)
        .returns(element);
    });

    teardown(function() {
      subject._busyElement.restore();
      mock.restore();
    });

    test('should do nothing if count === dots', function() {
      mock
        .expects('appendChild')
        .never();
      mock
        .expects('removeChild')
        .never();
      subject._setBusyCount(dayId, 2);
      mock.verify();
    });

    test('should remove busytimes if count < dots', function() {
      mock
        .expects('appendChild')
        .never();
      mock
        .expects('removeChild')
        .twice();
      subject._setBusyCount(dayId, 0);
      mock.verify();
    });

    test('should add busytimes if count > dots', function() {
      mock
        .expects('appendChild')
        .once();
      mock
        .expects('removeChild')
        .never();
      subject._setBusyCount(dayId, 3);
    });

    test('should not write more than three dots', function() {
      mock
        .expects('appendChild')
        .once();
      mock
        .expects('removeChild')
        .never();
      subject._setBusyCount(dayId, 1337);
    });
  });
});
