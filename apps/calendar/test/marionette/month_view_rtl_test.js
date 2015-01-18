
'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('month view RTL', function() {
  var app;
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
  });

  test('Swipe tests', function() {

    app.openMonthView();

    var prevDate = new Date(app.headerContent.getAttribute('data-date'));
    app.swipeLeft();
    var nextDate = new Date(app.headerContent.getAttribute('data-date'));

    assert.ok(prevDate > nextDate, 'Swipe left should decrease month');

    app.swipeRight();
    var newOldDate = new Date(app.headerContent.getAttribute('data-date'));
    assert.ok(newOldDate > nextDate, 'Swipe right should increase month');
  });

});
