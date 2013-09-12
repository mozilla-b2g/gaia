'use strict';

mocha.globals(['Payment', 'addEventListener',
'kPaymentConfirmationScreen', 'TrustedUIManager', 'WindowManager']);

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_window_manager.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');

var MockAddEventListener_callback = {};

suite('system/payment', function() {
  var realL10n;
  var realTrustedUIManager;
  var realWindowManager;

  var stubAddEventListener;
  var stubByIframe;

  var mock_iframe;

  var fakeEvent = {
        detail: { id: null, requestId: null, type: null,
                  paymentRequests: [], uri: null, jwt: null }
      };

  setup(function(done) {
    stubAddEventListener =
    this.sinon.stub(window, 'addEventListener', function(evt, callback) {
      MockAddEventListener_callback[evt] = callback;
    });

    MockL10n.readyState = 'interactive';

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realTrustedUIManager = window.TrustedUIManager;
    window.TrustedUIManager = MockTrustedUIManager;

    realWindowManager = window.WindowManager;
    window.WindowManager = MockWindowManager;

    fakeEvent.detail.id = 'dummy_detail_id';
    fakeEvent.detail.requestId = 'dummy_detail_requestId';

    requireApp('system/js/payment.js', done);

    mock_iframe = document.createElement('iframe');
    stubByIframe = this.sinon.stub(document, 'createElement');
    stubByIframe.withArgs('iframe').returns(mock_iframe);

    mock_iframe.callbacks = {};
    mock_iframe.addEventListener = function(evt, callback) {
      this.callbacks[evt] = callback;
    };
  });

  teardown(function() {
    navigator.mozL10n = realL10n;

    window.TrustedUIManager = realTrustedUIManager;
    window.WindowManager = realWindowManager;

    stubAddEventListener.restore();
    stubByIframe.restore();
  });

  suite('handleEvent', function() {
    test('open-payment-confirmation-dialog when size of paymentRequests == 1',
    function(done) {
      fakeEvent.detail.type = 'open-payment-confirmation-dialog';
      fakeEvent.detail.paymentRequests.push({type: 'dummy_request_type'});

      var stubDispatchEvent =
      this.sinon.stub(window, 'dispatchEvent', function(evt) {
        assert.equal(evt.type, 'mozContentEvent');
        assert.equal(evt.detail.id, 'dummy_detail_id');
        assert.equal(evt.detail.userSelection, 'dummy_request_type');
        stubDispatchEvent.restore();
        done();
      });

      MockAddEventListener_callback['mozChromeEvent'].handleEvent(fakeEvent);
    });

    test('open-payment-confirmation-dialog when size of paymentRequests > 1',
    function() {
      fakeEvent.detail.type = 'open-payment-confirmation-dialog';
      fakeEvent.detail.paymentRequests.
        push({type: 'dummy_request_type_A'}, {type: 'dummy_request_type_B'});

      MockTrustedUIManager.mTeardown();
      MockWindowManager.setDisplayedApp({name: 'dummy_displayed_app'});

      MockAddEventListener_callback['mozChromeEvent'].handleEvent(fakeEvent);

      assert.equal(MockTrustedUIManager.mName, 'dummy_displayed_app');
      assert.equal(MockTrustedUIManager.mFrame
        .getAttribute('mozbrowser'), 'true');
      assert.equal(MockTrustedUIManager.mFrame
        .getAttribute('remote'), 'true');
      assert.equal(MockTrustedUIManager.mChromeEventId, 'dummy_detail_id');
    });

    test('Test callback mozbrowserloadend', function() {
      // TODO: Temp layout until issue #2692 is solved.
    });

    test('Test open-payment-flow-dialog', function() {
      fakeEvent.detail.type = 'open-payment-flow-dialog';
      fakeEvent.detail.uri = 'http://test_uri/';
      fakeEvent.detail.jwt = '?test_params=0';

      MockTrustedUIManager.mTeardown();

      MockAddEventListener_callback['mozChromeEvent'].handleEvent(fakeEvent);

      assert.equal(Payment.trustedUILayers['dummy_detail_requestId'],
        'dummy_detail_id');

      assert.equal(MockTrustedUIManager.mName, 'dummy_displayed_app');
      assert.equal(MockTrustedUIManager.mFrame
        .getAttribute('mozbrowser'), 'true');
      assert.equal(MockTrustedUIManager.mFrame
        .src, 'http://test_uri/?test_params=0');
      assert.equal(MockTrustedUIManager.mChromeEventId, 'dummy_detail_id');
    });

    test('Test callback mozbrowserloadstart', function(done) {
      var stubDispatchEvent =
      this.sinon.stub(window, 'dispatchEvent', function(evt) {
        assert.equal(evt.type, 'mozContentEvent');
        assert.equal(evt.detail.id, 'dummy_detail_id');
        assert.equal(evt.detail.frame, MockTrustedUIManager.mFrame);

        stubDispatchEvent.restore();
        done();
      });

      MockTrustedUIManager.mFrame.
        callbacks['mozbrowserloadstart']({target: MockTrustedUIManager.mFrame});
    });

    test('Test close-payment-flow-dialog', function(done) {
      fakeEvent.detail.type = 'close-payment-flow-dialog';

      var stubTrustedUIManager =
      this.sinon.stub(TrustedUIManager, 'close', function(id, callback) {
        callback();
      });
      var stubDispatchEvent =
      this.sinon.stub(window, 'dispatchEvent', function(evt) {
        assert.equal(evt.type, 'mozContentEvent');
        assert.equal(evt.detail.id, 'dummy_detail_id');

        stubDispatchEvent.restore();
        stubTrustedUIManager.restore();
        done();
      });

      MockAddEventListener_callback['mozChromeEvent'].handleEvent(fakeEvent);
    });
  });
});
