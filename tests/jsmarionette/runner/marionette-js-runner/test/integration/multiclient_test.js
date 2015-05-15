'use strict';
var assert = require('assert');

marionette('multi-client', function() {
  var one = marionette.client();
  var two = marionette.client();

  test('ports are not equal', function() {
    assert.notEqual(
      one.driver.port,
      two.driver.port
    );
  });

  // run a quick test to verify client works
  function validateClient(name, client) {
    test(name, function() {
      var result = client.executeScript(function() {
        return 1 + 1;
      });
      assert.equal(result, 2);
    });
  }

  validateClient('first client', one);
  validateClient('second client', two);
});
