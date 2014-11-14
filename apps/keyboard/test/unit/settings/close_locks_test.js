'use strict';

/* global CloseLockManager */

require('/js/settings/close_locks.js');

suite('CloseLockManager', function() {
  var manager;
  var stubClose;

  setup(function() {
    stubClose = this.sinon.stub(window, 'close');

    manager = new CloseLockManager();
    manager.start();
  });

  test('requestClose', function() {
    manager.requestLock('requestClose');

    assert.isTrue(stubClose.calledOnce);
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
        assert.isFalse(stubClose.calledOnce);
      });

      test('unlock awakeLock', function() {
        awakeLock.unlock();
        assert.isTrue(stubClose.calledOnce);
      });

      test('unlock closeLock', function() {
        closeLock.unlock();
        assert.isFalse(stubClose.calledOnce);

        awakeLock.unlock();
        assert.isFalse(stubClose.calledOnce);
      });
    });

    test('requestClose after unlock', function() {
      awakeLock.unlock();
      assert.isFalse(stubClose.calledOnce);

      manager.requestLock('requestClose');
      assert.isTrue(stubClose.calledOnce);
    });
  });
});
