var assert = require('assert');
var APP_FAKE = 'http://fake.fake.fake';

marionette('net_error.html:', function() {
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });

  test('in an iframe', function() {
    // clear our content, and append an error iframe
    client.executeScript(function(src) {
      document.body.innerHTML = '';
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
      assert.ok(!client.findElement('#close-btn').displayed(),
                'Close button is hidden in iframe');
      assert.ok(!client.findElement('#retry-btn').displayed(),
                'Retry button is hidden in iframe');
      assert.ok(client.findElement('#retry-icon').displayed(),
                'Retry icon is displayed');
    }
  });
});
