'use strict';

require('/shared/js/idletimer.js');

function switchProperty(originObject, prop, stub, reals, useDefineProperty) {
  if (!useDefineProperty) {
    reals[prop] = originObject[prop];
    originObject[prop] = stub;
  } else {
    Object.defineProperty(originObject, prop, {
      configurable: true,
      get: function() { return stub; }
    });
  }
}

function restoreProperty(originObject, prop, reals, useDefineProperty) {
  if (!useDefineProperty) {
    originObject[prop] = reals[prop];
  } else {
    Object.defineProperty(originObject, prop, {
      configurable: true,
      get: function() { return reals[prop]; }
    });
  }
}

suite('idleTimer', function() {
  var timeoutTime = 100,
      addIdleObserverStub, removeIdleObserverStub, setTimeoutStub,
      clearTimeoutStub, idleCallbackStub, activeCallbackStub;

  var reals = {};

  setup(function() {
    idleCallbackStub = this.sinon.stub();
    activeCallbackStub = this.sinon.stub();

    addIdleObserverStub = this.sinon.stub();
    switchProperty(navigator, 'addIdleObserver', addIdleObserverStub, reals);
    removeIdleObserverStub = this.sinon.stub();
    switchProperty(navigator, 'removeIdleObserver', removeIdleObserverStub,
      reals);
    setTimeoutStub = this.sinon.stub();
    setTimeoutStub.returns('timer');
    switchProperty(window, 'setTimeout', setTimeoutStub, reals);
    clearTimeoutStub = this.sinon.stub();
    switchProperty(window, 'clearTimeout', clearTimeoutStub, reals);
  });

  teardown(function() {
    restoreProperty(navigator, 'addIdleObserver', reals);
    restoreProperty(navigator, 'removeIdleObserver', reals);
    restoreProperty(window, 'setTimeout', reals);
    restoreProperty(window, 'clearTimeout', reals);
  });

  test('proper id sequence', function() {
    var id1, id2, id3;

    // check that we generate a proper id sequence
    id1 = window.setIdleTimeout(idleCallbackStub, activeCallbackStub,
      timeoutTime);
    id2 = window.setIdleTimeout(idleCallbackStub, activeCallbackStub,
      timeoutTime);

    assert.ok(id1);
    assert.equal(1, id1);
    assert.ok(id2);
    assert.equal(2, id2);

    // now let's remove one of the created IdleTimers
    window.clearIdleTimeout(id1);
    // new one would still get an id next in the sequence
    id3 = window.setIdleTimeout(idleCallbackStub, activeCallbackStub,
      timeoutTime);
    assert.ok(id3);
    assert.equal(3, id3);

    // cleanup
    window.clearIdleTimeout(id2);
    window.clearIdleTimeout(id3);
  });

  suite('setIdleTimeout()', function() {
    var id, idleTimerObserver;

    var registerChecks = function() {
      // check that we called proper functions when we created idletimer
      assert.ok(id);
      assert.isTrue(addIdleObserverStub.calledOnce);

      // Check that we were passing a proper observer into addIdleObserver
      assert.ok(idleTimerObserver.onactive);
      assert.ok(idleTimerObserver.onidle);
    };

    setup(function() {
      // create idletimer observer
      id = window.setIdleTimeout(idleCallbackStub, activeCallbackStub,
        timeoutTime);
      // retrieve idleTimer.observer
      idleTimerObserver = addIdleObserverStub.getCall(0).args[0];
    });

    teardown(function() {
      window.clearIdleTimeout(id);
    });

    test('The phone has already idled.' +
      ' Registering and calling on idle right away', function() {

      registerChecks();

      // calling onidle
      idleTimerObserver.onidle();
      assert.isTrue(setTimeoutStub.calledOnce);

      // execute idled right aways
      var idled = setTimeoutStub.getCall(0).args[0];
      idled();
      assert.isTrue(idleCallbackStub.calledOnce);

      // after a while onactive call is being executed
      idleTimerObserver.onactive();
      assert.isTrue(activeCallbackStub.calledOnce);
    });

    test('executing onactive after onidle', function() {
      idleTimerObserver.onidle();
      assert.isTrue(setTimeoutStub.calledOnce);

      idleTimerObserver.onactive();
      assert.isTrue(clearTimeoutStub.calledOnce);
    });
  });

  suite('clearIdleTimeout()', function() {
    var testFunc = function(isOnIdleCalled) {
      // First we create IdleTimer
      var id = window.setIdleTimeout(idleCallbackStub, activeCallbackStub,
        timeoutTime),
        idleTimerObserver;

      assert.ok(id);

      // retrieve idleTimer.observer
      idleTimerObserver = addIdleObserverStub.getCall(0).args[0];
      if (isOnIdleCalled) {
        idleTimerObserver.onidle();
      }

      // Now let's clear it
      window.clearIdleTimeout(id);
      // Check that we called removeIdleObserver and clearTimeout whether
      // onIdle is executed or not.
      assert.isTrue(removeIdleObserverStub.calledOnce);
      assert.isTrue(clearTimeoutStub.calledOnce);
      // Check that we were passing a proper observer into removeIdleObserver
      idleTimerObserver = removeIdleObserverStub.getCall(0).args[0];
      assert.ok(idleTimerObserver.onactive);
      assert.ok(idleTimerObserver.onidle);
    };

    test('calling before onidle was called', function() {
      testFunc();
    });

    test('calling after onidle was called', function() {
      testFunc(true);
    });
  });
});
