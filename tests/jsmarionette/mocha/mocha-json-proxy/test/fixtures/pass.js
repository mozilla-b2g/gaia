'use strict';
suite('pass', function() {
  test('sync', function() {});
  test('async', function(done) { process.nextTick(done); });
});
suite('pass 2', function() {
  test('sync 2', function() {});
});
