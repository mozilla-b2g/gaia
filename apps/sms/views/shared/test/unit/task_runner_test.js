/* global TaskRunner, Promise */
'use strict';

require('/views/shared/js/task_runner.js');

suite('SMS App Unit-Test', function() {

  test('runs operations serially', function(done) {

    var taskQueue = new TaskRunner(),
        resolvers = [],
        promises = [],
        results = [];

    promises.push(new Promise(function(resolve, reject) {
      resolvers.push(resolve);
    }));
    promises.push(new Promise(function(resolve, reject) {
      resolvers.push(resolve);
    }));
    promises.push(new Promise(function(resolve, reject) {
      resolvers.push(resolve);
    }));

    promises.forEach(function(promise, i) {
      taskQueue.push(function() {
        results.push(i);
        return promise;
      });
    });

    resolvers[1]();
    resolvers[0]();
    resolvers[2]();
    taskQueue.push(function() {
      Promise.resolve().then(function(resolve, reject) {
        assert.deepEqual(results, [0, 1, 2]);
      }).then(done, done);
    });
  });
});
