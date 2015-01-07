'use strict';

/* global CloseLockManager */

require('/js/settings/close_locks.js');

suite('CloseLockManager', function() {
  var manager;

  setup(function() {
    manager = new CloseLockManager();
    manager.onclose = this.sinon.stub();
    manager.start();
  });

  test('requestClose', function() {
    manager.requestLock('requestClose');

    assert.isTrue(manager.onclose.called);
  });

  suite('stayAwake', function() {
    var awakeLock;

    setup(function() {
      awakeLock = manager.requestLock('stayAwake');
    });

    suite('requestClose', function() {
      var closeLock;
      setup(function() {
        closeLock = manager.requestLock('requestClose');
        assert.isFalse(manager.onclose.calledOnce);
      });

      test('unlock awakeLock', function() {
        awakeLock.unlock();
        assert.isTrue(manager.onclose.calledOnce);
      });

      test('unlock closeLock', function() {
        closeLock.unlock();
        assert.isFalse(manager.onclose.calledOnce);

        awakeLock.unlock();
        assert.isFalse(manager.onclose.calledOnce);
      });
    });

    test('requestClose after unlock', function() {
      awakeLock.unlock();
      assert.isFalse(manager.onclose.calledOnce);

      manager.requestLock('requestClose');
      assert.isTrue(manager.onclose.calledOnce);
    });
  });
});
