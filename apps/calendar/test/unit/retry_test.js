/* global mochaPromise */
suite('retry', function() {
  'use strict';
  var subject;

  setup(function() {
    subject = Calendar.retry;
  });

  mochaPromise(test, 'success after failure', function() {
    var count = 0;
    return subject(() => { return Promise.resolve(++count > 4); }, null, 5)
    .then(() => {
      assert.strictEqual(count, 5);
    });
  });

  mochaPromise(test, 'all failure all the time', function() {
    return subject(() => { return Promise.resolve(false); }, null, 5)
    .catch((err) => {
      assert.strictEqual(err.name, 'RetryError');
      assert.strictEqual(err.msg, 'No success here :(');
    });
  });
});
