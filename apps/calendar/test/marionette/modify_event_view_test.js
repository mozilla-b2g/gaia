'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('modify event view', function() {
  var app;
  var client = marionette.client({
    prefs: {
      // we need to disable the keyboard to avoid intermittent failures on
      // Travis (transitions might take longer to run and block UI)
      'dom.mozInputMethod.enabled': false,
      // Do not require the B2G-desktop app window to have focus (as per the
      // system window manager) in order for it to do focus-related things.
      'focusmanager.testmode': true
    }
  });

  var startDate = new Date('Sep 08 2014 12:34:00'),
      startDatePreviousHour = new Date(startDate),
      startDatePreviousDay = new Date(startDate),
      startDateNextHour = new Date(startDate),
      startDateNextDay = new Date(startDate);

  startDatePreviousHour.setHours(startDate.getHours() - 1);
  startDatePreviousDay.setDate(startDate.getDate() - 1);
  startDateNextHour.setHours(startDate.getHours() + 1);
  startDateNextDay.setDate(startDate.getDate() + 1);

  suite('auto change end date and time', function() {
    var editEvent;

    setup(function() {
      app = new Calendar(client);
      editEvent = app.editEvent;

      app.launch({ hideSwipeHint: true });
      app.openModifyEventView();
      editEvent.startDate = startDate;
      editEvent.startTime = startDate;
      editEvent.endDate = startDateNextDay;
      editEvent.endTime = startDateNextHour;
    });

    test('end date should auto change to previous day', function() {
      editEvent.startDate = startDatePreviousDay;
      assert.equal(editEvent.endDate, '2014-09-08', 'change to previous day');
    });

    test('end time should auto change to previous hour', function() {
      editEvent.startTime = startDatePreviousHour;
      assert.equal(editEvent.endTime, '12:34:00', 'change to previous hour');
    });

    test('start datetime could not be after end datetime', function() {
      editEvent.endDate = startDatePreviousDay;
      assert.equal(
        editEvent.errors,
        'End date must come after start date',
        'show the correct error message'
      );
    });

    test('start datetime could not equal end datetime', function() {
      editEvent.endDate = startDate;
      editEvent.endTime = startDate;
      assert.equal(
        editEvent.errors,
        'End date must come after start date on the same date',
        'show the correct error message'
      );
    });
  });
});
