'use strict';

var Calendar = require('./lib/calendar');

marionette('toggle calendar', function() {
  var app;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });

    app.createEvent({
      title: 'Toggle Calendar Test',
      location: 'Some Place'
    });

    toggleLocalCalendar();
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

  suite('disable calendar', function() {
    test('month view', function() {
      waitForElementToDisappear(app.monthDay.events[0]);
    });

    test('week view', function() {
      app.openWeekView();
      waitForElementToDisappear(app.week.events[0]);
    });

    test('day view', function() {
      app.openDayView();
      waitForElementToDisappear(app.day.events[0]);
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
