'use strict';
var assert = require('assert');

marionette('client with options', function() {
  // create a client.
  var options = {
    screen: {
      width: 353,
      height: 577
    }
  };
  var client = marionette.client({hostOptions: options});

  test('screen size', function() {
    var result = client.executeScript(function() {
      return { width: window.innerWidth,
               height: window.innerHeight};
    });

    assert.equal(result.width, options.screen.width);
    assert.equal(result.height, options.screen.height);
  });
});
