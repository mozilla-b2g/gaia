define(function(require) {
'use strict';

var Abstract = require('provider/abstract');

suite('Provider.Abstract', function() {
  var subject;
  var app;

  setup(function() {
    app = testSupport.calendar.app();
    subject = new Abstract({ app: app });
  });

  test('initializer', function() {
    assert.equal(subject.app, app);
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
