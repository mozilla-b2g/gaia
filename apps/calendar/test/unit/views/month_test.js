requireCommon('test/synthetic_gestures.js');

requireApp('calendar/test/unit/helper.js', function() {
  require('/shared/js/gesture_detector.js');
  requireLib('timespan.js');
  requireLib('templates/month.js');
  requireLib('views/month_child.js');
  requireLib('views/month.js');
});

suite('views/month', function() {
  var subject,
      app,
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
      '<div id="current-month-year">',
      '</div>',
      '<div id="month-view">',
        '<div id="month-displays"></div>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();
    controller = app.timeController;
    busytimes = app.store('Busytime');

    subject = new Calendar.Views.Month({
      app: app
    });

  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.View);
    assert.equal(subject.controller, controller);
    assert.equal(subject.element, document.querySelector('#month-view'));
  });

  test('#container', function() {
    assert.ok(subject.container);
  });

  test('#currentMonth', function() {
    assert.ok(subject.currentMonth);
  });

  suite('events', function() {

    test('monthChange', function() {
      var calledUpdate = null,
          calledActivateMonth = null;

      subject.updateCurrentMonth = function() {
        calledUpdate = true;
      };

      subject.activateMonth = function(month) {
        calledActivateMonth = month;
      };

      var date = new Date(2012, 1, 1);
      controller.move(date);

      assert.isTrue(calledUpdate);
      assert.deepEqual(calledActivateMonth, date);
    });

  });

  test('#onfirstseen', function() {
    assert.equal(subject.onfirstseen, subject.render);
  });

  test('#_renderCurrentMonth', function() {
    //September 2012
    controller.move(new Date(2012, 8, 1));
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
      now = controller.month;
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
      controller.move(date);
      id = Calendar.Calc.getMonthId(date);
      subject.activateMonth(date);
      container = document.getElementById('test');
    });

    test('should append new month into dom', function() {
      var el = subject.container.children[0];

      assert.ok(subject.children[id]);

      assert.equal(
        el.id,
        subject.children[id].element.id
      );
    });

    test('when trying to re-render an existing calendar', function() {
      subject.activateMonth(date);
      var els = subject.container.children;
      assert.length(els, 1, 'should not re-render calendar');
    });

    suite('when there is an active month', function() {
      var newDate = new Date(2012, 2, 1);

      setup(function() {
        subject.activateMonth(newDate);
      });

      test('hides old month and displays new one', function() {
        var els = subject.container.children;
        assert.length(els, 2);

        assert.ok(els[0].classList.contains('inactive'));
        assert.ok(!els[1].classList.contains('inactive'));
      });

      test('when going back', function() {
        subject.activateMonth(date);
        var els = subject.container.children;
        assert.length(els, 2);

        assert.ok(!els[0].classList.contains('inactive'));
        assert.ok(els[1].classList.contains('inactive'));
      });
    });

  });

  test('#updateCurrentMonth', function() {
    controller.move(new Date(2012, 8, 1));
    subject.updateCurrentMonth();

    assert.include(
      subject.currentMonth.innerHTML,
      subject._renderCurrentMonth()
    );
  });

  suite('#render', function() {
    var result;

    setup(function() {
      result = subject.render();
    });

    test('rendered elements', function() {
      var container = subject.container,
          now = new Date();

      now = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

      subject.render();

      assert.ok(subject.currentChild.element);

      assert.equal(
        container.children[0].id,
        subject.currentChild.element.id
      );

      assert.deepEqual(controller.month.valueOf(), now.valueOf());
    });

  });

});
