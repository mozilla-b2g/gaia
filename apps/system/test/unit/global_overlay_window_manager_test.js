/* Any copyright is dedicated to the Public Domain.
 *  * http://creativecommons.org/publicdomain/zero/1.0/ */

/* global GlobalOverlayWindowManager */
/* global MocksHelper */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_app_window.js', () => {
  var mocksForGlobalOverlayWindowManager = new MocksHelper([
    'AppWindow',
    'Service'
  ]).init();

  suite('system/GlobalOverlayWindowManager', function() {

    mocksForGlobalOverlayWindowManager.attachTestHelpers();

    var subject;

    setup(function(done) {
      requireApp('system/js/global_overlay_window_manager.js', done);
    });

    suite('Event listeners', function() {
      var stubAddEventListener;
      var stubRemoveEventListener;

      setup(function() {
        stubAddEventListener = this.sinon.stub(window, 'addEventListener');
        stubRemoveEventListener = this.sinon.stub(window,
                                                  'removeEventListener');

        subject = new GlobalOverlayWindowManager();
        subject.start();
      });

      teardown(function() {
        subject = null;
        stubAddEventListener.restore();
        stubRemoveEventListener.restore();
      });

      test('Should be listening for events', function() {
        assert.equal(stubAddEventListener.getCall(0).args[0],
                     'globaloverlaycreated');
        assert.equal(stubAddEventListener.getCall(1).args[0],
                     'globaloverlayrequestopen');
        assert.equal(stubAddEventListener.getCall(2).args[0],
                     'globaloverlayopening');
        assert.equal(stubAddEventListener.getCall(3).args[0],
                     'globaloverlayopened');
        assert.equal(stubAddEventListener.getCall(4).args[0],
                     'globaloverlayrequestclose');
        assert.equal(stubAddEventListener.getCall(5).args[0],
                     'globaloverlayclosing');
        assert.equal(stubAddEventListener.getCall(6).args[0],
                     'globaloverlayclosed');
        assert.equal(stubAddEventListener.getCall(7).args[0],
                     'globaloverlayterminated');
        assert.equal(stubAddEventListener.getCall(8).args[0],
                     'system-resize');
      });

      test('Should stop listening for events', function() {
        subject.stop();
        assert.equal(stubRemoveEventListener.getCall(0).args[0],
                     'globaloverlaycreated');
        assert.equal(stubRemoveEventListener.getCall(1).args[0],
                     'globaloverlayrequestopen');
        assert.equal(stubRemoveEventListener.getCall(2).args[0],
                     'globaloverlayopening');
        assert.equal(stubRemoveEventListener.getCall(3).args[0],
                     'globaloverlayopened');
        assert.equal(stubRemoveEventListener.getCall(4).args[0],
                     'globaloverlayrequestclose');
        assert.equal(stubRemoveEventListener.getCall(5).args[0],
                     'globaloverlayclosing');
        assert.equal(stubRemoveEventListener.getCall(6).args[0],
                     'globaloverlayclosed');
        assert.equal(stubRemoveEventListener.getCall(7).args[0],
                     'globaloverlayterminated');
        assert.equal(stubRemoveEventListener.getCall(8).args[0],
                     'system-resize');
        assert.isNull(subject._instance);
      });
    });

    suite('Received events before globaloverlaycreated', function() {
      var stubPublish;

      setup(function() {
        subject = new GlobalOverlayWindowManager();
        subject.start();

        stubPublish = this.sinon.stub(subject, 'publish');
      });

      teardown(function() {
        subject.stop();
        subject = null;
        stubPublish.restore();
      });

      test('Initial event should be globaloverlaycreated', function() {
        ['globaloverlayopened',
         'globaloverlayopening',
         'globaloverlayclosed',
         'globaloverlayclosing'].forEach(event => {
          subject.handleEvent({ type: event });
          assert.ok(stubPublish.notCalled, 'should not publish any event');
          assert.isNull(subject._instance);
        });
      });
    });

    suite('globaloverlaycreated', function() {
      var stubKill;
      var fakeOverlay = {};
      var anotherFakeOverlay = {
        kill: function() {}
      };

      setup(function() {
        stubKill = this.sinon.stub(anotherFakeOverlay, 'kill');

        subject = new GlobalOverlayWindowManager();
        subject.start();
      });

      teardown(function() {
        stubKill.restore();

        subject.stop();
        subject = null;
      });

      test('No instance before globaloverlaycreated', function() {
        assert.isNull(subject._instance);
      });

      test('Handle globaloverlaycreated', function() {
        subject.handleEvent({
          type: 'globaloverlaycreated',
          detail: fakeOverlay
        });
        assert.ok(stubKill.notCalled, 'Should not call instance.kill');
        assert.equal(subject._instance, fakeOverlay);
        subject.handleEvent({
          type: 'globaloverlaycreated',
          detail: anotherFakeOverlay
        });
        assert.ok(stubKill.calledOnce, 'Should call instance.kill');
        assert.equal(subject._instance, fakeOverlay);
        assert.ok(subject.isActive());
      });
    });

    suite('globaloverlayopen*', function() {
      var stubPublish;

      var fakeOverlay = {};
      var anotherFakeOverlay = {};

      setup(function() {
        subject = new GlobalOverlayWindowManager();
        subject.start();
      });

      teardown(function() {
        subject.stop();
        subject = null;
      });

      test('Handle globaloverlayopen* - same overlay', function() {
        subject.handleEvent({
          type: 'globaloverlaycreated',
          detail: fakeOverlay
        });

        ['globaloverlayopening',
         'globaloverlayopened'].forEach(event => {
          stubPublish = this.sinon.stub(subject, 'publish');
          subject.handleEvent({
            type: event,
            detail: fakeOverlay
          });
          assert.ok(stubPublish.calledOnce, 'Should call publish');
          assert.equal(stubPublish.getCall(0).args[0], '-activated');
          assert.equal(subject._instance, fakeOverlay);
          stubPublish.restore();
        });
      });

      test('Handle globaloverlayopen* - different overlay', function() {
        subject.handleEvent({
          type: 'globaloverlaycreated',
          detail: fakeOverlay
        });

        ['globaloverlayopening',
         'globaloverlayopened'].forEach(event => {
          stubPublish = this.sinon.stub(subject, 'publish');
          subject.handleEvent({
            type: event,
            detail: anotherFakeOverlay
          });
          assert.ok(stubPublish.notCalled, 'Should not call publish');
          assert.equal(subject._instance, fakeOverlay);
          stubPublish.restore();
        });
      });
    });

    suite('globaloverlayrequestopen', function() {
      var stubSetVisible;
      var stubOpen;

      var fakeOverlay = {
        ready: function(cb) {
          cb();
        },
        setVisible: function() {},
        open: function() {}
      };
      var anotherFakeOverlay = {};

      setup(function() {
        subject = new GlobalOverlayWindowManager();
        subject.start();

        stubSetVisible = this.sinon.stub(fakeOverlay, 'setVisible');
        stubOpen = this.sinon.stub(fakeOverlay, 'open');
      });

      teardown(function() {
        subject.stop();
        subject = null;

        stubSetVisible.restore();
        stubOpen.restore();
      });

      test('Handle globaloverlayrequestopen - same overlay', function() {
        subject.handleEvent({
          type: 'globaloverlaycreated',
          detail: fakeOverlay
        });

        subject.handleEvent({
          type: 'globaloverlayrequestopen',
          detail: fakeOverlay
        });

        assert.ok(stubSetVisible.calledOnce, 'Should call setVisible');
        assert.equal(stubSetVisible.getCall(0).args[0], true);
        assert.ok(stubOpen.calledOnce, 'Should call open');
        assert.equal(subject._instance, fakeOverlay);
      });

      test('Handle globaloverlayrequestopen - different overlay', function() {
        subject.handleEvent({
          type: 'globaloverlaycreated',
          detail: fakeOverlay
        });

        subject.handleEvent({
          type: 'globaloverlayrequestopen',
          detail: anotherFakeOverlay
        });

        assert.ok(stubSetVisible.notCalled, 'Should not call setVisible');
        assert.ok(stubOpen.notCalled, 'Should not call open');
        assert.equal(subject._instance, fakeOverlay);
      });
    });

    suite('globaloverlayrequestclose', function() {
      var stubClose;

      var fakeOverlay = {
        close: function() {}
      };
      var anotherFakeOverlay = {};

      setup(function() {
        subject = new GlobalOverlayWindowManager();
        subject.start();

        stubClose = this.sinon.stub(fakeOverlay, 'close');
      });

      teardown(function() {
        subject.stop();
        subject = null;

        stubClose.restore();
      });

      test('Handle globaloverlayrequestclose - same overlay', function() {
        subject.handleEvent({
          type: 'globaloverlaycreated',
          detail: fakeOverlay
        });

        subject.handleEvent({
          type: 'globaloverlayrequestclose',
          detail: fakeOverlay
        });

        assert.ok(stubClose.calledOnce, 'Should call close');
        assert.equal(subject._instance, fakeOverlay);
      });

      test('Handle globaloverlayrequestclose - different overlay', function() {
        subject.handleEvent({
          type: 'globaloverlaycreated',
          detail: fakeOverlay
        });

        subject.handleEvent({
          type: 'globaloverlayrequestclose',
          detail: anotherFakeOverlay
        });

        assert.ok(stubClose.notCalled, 'Should not call close');
        assert.equal(subject._instance, fakeOverlay);
      });
    });

    suite('globaloverlayclos*', function() {
      var stubPublish;

      var fakeOverlay = {};
      var anotherFakeOverlay = {};

      setup(function() {
        subject = new GlobalOverlayWindowManager();
        subject.start();
      });

      teardown(function() {
        subject.stop();
        subject = null;
      });

      test('Handle globaloverlayclos* - same overlay', function() {
        subject.handleEvent({
          type: 'globaloverlaycreated',
          detail: fakeOverlay
        });

        ['globaloverlayclosing',
         'globaloverlayclosed'].forEach(event => {
          stubPublish = this.sinon.stub(subject, 'publish');
          subject.handleEvent({
            type: event,
            detail: fakeOverlay
          });
          assert.ok(stubPublish.calledOnce, 'Should call publish');
          assert.equal(stubPublish.getCall(0).args[0], '-deactivated');
          assert.equal(subject._instance, fakeOverlay);
          stubPublish.restore();
        });
      });

      test('Handle globaloverlayclos* - different overlay', function() {
        subject.handleEvent({
          type: 'globaloverlaycreated',
          detail: fakeOverlay
        });

        ['globaloverlayclosing',
         'globaloverlayclosed'].forEach(event => {
          stubPublish = this.sinon.stub(subject, 'publish');
          subject.handleEvent({
            type: event,
            detail: anotherFakeOverlay
          });
          assert.ok(stubPublish.notCalled, 'Should not call publish');
          assert.equal(subject._instance, fakeOverlay);
          stubPublish.restore();
        });
      });
    });

    suite('globaloverlayterminated', function() {
      var fakeOverlay = {};
      var anotherFakeOverlay = {};

      setup(function() {
        subject = new GlobalOverlayWindowManager();
        subject.start();
      });

      teardown(function() {
        subject.stop();
        subject = null;
      });

      test('Handle globaloverlayterminated - same overlay', function() {
        subject.handleEvent({
          type: 'globaloverlaycreated',
          detail: fakeOverlay
        });

        subject.handleEvent({
          type: 'globaloverlayterminated',
          detail: fakeOverlay
        });

        assert.isNull(subject._instance);
      });

      test('Handle globaloverlayrequestclose - different overlay', function() {
        subject.handleEvent({
          type: 'globaloverlaycreated',
          detail: fakeOverlay
        });

        subject.handleEvent({
          type: 'globaloverlayterminated',
          detail: anotherFakeOverlay
        });

        assert.equal(subject._instance, fakeOverlay);
      });
    });

    suite('system-resize', function() {
      var stubResize;

      var fakeOverlay = {
        resize: function() {}
      };

      setup(function() {
        subject = new GlobalOverlayWindowManager();
        subject.start();

        stubResize = this.sinon.stub(fakeOverlay, 'resize');
      });

      teardown(function() {
        subject.stop();
        subject = null;

        stubResize.restore();
      });

      test('Handle system-resize - existing overlay', function() {
        subject.handleEvent({
          type: 'globaloverlaycreated',
          detail: fakeOverlay
        });

        subject.handleEvent({type: 'system-resize'});

        assert.ok(stubResize.calledOnce, 'Should call resize');
        assert.equal(subject._instance, fakeOverlay);
      });

      test('Handle system-resize - non existing overlay', function() {
        subject.handleEvent({type: 'system-resize'});

        assert.ok(stubResize.notCalled, 'Should not call resize');
        assert.isNull(subject._instance);
      });

    });

  });
});
