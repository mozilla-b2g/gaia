'use strict';

var Calendar = require('./calendar'),
    assert = require('assert');

marionette('month view', function() {
  var app;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
    client.waitFor(app.isMonthViewActive.bind(app));
  });

  test.skip('week day headers should only have one letter', function() {
    // Bug in marionette? Why can't we find #month-days?!
    // ie MTWTFSS
    assert.equal(app.waitForElement('weekdayHeaders').text().length, 7);
  });

  test.skip('day number text should be centered', function() {
    // TODO(gaye)
  });

  test.skip('should gray out numbers outside current month', function() {
    // Either the first or last day chronologically should be
    // outside of the current month.
    // TODO(gaye)
  });

  test.skip('should not change background outside current month', function() {
    // Either the first or last day chronologically should be
    // outside of the current month.
    // TODO(gaye)
  });

  test.skip('should show one dot for one event', function() {
    // TODO(gaye)
  });

  test.skip('should show two dots for two events', function() {
    // TODO(gaye)
  });

  test.skip('should show three dots for three events', function() {
    // TODO(gaye)
  });

  test.skip('should show three dots for four events', function() {
    // TODO(gaye)
  });

  test.skip('should show calendar icon with correct day number', function() {
    // TODO(gaye)
  });

  test.skip('should have today date in day events section', function() {
    // TODO(gaye)
  });

  test.skip('should display times with dates', function() {
    // TODO(gaye)
  });

  test.skip('should show today event title', function() {
    // TODO(gaye)
  });

  test.skip('should show today event location', function() {
    // TODO(gaye)
  });
});
