'use strict';
var assert = require('assert');

marionette('client async', function() {
  var Tcp = require('marionette-client').Drivers.Tcp;
  var client = marionette.client({}, Tcp);

  function onePlusOne() {
    return 1 + 1;
  }

  test('async magic', function(done) {
    var isAsync = false;
    client.executeScript(onePlusOne, function(err, result) {
      if (!isAsync) return done(new Error('is sync!'));
      assert.equal(result, 2);
      done();
    });
    isAsync = true;
  });

});
