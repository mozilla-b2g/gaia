define(function(require) {
'use strict';

var DurationTime = require('templates/duration_time');

suite('DurationTime', function() {
  var subject;

  suiteSetup(function() {
    subject = DurationTime;
  });

  function renderDurationTime(options) {
    return subject.durationTime.render(options);
  }

  suite('#durationTime', function() {
    var container;

    setup(function() {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    teardown(function() {
      container.parentNode.removeChild(container);
    });

    test('one day', function() {
      var startDate = new Date('1991-09-08T10:10:00');
      var endDate = new Date('1991-09-08T17:17:00');
      var durationDescription = renderDurationTime({
        startDate: startDate,
        endDate: endDate,
        isAllDay: false
      });

      container.innerHTML = durationDescription;
      var spans = container.querySelectorAll('span');
      assert.include(
        spans[0].dataset.date,
        'Sun Sep 08 1991 10:10:00',
        'start time'
      );
      assert.include(
        spans[1].dataset.date,
        'Sun Sep 08 1991 17:17:00',
        'end time'
      );
    });

    test('multiple day', function() {
      var startDate = new Date('1991-09-08T10:10:00');
      var endDate = new Date('1991-09-15T17:17:00');
      var durationDescription = renderDurationTime({
        startDate: startDate,
        endDate: endDate,
        isAllDay: false
      });

      container.innerHTML = durationDescription;
      var spans = container.querySelectorAll('span');
      assert.include(
        spans[0].dataset.date,
        'Sun Sep 08 1991 10:10:00',
        'start time'
      );
      assert.include(
        spans[1].dataset.date,
        'Sun Sep 15 1991 17:17:00',
        'end time'
      );
    });

    test('one all day', function() {
      var startDate = new Date('1991-09-08T00:00:00');
      var endDate = new Date('1991-09-09T00:00:00');
      var durationDescription = renderDurationTime({
        startDate: startDate,
        endDate: endDate,
        isAllDay: true
      });

      assert.equal(
        durationDescription,
        'All day<br>' +
        'Sunday, September 08, 1991'
      );
    });

    test('multiple all day', function() {
      var startDate = new Date('1991-09-08T00:00:00');
      var endDate = new Date('1991-09-15T00:00:00');
      var durationDescription = renderDurationTime({
        startDate: startDate,
        endDate: endDate,
        isAllDay: true
      });

      assert.equal(
        durationDescription,
        'All day from Sunday, September 08, 1991<br>' +
        'to Saturday, September 14, 1991'
      );
    });
  });
});

});
