 /** global*/
'use strict';

suite('Promise', function() {
  var subject;
  setup(function() {
    subject = {};
    subject.promiseMethod = function() {
      return Promise.resolve();
    };
    subject.promiseFirstFunctionErrorMethod = function() {
      return new Promise((resolve) => {
        throw new Error('This is an error.');
      });
    };
    subject.promiseThenFunctionErrorMethod = function() {
      return Promise.resolve().then(() => {
        throw new Error('This is an error.');
      });
    };
  });
  test('what if error in the first method', function(done) {
    subject.promiseFirstFunctionErrorMethod().catch((err) => {
      done();
    });
  });

  test('what if error in the then method', function(done) {
    subject.promiseThenFunctionErrorMethod().catch((err) => {
      done();
    });
  });
});
