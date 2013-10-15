'use strict';

requireApp('system/js/async_semaphore.js');

var async_sem, async_sem_for_ctor;

suite('AsyncSemaphore', function() {
  suiteSetup(function() {
  });
  suiteTeardown(function() {
  });

  suite('Basic methods', function() {
    var tokenContext = {
        token: 'to be done'
      },
      expectedToken = 'done';
    var fakeTask = function() {
        this.token = 'done';
      };

    setup(function() {
      tokenContext.token = 'to be done';
      async_sem = new AsyncSemaphore();
    });

    teardown(function() {
      async_sem = null;
    });

    test('> ctor', function() {
      async_sem_for_ctor = new AsyncSemaphore();
      assert.equal(async_sem_for_ctor.getValue(), 0);
      assert.equal(async_sem_for_ctor.getTasksLength(), 0);
    });

    test('> v', function() {
      var expectedValue = async_sem.getValue() + 1;
      async_sem.v();
      assert.equal(async_sem.getValue(), expectedValue);
    });

    test('> p', function() {
      var expectedValue =
        (async_sem.getValue() - 1 > 0) ? async_sem.getValue() - 1 : 0;
      async_sem.p();
      assert.equal(async_sem.getValue(), expectedValue);
    });

    test('> wait', function() {
      async_sem.v();
      async_sem.wait(fakeTask, this);
      assert.equal(async_sem.getTasksLength(), 1);
    });

    test('> _execute', function() {
      async_sem.v();
      async_sem.wait(fakeTask, tokenContext);
      // We only do this for testing,
      // Don't modify sempahore directly in usual case
      async_sem.semaphore = 0;
      async_sem._execute();
      assert.equal(tokenContext.token, expectedToken);
    });
  });

  suite('Operations', function() {
    var tokenContext = {
        token: 'to be done'
      },
      expectedToken = 'done',
      expectedFalseToken = 'to be done',
      expectedAnotherToken = 'done again';
    var fakeTask = function() {
        this.token = 'done';
      };
    var secondFakeTask = function() {
        this.token = 'done again';
      };

    setup(function() {
      tokenContext.token = 'to be done';
      async_sem = new AsyncSemaphore();
    });

    teardown(function() {
      tokenContext.token = null;
      async_sem = null;
    });

    test('> task should be done after a "v, wait, p" sequence',
      function() {
        async_sem.v();
        async_sem.wait(fakeTask, tokenContext);
        async_sem.p();
        assert.equal(tokenContext.token, expectedToken);
      });

    test('> task should not be done after a "v(2), wait, p" sequence',
      function() {
        async_sem.v(2);
        async_sem.wait(fakeTask, tokenContext);
        async_sem.p();
        assert.equal(tokenContext.token, expectedFalseToken);
      });

    test('> task should be done after a "v(2), wait, p, p" sequence',
      function() {
        async_sem.v(2);
        async_sem.wait(fakeTask, tokenContext);
        async_sem.p();
        async_sem.p();
        assert.equal(tokenContext.token, expectedToken);
      });

    test('> tasks should be done in order after a "v, wait, wait, p" sequence',
      function() {
        async_sem.v();
        async_sem.wait(fakeTask, tokenContext);
        async_sem.wait(secondFakeTask, tokenContext);
        async_sem.p();
        assert.equal(tokenContext.token, expectedAnotherToken);
      });

    test('> v, asynchronous p, wait', function() {
      async_sem.v();
      window.setTimeout(function() {
        async_sem.p();
        assert.equal(tokenContext.token, expectedToken);
      }, 0);
      async_sem.wait(fakeTask, tokenContext);
      assert.equal(tokenContext.token, expectedFalseToken);
    });

    test('> wait() should not throw exception when pass null as arguments',
      function() {
        async_sem.v();
        async_sem.wait();
        async_sem.p();
    });
  });
});
