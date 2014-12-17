'use strict';

suite('Defer > ', function() {
  var defer;

  setup(function(done) {
    testRequire([
      'modules/defer' 
    ], {}, function(Defer) {
      defer = Defer();
      done();
    });
  });

  test('with promise property', function() {
    assert.isTrue(defer.promise instanceof Promise);
  });

  test('with resolve method', function(done) {
    var message = 'Resolved';
    defer.resolve(message);
    Promise.resolve(defer.promise).then(function(resolvedMessage) {
      assert.equal(message, resolvedMessage);
    }, function() {
      // This will never be called
      assert.isTrue(false);
    }).then(done, done);
  });

  test('with reject method', function(done) {
    var message = 'Rejected';
    defer.reject(message);
    Promise.resolve(defer.promise).then(function() {
      // This will never be called
      assert.isTrue(false);
    }, function(rejectedMessage) {
      assert.equal(message, rejectedMessage);
    }).then(done, done);
  });
});
