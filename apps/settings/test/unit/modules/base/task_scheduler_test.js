'use strict';

suite('TaskScheduler >', function() {
  setup(function(done) {
    testRequire(['modules/base/task_scheduler'], (TaskScheduler) => {
      this.taskScheduler = TaskScheduler();
      done();
    });
  });

  test('_lock()', function() {
    this.taskScheduler._lock();
    assert.ok(this.taskScheduler.isLocked,
      'we will set internal lock to make sure it\'s locked');
  });

  test('_unlock()', function() {
    this.sinon.stub(this.taskScheduler, '_executeNextTask');
    this.taskScheduler._unlock();
    assert.ok(this.taskScheduler._executeNextTask.called,
      'we will release internal lock');
  });

  suite('_executeNextTask()', function() {
    suite('if isLocked', function() {
      setup(function() {
        this.sinon.stub(this.taskScheduler._tasks, 'shift');
        this.taskScheduler.isLocked = true;
        this.taskScheduler._executeNextTask();
      });

      test('do nothing', function() {
        assert.isFalse(this.taskScheduler._tasks.shift.called);
      });
    });

    suite('if not locked, and task is resolved here', function() {
      setup(function() {
        this.taskScheduler.isLocked = false;
        this.sinon.stub(this.taskScheduler, '_unlock');
        this.taskScheduler._tasks = [{
          func: function() {
            return Promise.resolve();
          },
          defer: {
            resolve: Promise.resolve,
            reject: Promise.reject
          }
        }];
      });

      test('we will do following works', function(done) {
        this.taskScheduler._executeNextTask().then(() => {
          assert.isTrue(this.taskScheduler._unlock.called);
        }).then(done, done);
      });
    });

    suite('if not locked, and task is rejected here', function() {
      setup(function() {
        this.taskScheduler.isLocked = false;
        this.sinon.stub(this.taskScheduler, '_unlock');
        this.taskScheduler._tasks = [{
          func: function() {
            return Promise.reject();
          },
          defer: {
            resolve: Promise.resolve,
            reject: Promise.reject
          }
        }];
      });

      test('we will do following works', function(done) {
        this.taskScheduler._executeNextTask().then(() => {
          assert.isTrue(this.taskScheduler._unlock.called);
        }).then(done, done);
      });
    });
  });

  suite('_removeRedundantTasks()', function() {
    test('we will drop same-type tasks', function() {
      this.taskScheduler._tasks = [
        { cancelable: true, type: 'type1' },
        { cancelable: true, type: 'type1' },
        { cancelable: true, type: 'type1' },
        { cancelable: true, type: 'type2' }
      ];
      var leftTasks = this.taskScheduler._removeRedundantTasks('type1');
      assert.equal(leftTasks.length, 1);
      assert.equal(leftTasks[0].type, 'type2');
    });

    test('we will keep cancelable:false tasks and drop same-type tasks',
      function() {
        this.taskScheduler._tasks = [
          { cancelable: false, type: 'type1' },
          { cancelable: false, type: 'type1' },
          { cancelable: true,  type: 'type1' }, // this will be dropped
          { cancelable: true,  type: 'type2' }
        ];
        var leftTasks = this.taskScheduler._removeRedundantTasks('type1');
        assert.equal(leftTasks.length, 3);
    });
  });

  suite('enqueue()', function() {
    setup(function() {
      this.sinon.spy(this.taskScheduler, '_executeNextTask');
      this.sinon.spy(this.taskScheduler, '_removeRedundantTasks');
    });
    suite('if no task.func', function() {
      test('we will do nothing', function(done) {
        this.taskScheduler.enqueue({}).then(() => {
          assert.isFalse(this.taskScheduler._executeNextTask.called);
        }).then(done, done);
      });
    });

    suite('if we have task.func', function() {
      test('we will do following works', function(done) {
        this.taskScheduler.enqueue({
          type: 'type1',
          func: function() {
            return Promise.resolve();
          }
        }).then(() => {
          assert.isTrue(this.taskScheduler._executeNextTask.called);
          assert.isTrue(this.taskScheduler._removeRedundantTasks.called);
        }).then(done, done);
      });
    });
  });
});
