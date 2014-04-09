'use strict';

/**
 * The below screenshot reference tests are only supported on Travis currently.
 * For more details, please refer to http://bugzil.la/984726.
 */

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert,
    fs = require('fs');

marionette('screenshot reference test', function() {
  var client = marionette.client(),
      app = null;

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
  });

  test('should show correct advanced settings view', function() {
    var expectedMonthView = fs.readFileSync(__dirname +
          '/images/travis/launch_timing_month_view.base64', 'utf8');

    assert.equal(
      client.screenshot(),
      expectedMonthView,
      'screenshot images should be the same'
    );
  });
});
