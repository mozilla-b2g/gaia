'use strict';
/**
 * @fileoverview A marionette test that simply logs something in gecko.
 */
suite('console proxy', function() {
  this.timeout('10s');
  var client = marionette.client();

  test('log in host', function(done) {
    // logging is asynchronous so wait a bit longer then just the execution
    // so we actually get some logs...
    client.executeScript(function() {
      console.log('What does the fox say');
    });
    setTimeout(done, 2000);
  });
});

