define(function(require) {
'use strict';

var SingleMonth = require('views/single_month');

suite('Views.SingleMonth', function() {
  var core;
  var subject;
  var container;

  setup(function() {
    core = testSupport.calendar.core();
    container = document.createElement('div');
    subject = new SingleMonth({
      date: new Date(2014, 6, 1),
      container: container
    });
  });

  teardown(function() {
    subject.destroy();
    container.innerHTML = '';
  });

  test('#create', function() {
    subject.create();

    var el = subject.element;
    assert.equal(el.className, 'month');
    assert.equal(el.getAttribute('role'), 'grid');
    assert.equal(el.getAttribute('aria-labelledby'), 'current-month-year');
    assert.equal(el.getAttribute('aria-readonly'), 'true');

    var headers = el.querySelectorAll('li[role="columnheader"]');
    Array.forEach(headers, (li, i) => {
      assert.equal(li.dataset.l10nId, `weekday-${i}-single-char`);
    });

    var days = el.querySelectorAll('.day');
    assert.lengthOf(days, 35);
    assert.lengthOf(subject.days, 35);

    // one ol is used for the table header, 5 for the weeks
    assert.lengthOf(el.querySelectorAll('ol[role="row"]'), 6);
  });

  suite('activate/deactivate', function() {
    var days;
    var tc;

    setup(function() {
      tc = core.timeController;
      core.timeController = {
        on: sinon.spy(),
        off: sinon.spy()
      };

      function makeDay() {
        return { activate: sinon.spy(), deactivate: sinon.spy() };
      }

      days = subject.days;
      subject.days = [ makeDay(), makeDay() ];

      sinon.stub(subject, '_onSelectedDayChange');
      sinon.spy(subject, 'oninactive');
    });

    teardown(function() {
      core.timeController = tc;
      subject.days = days;
      subject._onSelectedDayChange.restore();
      subject.oninactive.restore();
    });

    test('#activate', function() {
      subject.activate();
      sinon.assert.calledOnce(subject.days[0].activate, 'activate 1st day');
      sinon.assert.calledOnce(subject.days[1].activate, 'activate 2nd day');
      sinon.assert.calledWith(
        core.timeController.on,
        'selectedDayChange',
        subject
      );
      // view might be disabled with a selected day, or view might be enabled
      // with a preselected day
      sinon.assert.calledOnce(subject._onSelectedDayChange);
    });

    test('#deactivate: not active', function() {
      subject.deactivate();
      sinon.assert.notCalled(subject.oninactive);
      sinon.assert.notCalled(subject.days[0].deactivate);
      sinon.assert.notCalled(core.timeController.off);
    });

    test('#deactivate: active', function() {
      subject.activate();
      subject.deactivate();
      sinon.assert.calledOnce(subject.oninactive);
      sinon.assert.calledOnce(subject.days[0].deactivate);
      sinon.assert.calledWith(
        core.timeController.off,
        'selectedDayChange',
        subject
      );
    });
  });

  test('selectedDayChange', function() {
    subject.create();

    // no days selected by default
    var selected = subject.element.querySelectorAll('li.selected');
    assert.lengthOf(selected, 0);

    subject.handleEvent({
      type: 'selectedDayChange',
      data: [ new Date(2014, 6, 7) ]
    });

    selected = subject.element.querySelectorAll('li.selected');
    assert.lengthOf(selected, 1);
    assert.equal(selected[0].dataset.date, 'd-2014-6-7');

    subject.handleEvent({
      type: 'selectedDayChange',
      data: [ new Date(2014, 6, 23) ]
    });

    selected = subject.element.querySelectorAll('li.selected');
    assert.lengthOf(selected, 1);
    assert.equal(selected[0].dataset.date, 'd-2014-6-23');
  });

});

});
