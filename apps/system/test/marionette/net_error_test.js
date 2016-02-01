'use strict';

/* Bug 1148165, disabled this test for high level of intermittent

var assert = require('assert');
var APP_FAKE = 'http://fake.fake.fake';

marionette('net_error.html:', function() {
  var client = marionette.client();

  var system;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('in an iframe', function() {
    // clear our content, and append an error iframe
    client.executeScript(function(src) {
      var frame = document.createElement('iframe');
      frame.id = 'error-frame';
      frame.src = src;
      document.body.appendChild(frame);
    }, [APP_FAKE]);

    // Marionette will throw an error when attempting to
    // switch to a frame that's in an error state.
    // However, we can ignore this error since we need to
    // test the about:neterror page itself.
    // https://bugzilla.mozilla.org/show_bug.cgi?id=936301#c3
    var frame = client.findElement('#error-frame');
    try {
      client.switchToFrame(frame);
    } catch (e) {
      // do nothing
    } finally {
      // now we can test the about:neterror page

      // Wait for the retry icon to show up.
      client.helper.waitForElement('#retry-icon');
      // Make sure close and retry buttons are hidden.
      assert.ok(!client.findElement('#close-btn').displayed(),
                'Close button is hidden in iframe');
      assert.ok(!client.findElement('#retry-btn').displayed(),
                'Retry button is hidden in iframe');
    }
  });
});
*/
