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

  test('multiple months (eg. "Dec 2013 Jan 2014")', function() {
    // match the header on a multi week view, we just check for 2 dates since
    // month names will have different patterns on each locale
    var multiMonthPattern = /\d{4}.+\d{4}$/;
    var headerText;
    do {
      app.swipe();
      headerText = app.waitForElement('monthYearHeader').text();
    } while (!multiMonthPattern.test(headerText));

    // we are not checking for real overflow since font is different on each
    // environment (Travis uses a wider font) which would make test to fail
    // https://groups.google.com/forum/#!topic/mozilla.dev.gaia/DrQzv7qexw4
    assert.operator(headerText.length, '<', 21, 'header should not overflow');
  });

});
