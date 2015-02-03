'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('day view RTL', function() {
  var app;
  var day;
  var month;
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
    app.openDayView();
    day = app.day;
    month = app.month;
  });

  test('header copy should not overflow', function() {
    // XXX: we don't use app.checkOverflow() because of Bug 971691
    // 20 chars is a "safe" limit if font-family is Fira Sans
    assert.operator(app.headerContent.text().length, '<', 21);
  });

  suite('Swipe tests', function() {
    setup(function() {
      day.waitForHourScrollEnd();
    });

    test('swipe to the next day', function() {
      var todayDate = new Date(app.headerContent.getAttribute('data-date'));
      app.swipeRight();
      var nextDate = new Date(app.headerContent.getAttribute('data-date'));

      assert.ok(todayDate < nextDate, 'Swipe left should increase date.');
    });

    test('swipe to the previous day', function() {
      var todayDate = new Date(app.headerContent.getAttribute('data-date'));
      app.swipeLeft();
      var previousDate = new Date(app.headerContent.getAttribute('data-date'));

      assert.ok(todayDate > previousDate, 'Swipe right should decrease date.');
    });

    test('swipe from and back to today', function() {
      var todayDate = new Date(app.headerContent.getAttribute('data-date'));
      app.swipeRight();
      app.swipeLeft();

      client.helper.waitFor(function() {
        var newDate = new Date(app.headerContent.getAttribute('data-date'));
        return newDate.getFullYear() === todayDate.getFullYear() &&
          newDate.getMonth() === todayDate.getMonth() &&
          newDate.getDay() === todayDate.getDay();
      });
    });
  });
});
