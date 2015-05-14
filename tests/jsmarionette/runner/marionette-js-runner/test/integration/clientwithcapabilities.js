'use strict';
var assert = require('assert');

marionette('client with capabilities', function() {
  // create a client and set desired capabilities.
  var client = marionette.client({}, undefined, { desiredCapability: true });

  test('test capabilities', function(done) {
    client.sessionCapabilities(function(err, capabilities) {
      // Capabilities are set
      assert.ok(capabilities.desiredCapability);
      done();
    });
  });
});
