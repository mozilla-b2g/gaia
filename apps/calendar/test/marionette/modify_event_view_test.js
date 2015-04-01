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
  var editEvent;

  setup(function() {
    app = new Calendar(client);
    editEvent = app.editEvent;
    app.launch();
    app.openModifyEventView();
    // we need a title or location otherwise event can't be saved
    editEvent.title = 'Reminder Test';
  });

  suite('reminders', function() {
    test('default', function() {
      assert.deepEqual(editEvent.reminders, ['5 minutes before', 'None']);
    });

    test('default allday', function() {
      editEvent.allDay = true;
      client.waitFor(function() {
        return editEvent.reminders[0] !== '5 minutes before';
      });
      assert.deepEqual(editEvent.reminders, ['On day of event', 'None']);
    });

    test('set to none', function() {
      editEvent.setReminderValue('None', 0);
      client.waitFor(function() {
        return editEvent.reminders.length === 1;
      });
      assert.deepEqual(editEvent.reminders, ['None']);
    });

    test('multiple reminders', function() {
      var reminders = [
        'At time of event',
        '5 minutes before',
        '15 minutes before',
        '30 minutes before',
        '1 hour before',
        '2 hours before',
        '1 day before'
      ];
      editEvent.reminders = reminders;
      assert.deepEqual(
        editEvent.reminders,
        // maximum amount of reminders is 5, so it will override the last one
        reminders.slice(0, 4).concat(['1 day before'])
      );
    });

    test('duplicates', function() {
      // it should only save a single reminder if user adds duplicates
      editEvent.reminders = [
        '15 minutes before',
        '15 minutes before',
        '15 minutes before',
        '15 minutes before'
      ];
      editEvent.save();
      app.monthDay.waitForDisplay();
      app.monthDay.events[0].click();
      app.readEvent.waitForDisplay();
      app.readEvent.edit();
      editEvent.waitForDisplay();
      assert.deepEqual(editEvent.reminders, ['15 minutes before', 'None']);
    });
  });

  suite('auto change end date and time', function() {
    var startDate = new Date('Sep 08 2014 12:34:00');
    var startDatePreviousHour = new Date(startDate);
    var startDatePreviousDay = new Date(startDate);
    var startDateNextHour = new Date(startDate);
    var startDateNextDay = new Date(startDate);

    startDatePreviousHour.setHours(startDate.getHours() - 1);
    startDatePreviousDay.setDate(startDate.getDate() - 1);
    startDateNextHour.setHours(startDate.getHours() + 1);
    startDateNextDay.setDate(startDate.getDate() + 1);

    setup(function() {
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
        'The event cannot end before its start date',
        'show the correct error message'
      );
    });

    test('start datetime could not equal end datetime', function() {
      editEvent.endDate = startDate;
      editEvent.endTime = startDate;
      assert.equal(
        editEvent.errors,
        'The event cannot end before its start time',
        'show the correct error message'
      );
    });

    suite('12/24 hour format', function() {
      test('default format: 12 hour', function() {
        assert.equal(editEvent.startTimeLocale.text(), '12:34 PM',
          'check start time locale');
        assert.equal(editEvent.endTimeLocale.text(), '1:34 PM',
          'check end time locale');
      });

      test('switch to 24 hour format', function() {
        app.switch24HourTimeFormat();
        assert.equal(editEvent.startTimeLocale.text(), '12:34',
          'check start time locale');
        assert.equal(editEvent.endTimeLocale.text(), '13:34',
          'check end time locale');
      });
    });
  });
});
