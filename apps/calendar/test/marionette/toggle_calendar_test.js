'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('toggle calendar', function() {
  var app;
  var client = marionette.client({
    prefs: {
      // we need to disable the keyboard to avoid intermittent failures on
      // Travis (transitions might take longer to run and block UI)
      'dom.mozInputMethod.enabled': false,
      // Do not require the B2G-desktop app window to have focus (as per the
      // system window manager) in order for it to do focus-related things.
      'focusmanager.testmode': true,
    }
  });

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
  });

  function toggleLocalCalendar() {
    app.openSettingsView();
    app.settings.toggleCalendar();
    app.closeSettingsView();
  }

  suite('> regular event', function() {
    setup(function() {
      app.createEvent({
        title: 'Toggle Calendar Test',
        location: 'Some Place'
      });
      toggleLocalCalendar();
    });

    suite('disable calendar', function() {
      test('month view', function() {
        client.waitFor(function() {
          return app.monthDay.events.length === 0;
        });
        assert.equal(app.month.busyDots.length, 0, 'no busy dots');
      });

      test('week view', function() {
        app.openWeekView();
        client.waitFor(function() {
          return app.week.events.length === 0;
        });
      });

      test('day view', function() {
        app.openDayView();
        client.waitFor(function() {
          return app.day.events.length === 0;
        });

        // on day view hour can't be hidden otherwise it affects events on other
        // calendars and it also looks weird
        var hour = app.day.currentHour;
        assert(
          hour.displayed(),
          'hour should be displayed on day view'
        );

        // clicking on hour should trigger add event screen
        hour.click();
        app.editEvent.waitForDisplay();
      });
    });

    suite('enable calendar', function() {
      setup(toggleLocalCalendar);

      test('month view', function() {
        client.waitFor(function() {
          return app.monthDay.events.length;
        });
        assert.equal(app.month.busyDots.length, 1, 'busy dots');
      });

      test('week view', function() {
        app.openWeekView();
        client.waitFor(function() {
          return app.week.events.length;
        });
      });

      test('day view', function() {
        app.openDayView();
        client.waitFor(function() {
          return app.day.events.length;
        });
      });
    });
  });

  suite('> all day event', function() {
    setup(function() {
      app.createEvent({
        title: 'Toggle Calendar Test',
        location: 'Some Place',
        allDay: true
      });
      toggleLocalCalendar();
    });

    test('should not hide all day on day view', function() {
      app.openDayView();
      client.waitFor(function() {
        return app.day.events.length === 0;
      });
      assert.ok(
        app.day.allDay.displayed(),
        'all day should be displayed'
      );
    });
  });

  suite('> month dots', function() {
    setup(function() {
      // we use the day 15 as a reference to make sure each month have a single
      // dot, otherwise we might have intermittent failures during start/end of
      // the month
      var thisMonth = new Date();
      thisMonth.setDate(15);
      app.createEvent({
        title: 'This month',
        location: 'Here',
        startDate: thisMonth
      });

      var prevMonth = new Date(thisMonth);
      prevMonth.setMonth(thisMonth.getMonth() - 1);
      app.createEvent({
        title: 'Previous month',
        location: 'Past',
        startDate: prevMonth
      });

      var nextMonth = new Date(thisMonth);
      nextMonth.setMonth(thisMonth.getMonth() + 1);
      app.createEvent({
        title: 'Next month',
        location: 'Past',
        startDate: nextMonth
      });

      toggleLocalCalendar();

      client.waitFor(function() {
        return app.month.busyDots.length === 0;
      });
    });

    test('should disable on other months as well', function() {
      var month = app.month;
      assert.equal(month.busyDots.length, 0, 'no busy dots (current)');
      month.goToPrev();
      assert.equal(month.busyDots.length, 0, 'no busy dots (prev)');
      month.goToNext();
      assert.equal(month.busyDots.length, 0, 'no busy dots (current 2)');
      month.goToNext();
      assert.equal(month.busyDots.length, 0, 'no busy dots (next)');
    });
  });
});
