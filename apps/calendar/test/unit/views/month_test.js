define(function(require) {
'use strict';

var Calc = require('common/calc');
var Month = require('views/month');

requireCommon('test/synthetic_gestures.js');

suite('Views.Month', function() {
  var subject,
      app,
      controller,
      triggerEvent;

  suiteSetup(function(done) {
    triggerEvent = testSupport.calendar.triggerEvent;
    app = testSupport.calendar.app();
    app.db.open(done);
  });

  suiteTeardown(function() {
    app.db.close();
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

    controller = app.timeController;
    controller.move(new Date());

    subject = new Month({ app: app });
  });

  teardown(function() {
    subject.destroy();
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  test('initialization', function() {
    assert.equal(subject.element, document.querySelector('#month-view'));
  });

  suite('events', function() {

    setup(function() {
      subject._initEvents();
    });

    test('dom: click', function() {
      subject.onfirstseen();

      var el = subject.element.querySelector('.month-day');
      var date = Calc.dateFromId(el.dataset.date);

      triggerEvent(el, 'click');
      assert.deepEqual(
        controller.selectedDay, date,
        'tapping element should change selected date'
      );
    });

/*
// These tests are currently failing and have been temporarily disabled as per
// Bug 838993. They should be fixed and re-enabled as soon as possible as per
// Bug 840489.
    test('dom: dbltap', function() {
      var calledWith;
      app.router.show = function(url) {
        calledWith = url;
      };

      subject.render();

      // find something with [data-date];
      var el = subject.element.querySelector(
        '[data-date]'
      );

      triggerEvent(el, 'dbltap');

      assert.equal(
        calledWith,
        '/day/',
        'double tapping on date should activate day view'
      );

    });
*/

    test('controller: monthChange', function() {
      var calledActivateTime = null;

      subject.changeDate = function(month) {
        calledActivateTime = month;
      };

      var date = new Date(2012, 1, 1);
      controller.move(date);

      assert.deepEqual(calledActivateTime, date);
    });

  });

  test('#_onswipe', function() {
    var date = new Date(2012, 4, 1);
    var expected = new Date(2012, 3, 1);
    subject.date = date;

    subject._onswipe({
      dy: 0,
      dx: window.innerWidth / 5,
      direction: 'right'
    });

    assert.deepEqual(
      app.timeController.selectedDay,
      expected,
      'selects first day of previous month'
    );
  });

  test('#_onwheel', function() {
    var date = new Date(2012, 4, 10);
    var expected = new Date(2012, 5, 1);
    subject.date = date;

    subject._onwheel({
      deltaMode: window.WheelEvent.DOM_DELTA_PAGE,
      DOM_DELTA_PAGE: window.WheelEvent.DOM_DELTA_PAGE,
      deltaX: 1,
      deltaY: 0
    });

    assert.deepEqual(
      app.timeController.selectedDay,
      expected,
      'selects first day of month'
    );
  });

  test('#_nextTime', function() {
    subject.date = new Date(2012, 4, 1);
    assert.deepEqual(
      subject._nextTime(),
      new Date(2012, 5, 1)
    );
  });

  test('#_previousTime', function() {
    subject.date = new Date(2012, 5, 1);
    assert.deepEqual(
      subject._previousTime(),
      new Date(2012, 4, 1)
    );
  });

  test('#changeDate', function() {
    var base;

    function dayIds() {
      var months = subject.element.querySelectorAll('section.month');
      return Array.map(months, el => el.dataset.date).join(', ');
    }

    base = new Date(2014, 10, 11);
    subject.changeDate(base);
    assert.ok(subject.currentFrame.active, 'currentFrame.active');
    assert.deepEqual(
      subject.currentFrame.date,
      new Date(2014, 10, 1),
      'base date should always be first day of the month'
    );
    assert.equal(
      dayIds(),
      'd-2014-10-1',
      '1: single element at first call'
    );

    base = new Date(2015, 0, 1);
    subject.changeDate(base);
    assert.deepEqual(subject.currentFrame.date, base, '2: currentFrame.date');
    assert.equal(
      dayIds(),
      'd-2014-10-1, d-2015-0-1',
      '2: month elements should be sorted'
    );

    base = new Date(2014, 3, 1);
    subject.changeDate(base);
    assert.deepEqual(subject.currentFrame.date, base, '3: currentFrame.date');
    assert.equal(
      dayIds(),
      'd-2014-3-1, d-2014-10-1, d-2015-0-1',
      '3: month elements should be sorted'
    );
  });
});

});
