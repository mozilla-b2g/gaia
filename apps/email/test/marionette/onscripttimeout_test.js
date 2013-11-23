/**
 * @fileoverview This just tests that setting onScriptTimeout
 *     on the marionette client fires the appropriate callback
 */
marionette('Marionette.Client#onScriptTimeout', function() {
  var client = marionette.client();

  test('should fire callback when set', function(done) {
    client.onScriptTimeout = function() {
      client.onScriptTimeout = null;
      console.log('[onscripttimeout_test.js] Can you see me?');
      done();
    };

    client.setScriptTimeout(2000);
    client.executeAsyncScript(function() {
      setTimeout(marionetteScriptFinished, 2001);
    });
  });
});
