requireCommon('test/synthetic_gestures.js');
requireApp('calendar/shared/js/gesture_detector.js');
requireLib('timespan.js');

suiteGroup('Views.Day', function() {
  var subject,
      app,
      controller,
      busytimes,
      triggerEvent;

  suiteSetup(function() {
    triggerEvent = testSupport.calendar.triggerEvent;
  });

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="day-view">',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();
    controller = app.timeController;
    controller.move(new Date());

    subject = new Calendar.Views.Day({
      app: app
    });

  });

  test('#initialize', function() {
    assert.instanceOf(subject, Calendar.Views.TimeParent);
  });

  suite('#handleEvent', function() {

    var calledTime;
    var date = new Date(2013, 1, 1);

    setup(function() {
      calledTime = null;
      subject.changeDate = function() {
        calledTime = arguments;
      };

      // events are only listened to when
      // activated...
      subject.onactive();
    });

    test('event: selectedDayChange', function() {
      controller.selectedDay = date;
      assert.deepEqual(
        calledTime[0], date,
        'selected day should update active time'
      );
    });

    test('event: dayChange', function() {
      controller.move(date);
      assert.deepEqual(
        calledTime[0], date,
        'move - active time should change'
      );
    });

    test('dayChange changes selectedDay', function() {
      controller.move(date);
      assert.deepEqual(
        controller.selectedDay, date,
        'dayChange - selectedDay should change'
      );
    });
  });

  test('#element', function() {
    assert.equal(
      subject.element.id,
      'day-view'
    );
  });

  test('#_getId', function() {
    var date = new Date();
    var id = subject._getId(date);

    assert.equal(date.valueOf(), id);
  });

  test('#_nextTime', function() {
    var date = new Date(2012, 1, 15);
    var expected = new Date(2012, 1, 16);

    assert.deepEqual(
      subject._nextTime(date),
      expected
    );
  });

  test('#_previousTime', function() {
    var date = new Date(2012, 1, 15);
    var expected = new Date(2012, 1, 14);

    assert.deepEqual(
      subject._previousTime(date),
      expected
    );
  });

  test('#render', function() {
    var calledWith;

    subject.changeDate = function() {
      calledWith = arguments;
    };

    subject.render();

    assert.deepEqual(
      calledWith[0], controller.day
    );
  });

  suite('#oninactive', function() {

    test('event disabling', function() {
      var calledWith;

      subject.changeDate = function() {
        calledWith = arguments;
      };

      // start in active state
      subject.onactive();

      // sanity check
      controller.selectedDay = new Date();
      assert.ok(calledWith, 'should be active');
      calledWith = null;

      // disable
      subject.oninactive();

      // date must be different then above of this
      // event will not fire....
      controller.selectedDay = new Date(2012, 1, 2);
      assert.ok(!calledWith, 'should disable event listeners');
    });
  });

  suite('#onactive', function() {
    test('mostRecentDayType === day', function() {
      controller.move(new Date(2012, 1, 15));
      // should do nothing special
      var selDate = new Date(2012, 1, 1);
      controller.selectedDay = selDate;
      controller.move(new Date());

      subject.onactive();

      assert.isFalse(
        Calendar.Calc.isSameDate(selDate, controller.day),
        'should not move controller'
      );

      assert.deepEqual(subject.date, controller.position);
    });

    test('mostRecentDayType === selectedDay', function() {
      var selDate = new Date(2012, 1, 1);
      controller.move(new Date());
      controller.selectedDay = selDate;

      subject.onactive();

      assert.deepEqual(
        controller.position,
        selDate,
        'should move controller to selected day position'
      );

      assert.deepEqual(subject.date, selDate);
    });

    test('inactive for a peroid then reactivate', function() {
      subject.onactive();
      controller.move(new Date(2011, 0, 1));

      subject.oninactive();
      controller.move(new Date(2012, 8, 1));

      subject.onactive();
      assert.deepEqual(subject.date, controller.position);
    });

  });

  test('#onfirstseen', function() {
    assert.equal(subject.onfirstseen, subject.render);
  });

});
