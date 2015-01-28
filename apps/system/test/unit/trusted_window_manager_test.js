'use strict';
/* global TrustedWindowManager, MockAppWindow, MocksHelper */

requireApp('system/test/unit/mock_app_window.js');

var mocksForActivityWindowManager = new MocksHelper([
  'AppWindow'
]).init();

suite('system/TrustedWindowManager', function() {
  mocksForActivityWindowManager.attachTestHelpers();
  var subject;

  var fakeApp;

  var fakeAppConfig = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };
  setup(function(done) {
    requireApp('system/js/trusted_window_manager.js', done);
  });

  suite('handle events', function() {
    setup(function() {
      subject = new TrustedWindowManager();
      fakeApp = new MockAppWindow(fakeAppConfig);
    });

    teardown(function() {
    });

    test('start', function() {
      var stubAddEventListener = this.sinon.stub(window, 'addEventListener');
      subject.start();
      assert.equal(stubAddEventListener.getCall(0).args[0], 'trustedopened');
      assert.equal(stubAddEventListener.getCall(1).args[0], 'killtrusted');
    });

    test('stop', function() {
      var stubRemoveEventListener =
        this.sinon.stub(window, 'removeEventListener');
      subject.stop();
      assert.equal(stubRemoveEventListener.getCall(0).args[0], 'trustedopened');
      assert.equal(stubRemoveEventListener.getCall(1).args[0], 'killtrusted');
    });

    suite('handleEvent', function() {
      var stubPublish;

      setup(function() {
        subject.start();
        stubPublish = this.sinon.stub(subject, 'publish');
      });

      teardown(function() {
        subject.stop();
      });

      test('trustedopened', function() {
        var testRequestId = 'testRequestId';
        var testDetail = {
          config: {
            requestId: testRequestId
          }
        };
        window.dispatchEvent(new CustomEvent('trustedopened', {
          detail: testDetail
        }));
        assert.isTrue(stubPublish.calledWith('-activated'));
        assert.deepEqual(subject.pool[testRequestId], testDetail);
        subject.pool = {};
      });

      test('killtrusted', function() {
        var testRequestId = 'testRequestId';
        subject.pool[testRequestId] = fakeApp;
        var stubKill = this.sinon.stub(fakeApp, 'kill');
        window.dispatchEvent(new CustomEvent('killtrusted', {
          detail: {
            requestId: testRequestId
          }
        }));
        assert.isTrue(stubPublish.calledWith('-deactivated'));
        assert.isTrue(stubKill.calledOnce);
        assert.isFalse(!!subject.pool[testRequestId]);
      });
    });

  });
});
