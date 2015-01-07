'use strict';

/* global CloseLockManager */

require('/js/settings/close_locks.js');

suite('CloseLockManager', function() {
  var manager;
  var stubClose;
  var app;

  setup(function() {
    stubClose = this.sinon.stub(window, 'close');

    app = {
      onclose: this.sinon.spy()
    };

    manager = new CloseLockManager(app);
    manager.start();
  });

  test('requestClose', function() {
    manager.requestLock('requestClose');

    assert.isTrue(stubClose.calledOnce);
    assert.isTrue(app.onclose.called);
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
        assert.isFalse(app.onclose.calledOnce);
      });

      test('unlock awakeLock', function() {
        awakeLock.unlock();
        assert.isTrue(stubClose.calledOnce);
        assert.isTrue(app.onclose.calledOnce);
      });

      test('unlock closeLock', function() {
        closeLock.unlock();
        assert.isFalse(stubClose.calledOnce);
        assert.isFalse(app.onclose.calledOnce);

        awakeLock.unlock();
        assert.isFalse(stubClose.calledOnce);
        assert.isFalse(app.onclose.calledOnce);
      });
    });

    test('requestClose after unlock', function() {
      awakeLock.unlock();
      assert.isFalse(stubClose.calledOnce);
      assert.isFalse(app.onclose.calledOnce);

      manager.requestLock('requestClose');
      assert.isTrue(stubClose.calledOnce);
      assert.isTrue(app.onclose.calledOnce);
    });
  });
});
