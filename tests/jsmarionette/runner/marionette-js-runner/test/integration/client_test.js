'use strict';
var assert = require('assert');

marionette('default client', function() {
  // create a client.
  var client = marionette.client();

  test('is sync', function() {
    var result = client.executeScript(function() {
      // attempt to dirty global state
      window.wrappedJSObject.I_WAS_BAD = true;

      // do complicated math in gecko
      return 1 + 1;
    });

    // math works
    assert.equal(result, 2, 'tests are async');

    // state is saved inside of same test
    var bad = client.executeScript(function() {
      return window.wrappedJSObject.I_WAS_BAD;
    });
    assert.ok(bad, 'state is saved');
  });

  test('host is reset is each test', function() {
    var bad = client.executeScript(function() {
      return window.wrappedJSObject.I_WAS_BAD;
    });
    assert.ok(!bad, 'state is clean');
  });
});
