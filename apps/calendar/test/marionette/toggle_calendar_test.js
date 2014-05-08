'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('toggle calendar', function() {
  var app;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
  });

  function toggleLocalCalendar() {
    app.openSettingsView();
    app.settings.toggleCalendar();
    app.closeSettingsView();
  }

  // the UI only gets updated after a few ms (data is persisted asynchronously
  // and after a delay), so we need to wait "displayed" value to change - will
  // timeout on test failure
  function waitForElement(el) {
    client.helper.waitForElement(el);
  }

  function waitForElementToDisappear(el) {
    client.helper.waitForElementToDisappear(el);
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
        var event = app.monthDay.events[0];
        waitForElementToDisappear(event);
        // we cannot hide hour since there might be other events from different
        // calendars that happens at same time (which would also be hidden)
        // this behavior is better than previous one and will be changed after
        // we implement the visual refresh (it's a good compromise)
        var hour = client.helper.closest(event, '.hour');
        assert(
          hour.displayed(),
          'hour should be displayed on month view'
        );
      });

      test('week view', function() {
        app.openWeekView();
        waitForElementToDisappear(app.week.events[0]);
      });

      // Disabled bug 1007519
      test.skip('day view', function() {
        app.openDayView();
        var event = app.day.events[0];
        waitForElementToDisappear(event);

        // on day view hour can't be hidden otherwise it affects events on other
        // calendars and it also looks weird
        var hour = client.helper.closest(event, '.hour');
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
        waitForElement(app.monthDay.events[0]);
      });

      test('week view', function() {
        app.openWeekView();
        waitForElement(app.week.events[0]);
      });

      test('day view', function() {
        app.openDayView();
        waitForElement(app.day.events[0]);
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
      var event = app.day.events[0];
      waitForElementToDisappear(event);
      assert.ok(
        client.helper.closest(event, '.hour-allday').displayed(),
        'all day should be displayed'
      );
    });
  });
});
