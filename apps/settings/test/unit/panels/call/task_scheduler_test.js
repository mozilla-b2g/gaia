suite('TaskScheduler', function() {
  'use strict';

  var taskScheduler;

  setup(function(done) {
    testRequire(['panels/call/task_scheduler'], {}, function(TaskScheduler) {
      taskScheduler = TaskScheduler();
      done();
    });
  });

  suite('_lock', function() {
    setup(function() {
      taskScheduler._isLocked = false;
      taskScheduler._lock();
    });

    test('all internal state are right', function() {
      assert.isTrue(taskScheduler._isLocked);
    });
  });

  suite('_unlock', function() {
    setup(function() {
      this.sinon.stub(taskScheduler, '_executeNextTask');
      taskScheduler._isLocked = true;
      taskScheduler._unlock();
    });

    test('all internal state are right', function() {
      assert.isFalse(taskScheduler._isLocked);
      assert.isTrue(taskScheduler._executeNextTask.called);
    });
  });

  suite('_removeRedundantTasks', function() {
    setup(function() {
      taskScheduler._tasks = [
        { type : 'test1' },
        { type : 'test1' },
        { type : 'test2' },
        { type : 'test2' },
        { type : 'test2' },
      ];
    });

    test('only test2 tasks would be left', function() {
      var tasks = taskScheduler._removeRedundantTasks('test1');
      assert.equal(tasks.length, 3);
      tasks.forEach((task) => {
        assert.equal(task.type, 'test2');
      });
    });
  });

  suite('_executeNextTask', function() {
    setup(function() {
      taskScheduler._tasks = [
        { type : 'test1', func: function(done) { done(); } },
        { type : 'test2', func: function(done) { done(); } }
      ];
    });

    suite('if locked', function() {
      setup(function() {
        this.sinon.stub(taskScheduler._tasks, 'shift');
        taskScheduler._isLocked = true;
        taskScheduler._executeNextTask();
      });
      test('we will do nothing', function() {
        assert.isFalse(taskScheduler._tasks.shift.called);
      });
    });

    suite('not locked, but no next task', function() {
      setup(function() {
        this.sinon.stub(taskScheduler, '_lock');
        taskScheduler._tasks = [];
        taskScheduler._executeNextTask();
      });
      test('we will do nothing', function() {
        assert.isFalse(taskScheduler._lock.called);
      });
    });

    suite('not locked, with next task', function() {
      setup(function() {
        this.sinon.stub(taskScheduler, '_lock');
        this.sinon.stub(taskScheduler, '_unlock');
        taskScheduler._executeNextTask();
      });
      test('we will call _lock first and then _unlock', function() {
        assert.isTrue(taskScheduler._lock.called);
        assert.isTrue(taskScheduler._unlock.called);
      });
    });
  });

  suite('enqueue', function() {
    setup(function() {
      this.sinon.spy(taskScheduler, '_removeRedundantTasks');
      this.sinon.stub(taskScheduler, '_executeNextTask');
      taskScheduler.enqueue('test1', function() {});
    });

    test('we will call related works', function() {
      assert.isTrue(taskScheduler._removeRedundantTasks.called);
      assert.isTrue(taskScheduler._executeNextTask.called);
    });
  });
});
