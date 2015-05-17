define(function(require) {
'use strict';

var Abstract = require('provider/abstract');

suite('Provider.Abstract', function() {
  var subject;

  setup(function() {
    subject = new Abstract();
  });

  test('initializer', function() {
    assert.ok(subject);
  });

  test('#eventCapabilities', function(done) {
    // just trying to assert the api contract is correct.
    subject.eventCapabilities({}, function(err, list) {
      if (err) {
        return done(err);
      }

      done(function() {
        assert.instanceOf(list, Object);
      });
    });
  });
});

});
