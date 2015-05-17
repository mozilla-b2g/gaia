'use strict';
suite('a test', function() {
  console.log('before running test log');
  test('test one', function() {
  });

  suite('another suite fail', function() {
    test('throw', function() {
      throw new Error('xxx');
    });
  });

  test('multiple console logs', function(done) {
    setTimeout(function() {
      console.log('works');
      done();
    });
  });
});
