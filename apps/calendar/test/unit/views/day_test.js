requireCommon('test/synthetic_gestures.js');

requireApp('calendar/test/unit/helper.js', function() {
  requireApp('calendar/shared/js/gesture_detector.js');
  requireLib('ordered_map.js');
  requireLib('timespan.js');
  requireLib('templates/day.js');
  requireLib('views/time_parent.js');
  requireLib('views/day_based.js');
  requireLib('views/day_child.js');
  requireLib('views/day.js');
});

suite('views/day', function() {
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
      }

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
    }

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
      }

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
    });

  });

  test('#onfirstseen', function() {
    assert.equal(subject.onfirstseen, subject.render);
  });

});
