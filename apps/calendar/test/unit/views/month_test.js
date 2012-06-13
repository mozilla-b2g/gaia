requireCommon('test/synthetic_gestures.js');

requireApp('calendar/test/unit/helper.js', function() {

  requireApp('calendar/js/gesture_detector.js');
  requireCalendarController();
  requireApp('calendar/js/templates/month.js');
  requireApp('calendar/js/views/month.js');

});

suite('views/month', function() {
  var subject,
      controller,
      busytimes;

  function range(start, end) {
    var list = [];

    for (; start <= end; start++) {
      list.push(start);
    }
    return list;
  }

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div class="monthView"></div>',
      '<div class="monthHeader"></div>'
    ].join('');

    document.body.appendChild(div);

    controller = createController();

    busytimes = controller.busytime;

    subject = new Calendar.Views.Month({
      controller: controller,
      monthSelector: '#test .monthView',
      currentMonthSelector: '#test .monthHeader'
    });

  });

  test('initialization', function() {
    assert.equal(subject.monthSelector, '#test .monthView');
    assert.equal(subject.currentMonthSelector, '#test .monthHeader');
    assert.instanceOf(subject, Calendar.Responder);
    assert.equal(subject.controller, controller);
  });

  suite('events', function() {

    test('currentMonthChange', function() {
      var calledUpdate = null,
          calledActivateMonth = null;

      subject.updateCurrentMonth = function() {
        calledUpdate = true;
      };

      subject.activateMonth = function(month) {
        calledActivateMonth = month;
      };

      var date = new Date(2012, 1, 1);
      controller.setCurrentMonth(date);

      assert.isTrue(calledUpdate);
      assert.equal(calledActivateMonth, date);
    });

  });

  test('#monthsDisplayElement', function() {
    var el = document.querySelector('#test .monthView');

    assert.equal(
      subject.monthsDisplayElement(),
      el
    );
  });

  test('#currentMonthElement', function() {
    var el = document.querySelector('#test .monthHeader');

    assert.equal(
      subject.currentMonthElement(),
      el
    );
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

  test('#_renderCurrentMonth', function() {
    //September 2012
    controller.setCurrentMonth(new Date(2012, 8, 1));
    var result = subject._renderCurrentMonth();

    assert.ok(result);

    assert.include(
      result,
      '2012',
      'should render year'
    );

    assert.include(
      result,
      subject.monthNames[8],
      'should render September'
    );
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
    });

  });

  test('#_renderDayHeaders', function() {
    var result = subject._renderDayHeaders();
    assert.ok(result);
    subject.dayNames.forEach(function(day) {
      assert.include(result, day, 'should include header for:' + day);
    });
  });

  suite('#_renderMonth', function() {
    var days = [
      new Date(2012, 10, 1),
      new Date(2012, 10, 8),
      new Date(2012, 10, 15),
      new Date(2012, 10, 22),
      new Date(2012, 10, 29)
    ];

    test('should compose header and five weeks', function() {
      controller.currentMonth = days[0];
      var result = subject._renderMonth(new Date(2012, 10, 1));
      subject.currentMonth = days[0];

      assert.ok(result);

      days.forEach(function(date) {
        assert.include(
          result, subject._renderWeek(date),
          'should include week of ' + date.getDate()
        );
      });

    });
  });

  suite('month navigators', function() {
    var calledWith, now;

    setup(function() {
      calledWith = null;
      subject.activateMonth = function(mo) {
        calledWith = mo;
      };
      subject.render();
      now = controller.currentMonth;
    });

    test('#next', function() {
      var expected = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate()
      );

      subject.next();

      assert.deepEqual(
        calledWith.getFullYear(),
        expected.getFullYear()
      );

      assert.deepEqual(
        calledWith.getMonth(),
        expected.getMonth()
      );

    });

    test('#previous', function() {
      var expected = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate()
      );

      subject.previous();

      assert.deepEqual(
        calledWith.getFullYear(),
        expected.getFullYear()
      );

      assert.deepEqual(
        calledWith.getMonth(),
        expected.getMonth()
      );

    });

  });

  suite('#activateMonth', function() {
    var date = new Date(2012, 1, 1),
        container;

    setup(function() {
      controller.currentMonth = date;
      subject.activateMonth(date);
      container = document.getElementById('test');
    });

    test('should append new month into dom', function() {
      var el = container.querySelector('.monthView > section');

      assert.equal(subject.displayedMonthEl, el);

      assert.include(
        container.innerHTML,
        subject._renderMonth(date)
      );
    });

    test('when trying to re-render an existing calendar', function() {
      subject.activateMonth(date);
      var els = container.querySelectorAll('.monthView > section');
      assert.length(els, 1, 'should not re-render calendar');
    });

    suite('when there is an active month', function() {
      var newDate = new Date(2012, 2, 1);

      setup(function() {
        subject.activateMonth(newDate);
      });

      test('hides old month and displays new one', function() {
        var els = container.querySelectorAll('.monthView > section');
        assert.length(els, 2);

        assert.include(els[0].className, 'inactive');
        assert.equal(els[1].className, 'month');
      });

      test('when going back', function() {
        subject.activateMonth(date);
        var els = container.querySelectorAll('.monthView > section');
        assert.length(els, 2);

        assert.equal(els[0].className, 'month');
        assert.include(els[1].className, 'inactive');
      });
    });

  });

  test('#updateCurrentMonth', function() {
    controller.setCurrentMonth(new Date(2012, 8, 1));
    subject.updateCurrentMonth();

    assert.include(
      subject.currentMonthElement().innerHTML,
      subject._renderCurrentMonth()
    );
  });

  suite('#render', function() {
    var result;

    setup(function() {
      result = subject.render();
    });

    test('rendered elements', function() {
      var el = document.getElementById('test'),
          now = new Date();

      now.setDate(1);

      subject.render();

      assert.include(
        el.innerHTML,
        subject._renderMonth(now)
      );

      assert.deepEqual(controller.currentMonth, now);
    });

  });

});
