'use strict';

/*global marionette, test*/
marionette('System', function() {
  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  test('Boot-up sequence succeeds', function() {
    // A timeout will cause our test to throw and fail.
    var body = client.findElement('body');
    client.waitFor(function() {
      return body.getAttribute('ready-state') == 'fullyLoaded';
    }, { timeout: 120000 });
  });
});
