'use strict';

suite('AsyncQueue', function() {
  var AsyncQueue;
  suiteSetup(function(done) {
    require(['async_queue'], function(async_queue) {
      AsyncQueue = async_queue;
      done();
    });
  });

  test('runs operations serially', function(done) {
    // Construct the string "hello", one character at a time. We
    // assign each task different durations to ensure that no matter
    // how long each operation takes, the result remains in the same
    // order as the tasks were added.
    var result = '';
    var queue = new AsyncQueue();

    var clock = this.sinon.useFakeTimers();

    function addTask(timeout, character) {
      queue.push(function(taskFinished) {
        setTimeout(function() {
          result += character;
          taskFinished();
        }, timeout);
        clock.tick(10);
      });
    }

    addTask(50, 'h');
    addTask(10, 'e');
    addTask(0, 'l');
    addTask(30, 'l');
    addTask(20, 'o');

    queue.push(function() {
      assert.equal(result, 'hello');
      clock.restore();
      done();
    });

    clock.tick(100);
  });

  test('continues after queue is empty', function(done) {
    var queue = new AsyncQueue();
    queue.push(function(taskFinished) {
      taskFinished();
      setTimeout(function() {
        queue.push(function() {
          done();
        });
      }, 0);
    });
  });

});

