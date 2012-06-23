requireCommon('test/synthetic_gestures.js');

requireApp('calendar/test/unit/helper.js', function() {
  requireApp('calendar/js/ext/gesture_detector.js');
  requireCalendarController();
  requireApp('calendar/js/templates/month.js');
  requireApp('calendar/js/views/month_child.js');
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
        container,
        id;

    setup(function() {
      controller.currentMonth = date;
      id = Calendar.Calc.getMonthId(date);
      subject.activateMonth(date);
      container = document.getElementById('test');
    });

    test('should append new month into dom', function() {
      var el = subject.monthsDisplayElement().children[0];

      assert.ok(subject.children[id]);

      assert.equal(
        el.id,
        subject.children[id].element.id
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

        assert.ok(els[0].classList.contains('inactive'));
        assert.ok(!els[1].classList.contains('inactive'));
      });

      test('when going back', function() {
        subject.activateMonth(date);
        var els = container.querySelectorAll('.monthView > section');
        assert.length(els, 2);

        assert.ok(!els[0].classList.contains('inactive'));
        assert.ok(els[1].classList.contains('inactive'));
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
      var container = subject.monthsDisplayElement(),
          now = new Date();

      now.setDate(1);

      subject.render();

      assert.ok(subject.currentChild.element);

      assert.equal(
        container.children[0].id,
        subject.currentChild.element.id
      );

      assert.deepEqual(controller.currentMonth.valueOf(), now.valueOf());
    });

  });

});
