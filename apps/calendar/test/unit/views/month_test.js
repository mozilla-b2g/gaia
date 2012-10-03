requireCommon('test/synthetic_gestures.js');

requireApp('calendar/test/unit/helper.js', function() {
  require('/shared/js/gesture_detector.js');

  requireLib('ordered_map.js');
  requireLib('timespan.js');
  requireLib('templates/month.js');
  requireLib('views/time_parent.js');
  requireLib('views/month_child.js');
  requireLib('views/month.js');
});

suite('views/month', function() {
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
      '<div id="current-month-year">',
      '</div>',
      '<div id="month-view">',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();
    controller = app.timeController;
    controller.move(new Date());

    busytimes = app.store('Busytime');

    subject = new Calendar.Views.Month({
      app: app
    });

  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.Views.TimeParent);
    assert.equal(subject.controller, controller);
    assert.equal(subject.element, document.querySelector('#month-view'));
  });

  suite('events', function() {

    test('dom: click', function() {
      subject.render();

      // find something with [data-date];
      var el = subject.element.querySelector(
        '[data-date]'
      );

      var date = Calendar.Calc.dateFromId(
        el.dataset.date
      );

      triggerEvent(el, 'click');
      assert.deepEqual(
        controller.selectedDay, date,
        'tapping element should change selected date'
      );
    });

    test('controller: monthChange', function() {
      var calledClear = null;
      var calledActivateTime = null;

      subject._clearSelectedDay = function() {
        calledClear = true;
      }

      subject._activateTime = function(month) {
        calledActivateTime = month;
      };

      var date = new Date(2012, 1, 1);
      controller.move(date);

      assert.ok(calledClear);
      assert.deepEqual(calledActivateTime, date);
    });

    test('controller: selectedDayChange', function() {
      var calledWith;
      var date = new Date();

      subject._selectDay = function() {
        calledWith = arguments;
      }

      controller.selectedDay = date;
      assert.deepEqual(calledWith[0], date);
    });
  });

  test('#_createChild', function() {
    var time = new Date(2012, 1, 1);
    var child = subject._createChild(time);

    assert.instanceOf(child, Calendar.Views.MonthChild);
    assert.deepEqual(child.date, time);
  });

  test('#_nextTime', function() {
    var date = new Date(2012, 4, 1);
    var expected = new Date(2012, 5, 1);

    assert.deepEqual(
      subject._nextTime(date),
      expected
    );
  });

  test('#_previousTime', function() {
    var date = new Date(2012, 5, 1);
    var expected = new Date(2012, 4, 1);

    assert.deepEqual(
      subject._previousTime(date),
      expected
    );
  });

  test('#onfirstseen', function() {
    assert.equal(subject.onfirstseen, subject.render);
  });

  suite('selected days', function() {
    function selected() {
      return subject.element.querySelectorAll(
        subject.selectors.selectedDay
      );
    }

    test('#_selectDay', function() {
      var now = new Date(2012, 0, 1);
      controller.move(now);
      subject.render();

      var select = new Date(2012, 0, 5);
      subject._selectDay(select);

      var dayEl = selected();
      assert.length(dayEl, 1, 'should highlight selected');

      dayEl = dayEl[0];

      assert.ok(dayEl.id, 'should have id');
      assert.include(dayEl.id, Calendar.Calc.getDayId(
        select
      ));
    });

    test('#_clearSelectedDay', function() {
      subject.render();
      assert.length(selected(), 0);

      var el = subject.element.querySelector('li');
      el.classList.add('selected');

      assert.length(selected(), 1);
      subject._clearSelectedDay();

      assert.length(selected(), 0);
    });

  });

  test('#render', function() {
    var time = new Date(2012, 1, 1);
    controller.move(time);
    subject.render();

    assert.equal(subject.children.length, 3);
    assert.length(subject._activeChildren, 1);
    assert.ok(
      subject._activeChildren.get(subject._getId(time))
    );
  });

});
