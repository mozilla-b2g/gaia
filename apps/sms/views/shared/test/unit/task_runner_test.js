/* global TaskRunner, Promise */
'use strict';

require('/views/shared/js/task_runner.js');

suite('Task Runner', function() {
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

  test('forwards results, gobbles results for next task', function(done) {
    var taskQueue = new TaskRunner();
    var task1 = sinon.stub().returns(42);
    var task2 = sinon.stub();
    var stub = sinon.stub();

    taskQueue.push(task1).then(stub);
    taskQueue.push(task2);
    taskQueue.flush().then(() => {
      sinon.assert.callOrder(task1, task2);
      sinon.assert.neverCalledWith(task2, 42);
      sinon.assert.calledWithExactly(stub, 42);
    }).then(done, done);
  });

  test('forwards errors, gobbles errors for next task', function(done) {
    var taskQueue = new TaskRunner();
    var task1 = sinon.stub().throws();
    var task2 = sinon.stub();
    var stub = sinon.stub();

    taskQueue.push(task1).catch(stub);
    taskQueue.push(task2);
    taskQueue.flush().then(() => {
      sinon.assert.callOrder(task1, task2);
      sinon.assert.neverCalledWith(task2, sinon.match.instanceOf(Error));
    }).then(done, done);
  });
});
