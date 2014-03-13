'use strict';

var Calendar = require('./calendar'),
    assert = require('chai').assert;

marionette('toggle calendar', function() {
  var app;
  var client = marionette.client();

suite.only('toggle', function() {

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
    app.goToSettingsView();
    app.findElement('settingsCalendarsLocal').click();
    app.leaveSettingsView();
  }

  suite('disable calendar', function() {

    test('month view', function() {
      assert(
        !app.findElement('monthViewDayEvent').displayed(),
        'event should be hidden on day view'
      );
    });

    test('week view', function() {
      app.waitForElement('weekButton').click();
      app.waitForWeekView();
      assert(
        !app.findElement('weekViewEvent').displayed(),
        'event should be hidden on week view'
      );
    });

    test('day view', function() {
      app.waitForElement('dayButton').click();
      app.waitForDayView();
      assert(
        !app.findElement('dayViewEvent').displayed(),
        'event should be hidden on day view'
      );
    });
  });


  suite('enable calendar', function() {

    setup(toggleLocalCalendar);

    test('month view', function() {
      assert(
        app.findElement('monthViewDayEvent').displayed(),
        'event should be displayed on day view'
      );
    });

    test('week view', function() {
      app.waitForElement('weekButton').click();
      app.waitForWeekView();
      assert(
        app.findElement('weekViewEvent').displayed(),
        'event should be displayed on week view'
      );
    });

    test('day view', function() {
      app.waitForElement('dayButton').click();
      app.waitForDayView();
      assert(
        app.findElement('dayViewEvent').displayed(),
        'event should be displayed on day view'
      );
    });
  });

});

});
