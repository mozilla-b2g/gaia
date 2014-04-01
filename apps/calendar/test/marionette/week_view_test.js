'use strict';

var Calendar = require('./calendar'),
    assert = require('chai').assert;

marionette('week view', function() {
  var app;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });

    // Go to week view.
    app.findElement('weekButton').click();
  });

  test('swipe should change date', function() {
    var prevText = app.waitForElement('monthYearHeader').text();
    var swipeCount = 20;
    var headerCount = 0;

    while (swipeCount--) {
      app.swipe();

      var text = app.waitForElement('monthYearHeader').text();

      // we are not checking for real overflow since font is different on each
      // environment (Travis uses a wider font) which would make test to fail
      // https://groups.google.com/forum/#!topic/mozilla.dev.gaia/DrQzv7qexw4
      assert.operator(text.length, '<', 21, 'header should not overflow');

      if (prevText !== text) {
        prevText = text;
        headerCount += 1;
      }
    }

    assert.operator(headerCount, '>', 1, 'should update header at least 2x');
  });

  test('multiple months (eg. "Dec 2013 Jan 2014")', function() {
    // match the header on a multi week view, we just check for 2 dates since
    // month names will have different patterns on each locale
    var multiMonthPattern = /\d{4}.+\d{4}$/;
    var swipeCount = 30;
    var nMatches = 0;
    var headerText;

    while (swipeCount--) {
      headerText = app.waitForElement('monthYearHeader').text();
      if (multiMonthPattern.test(headerText)) {
        nMatches += 1;
      }
      app.swipe();
    }

    assert.operator(nMatches, '>', 0, 'header with multiple months');

  });

});
