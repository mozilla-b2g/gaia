
'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('week view RTL', function() {
  var app, week;

  var client = marionette.client({
    prefs: {
      // we need to disable the keyboard to avoid intermittent failures on
      // Travis (transitions might take longer to run and block UI)
      'dom.mozInputMethod.enabled': false,
      // Do not require the B2G-desktop app window to have focus (as per the
      // system window manager) in order for it to do focus-related things.
      'focusmanager.testmode': true,
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'language.current': 'ar'
    }
  });

  setup(function() {
    app = new Calendar(client);
    app.launch();
    week = app.week;
    app.openWeekView();
  });

  test('swipe right should increase date', function() {
    var currentDate = new Date(week.allDay.getAttribute('data-date'));
    // we swipe left until the date change
    var newDate;
    client.helper.waitFor(function() {
      app.swipeRight();
      newDate = new Date(week.allDay.getAttribute('data-date'));
      return newDate !== currentDate;
    });
    // check that the new date is after the old one
    assert.ok(newDate > currentDate, 'Swipe left should increase date');
  });

  test('swipe left should decrease date', function() {
    var currentDate = new Date(week.allDay.getAttribute('data-date'));
    // we swipe left until the date change
    var newDate;
    client.helper.waitFor(function() {
      app.swipeLeft();
      newDate = new Date(week.allDay.getAttribute('data-date'));
      return newDate !== currentDate;
    });
    // check that the new date is after the old one
    assert.ok(newDate < currentDate, 'Swipe left should increase date');
  });

});

