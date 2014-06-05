requireLib('template.js');
requireLib('templates/duration_time.js');

suiteGroup('Templates.DurationTime', function() {
  'use strict';

  var subject;

  suiteSetup(function() {
    Calendar.App.dateFormat = navigator.mozL10n.DateTimeFormat();
    subject = Calendar.Templates.DurationTime;
  });

  function renderDurationTime(options) {
    return subject.durationTime.render(options);
  }

  suite('#durationTime', function() {
    test('one day', function() {
      var startDate = new Date('1991-09-08T10:10:00');
      var endDate = new Date('1991-09-08T17:17:00');
      var durationDescription = renderDurationTime({
        startDate: startDate,
        endDate: endDate,
        isAllDay: false
      });

      assert.equal(
        durationDescription,
        'Sunday, September 08, 1991<br>' +
        'from 10:10 AM to 5:17 PM'
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

      assert.equal(
        durationDescription,
        'From 10:10 AM Sunday, September 08, 1991<br>' +
        'to 5:17 PM Sunday, September 15, 1991'
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
