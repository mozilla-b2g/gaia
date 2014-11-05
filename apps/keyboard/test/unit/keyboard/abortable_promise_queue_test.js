'use strict';

/* global AbortablePromiseQueue */

require('/js/keyboard/abortable_promise_queue.js');

suite('AbortablePromiseQueue', function() {
  var queue;

  setup(function() {
    queue = new AbortablePromiseQueue();
    queue.start();
  });

  teardown(function(done) {
    queue.run([function() {
      queue.stop();
      done();
    }]);
  });

  test('run()', function(done) {
    var tasks = [
      this.sinon.stub(),
      this.sinon.stub(),
      this.sinon.stub(),
      this.sinon.stub(),
      this.sinon.stub(),
      this.sinon.stub()
    ];

    var p = queue.run(tasks);
    p.then(function() {
      tasks.forEach(function(stub, i) {
        assert.isTrue(stub.calledOnce);
        if (i !== 0) {
          assert.isTrue(tasks[i - 1].calledBefore(stub));
        }
      });
    }).then(done, done);
  });

  test('abort()', function(done) {
    var tasks = [
      this.sinon.stub(),
      this.sinon.stub(),
      function() {
        queue.abort();
      },
      this.sinon.stub(),
      this.sinon.stub(),
      this.sinon.stub()
    ];

    var p = queue.run(tasks);
    p.then(function() {
      assert.isTrue(tasks[0].calledOnce);
      assert.isTrue(tasks[1].calledOnce);
      assert.isFalse(tasks[3].calledOnce);
      assert.isFalse(tasks[4].calledOnce);
      assert.isFalse(tasks[5].calledOnce);
    }).then(done, done);
  });

  test('run() another task', function(done) {
    var tasks2 = [
      this.sinon.stub()
    ];

    var tasks = [
      this.sinon.stub(),
      this.sinon.stub(),
      function() {
        queue.run(tasks2).then(function() {
          assert.isTrue(tasks[0].calledOnce);
          assert.isTrue(tasks[1].calledOnce);
          assert.isFalse(tasks[3].calledOnce);
          assert.isFalse(tasks[4].calledOnce);
          assert.isFalse(tasks[5].calledOnce);

          assert.isTrue(tasks2[0].calledOnce);
          assert.isTrue(tasks[1].calledBefore(tasks2[0]));
        }).then(done, done);
      },
      this.sinon.stub(),
      this.sinon.stub(),
      this.sinon.stub()
    ];

    queue.run(tasks);
  });
});
