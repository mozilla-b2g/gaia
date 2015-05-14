'use strict';
// Test here is only to test SIGINT functionality.
marionette('stay blocked', function() {
  var client = marionette.client();

  test('block', function() {
    // Ensure we don't die on any startup errors...
    try {
      client.executeScript(function() {});
    } catch (e) {}

    client.setScriptTimeout(1000000);
    client.executeAsyncScript(function() {
    });
  });
});

