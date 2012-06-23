requireCommon('test/synthetic_gestures.js');

requireApp('calendar/test/unit/helper.js', function() {

  requireApp('calendar/js/ext/gesture_detector.js');
  requireCalendarController();
  requireApp('calendar/js/templates/month.js');
  requireApp('calendar/js/batch.js');
  requireApp('calendar/js/views/month_child.js');

});


suite('views/month_child', function() {
  var subject,
      controller,
      busytimes,
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

    controller = createController();

    busytimes = controller.busytime;
    subject = new Calendar.Views.MonthChild({
      controller: controller,
      month: month
    });
  });

  test('initialization', function() {
    assert.equal(subject.controller, controller);
    assert.equal(subject.month, month);
    assert.equal(subject.monthId, Calendar.Calc.getMonthId(month));
    assert.deepEqual(subject._busytimes, subject._busytimes);
  });

  test('#_hourToBusyUnit', function() {
    assert.equal(subject._hourToBusyUnit(1), 1);
    assert.equal(subject._hourToBusyUnit(12), 6);
    assert.equal(subject._hourToBusyUnit(14), 7);
    assert.equal(subject._hourToBusyUnit(24), 12);
  });

  test('#_handleBatch', function() {
    var called, data;

    called = {
      add: [],
      remove: []
    };

    data = {
      'a': {
        add: [1],
        remove: [7]
      },
      'b': {
        remove: [8]
      }
    };

    subject._appendBusyUnits = function() {
      called.add.push(arguments);
    };

    subject._removeBusyUnits = function() {
      called.remove.push(arguments);
    };

    subject._handleBatch(data);

    assert.deepEqual(called.add, [
      ['a', [1]]
    ]);

    assert.deepEqual(called.remove, [
      ['a', [7]],
      ['b', [8]]
    ]);
  });

  suite('#_verifyBatchItem', function() {
    var hour, id, result;

    setup(function() {
      hour = createHour(2);
      id = Calendar.Calc.getDayId(hour);
    });

    suite('action: add', function() {

      test('add new item', function() {
        result = subject._verifyBatchItem(id, 'add', 1);

        assert.ok(result);
        assert.ok(subject._busytimes[id].has(1));
      });

      test('adding existing item', function() {
        var set = subject._busytimes[id] = new Calendar.Set();
        set.add(1);

        assert.isFalse(subject._verifyBatchItem(id, 'add', 1));
      });

    });

    suite('action: remove', function() {

      test('on existing item', function() {
        var set = subject._busytimes[id] = new Calendar.Set();
        set.add(1);

        assert.isTrue(
          subject._verifyBatchItem(id, 'remove', 1)
        );
      });

      test('on non-existant item', function() {
        //for now we are not doing anything
        //clever to resolve an add and remove
        //in the same queue, we will simply always add before
        //removing.
        assert.isTrue(
          subject._verifyBatchItem(id, 'remove', 1)
        );
      });
    });
  });

  test('#_initEvents', function() {
    var events;

    subject._initEvents();
    events = busytimes._$events;

    assert.equal(
      events['add ' + subject.monthId][0],
      subject._onBusyAdd
    );

    assert.equal(
      events['remove ' + subject.monthId][0],
      subject._onBusyRemove
    );
  });

  test('#_destroyEvents', function() {
    var events;

    subject._initEvents();
    subject._destroyEvents();

    events = busytimes._$events;

    assert.equal(
      events['add ' + subject.monthId].length,
      0
    );

    assert.equal(
      events['remove ' + subject.monthId].length,
      0
    );
  });

  suite('busy events', function() {
    var calledWith, id;

    setup(function() {
      calledWith = [];
      id = Calendar.Calc.getDayId(month);

      subject.batch.action = function() {
        calledWith.push(
          Array.prototype.slice.call(arguments)
        );
      }

      subject._initEvents();
    });

    test('#_onBusyAdd', function() {
      busytimes.add(createHour(23), 1);

      assert.deepEqual(
        calledWith,
        [[id, 'add', 12]]
      );
    });

    test('#_onBusyRemove', function() {
      busytimes.add(createHour(23), 1);
      calledWith.length = 0;
      busytimes.remove(1);

      assert.deepEqual(
        calledWith,
        [[id, 'remove', 12]]
      );
    });

  });

  test('#_appendBusyUnits', function() {
    var id = Calendar.Calc.getDayId(month);

    controller.currentMonth = month;
    testEl.innerHTML = subject._renderDay(month);

    assert.ok(!testEl.querySelector('.busy-1'));

    subject._appendBusyUnits(id, [1, 12]);

    assert.ok(testEl.querySelector('.busy-1'));
    assert.ok(testEl.querySelector('.busy-12'));
  });

  suite('#_removeBusyUnits', function() {
    var id;

    setup(function() {
      busytimes.add(createHour(1), 1);
      busytimes.add(createHour(23), 2);

      controller.currentMonth = month;
      testEl.innerHTML = subject._renderDay(month);

      assert.ok(testEl.querySelector('.busy-1'));
      assert.ok(testEl.querySelector('.busy-12'));


      id = Calendar.Calc.getDayId(month);
    });

    test('when elements exist', function() {
      subject._removeBusyUnits(id, [12, 1]);

      assert.ok(
        !testEl.querySelector('.busy-12'),
        'should remove busy selector 12'
      );

      assert.ok(
        !testEl.querySelector('.busy-1'),
        'should remove busy selector 1'
      );

      assert.equal(subject._busytimes[id].size(), 0);
    });

    test('when elements are missing', function() {
      assert.ok(!testEl.querySelector('.busy-6'), 'should not have busy-6');
      subject._removeBusyUnits(id, [6]);
    });


  });

  suite('#_getBusyUnits', function() {
    var all = range(1, 23);

    test('with all units', function() {
      var result = subject._getBusyUnits(all);
      assert.deepEqual(result, range(1, 12), 'should reduce by half');
    });

    test('with duplicates and odd numbers', function() {
      var result = subject._getBusyUnits([
        1, 3, 3, 4, 4, 7, 7
      ]);

      assert.deepEqual(result, [1, 2, 4]);
    });

  });

  suite('#_renderBusyUnits', function() {
    var units = [1, 12];

    test('without register', function() {
      var result = subject._renderBusyUnits(null, units);

      assert.ok(result);
      assert.include(result, 'busy-1');
      assert.include(result, 'busy-12');

      assert.equal(Object.keys(subject._busytimes).length, 0);
    });

    test('with register', function() {
      var result = subject._renderBusyUnits('fooz', units);

      assert.equal(Object.keys(subject._busytimes).length, 1);
      assert.setHas(subject._busytimes['fooz'], [1, 12]);
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
      controller.currentMonth = day;
      busytimes.add(createHour(1), '1');
      busytimes.add(createHour(12), '2');
      busytimes.add(createHour(23), '3');

      result = subject._renderDay(day);
      rendersObject();

      assert.ok(result);

      assert.include(result, 'busy-1');
      assert.include(result, 'busy-6');
      assert.include(result, 'busy-12');

      assert.setHas(
        subject._busytimes[id],
        [1, 6, 12]
      );
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

