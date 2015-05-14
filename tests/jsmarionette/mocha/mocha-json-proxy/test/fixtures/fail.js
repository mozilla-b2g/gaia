'use strict';
suite('fail', function() {
  test('sync', function() {
    throw new Error('sync');
  });

  test('async', function(done) {
    done(new Error('async'));
  });

  test('uncaught', function() {
    process.nextTick(function() {
      throw new Error('woot');
    });
  });

});
