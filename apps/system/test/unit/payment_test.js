/* global MocksHelper, MockL10n, MockApp, MockService, MockChromeEvent,
          Payment */

'use strict';

requireApp('system/js/payment.js');

requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksHelperForPayment = new MocksHelper([
  'Service'
]).init();

suite('system/Payment', function() {
  var realL10n;
  var mockApp;

  mocksHelperForPayment.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  suite('Open payment flow', function() {
    var stubDispatchEvent;
    var fakeIframe;
    setup(function() {
      mockApp = new MockApp();
      MockService.currentApp = mockApp;
      fakeIframe = document.createElement('iframe');
      this.sinon.stub(document, 'createElement').returns(fakeIframe);
      stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var event = new MockChromeEvent({
        type: 'open-payment-flow-dialog',
        id: 'aChromeId',
        requestId: 'aRequestId'
      });
      Payment.handleEvent(event);
    });

    teardown(function() {
      Payment.paymentWindows.clear();
    });

    test('Should try to open a trusted window', function() {
      var result = stubDispatchEvent.getCall(0).args[0];
      assert.equal(result.type, 'launchtrusted');
      assert.equal(result.detail.name, mockApp.manifest.name);
      assert.equal(result.detail.chromeId, 'aChromeId');
      assert.equal(result.detail.requestId, 'aRequestId');
      assert.equal(result.detail.frame, fakeIframe);
    });

    test('Should save payment window event ids', function() {
      assert.equal(Payment.paymentWindows.size, 1);
      assert.isTrue(Payment.paymentWindows.has('aRequestId'));
      assert.equal(Payment.paymentWindows.get('aRequestId'), 'aChromeId');
    });
  });

  suite('Close payment flow - existing payment window', function() {
    var stubDispatchEvent;
    setup(function() {
      var event = new MockChromeEvent({
        type: 'open-payment-flow-dialog',
        id: 'aChromeId',
        requestId: 'aRequestId'
      });
      Payment.handleEvent(event);

      stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var closeEvent = new MockChromeEvent({
        type: 'close-payment-flow-dialog',
        id: 'anotherChromeId',
        requestId: 'aRequestId'
      });
      Payment.handleEvent(closeEvent);
    });

    teardown(function() {
      Payment.paymentWindows.clear();
    });

    test('Should try to close a trusted window', function() {
      var result = stubDispatchEvent.getCall(0).args[0];
      assert.equal(result.type, 'killtrusted');
      assert.equal(result.detail.chromeId, 'anotherChromeId');
      assert.equal(result.detail.requestId, 'aRequestId');
    });

    test('Should remove payment window', function() {
      assert.equal(Payment.paymentWindows.size, 0);
      assert.isFalse(Payment.paymentWindows.has('aRequestId'));
    });
  });

  suite('Close payment flow - NO existing payment window', function() {
    var stubDispatchEvent;
    setup(function() {
      stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var closeEvent = new MockChromeEvent({
        type: 'close-payment-flow-dialog',
        id: 'anotherChromeId',
        requestId: 'aRequestId'
      });
      Payment.handleEvent(closeEvent);
    });

    teardown(function() {
      Payment.paymentWindows.clear();
    });

    test('Should NOT try to close a trusted window', function() {
      assert.isFalse(stubDispatchEvent.called);
    });

    test('Should NOT remove payment window', function() {
      assert.equal(Payment.paymentWindows.size, 0);
      assert.isFalse(Payment.paymentWindows.has('aRequestId'));
    });
  });

  suite('Cancel payment flow', function() {
    var stubDispatchEvent;
    setup(function() {
      stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var event = new MockChromeEvent({
        type: 'open-payment-flow-dialog',
        id: 'aChromeId',
        requestId: 'aRequestId'
      });
      Payment.handleEvent(event);
      var cancelEvent = {
        detail: {
          config: {
            requestId: 'aRequestId'
          }
        }
      };
      Payment.onPaymentWindowClosedByUser(cancelEvent);
    });

    teardown(function() {
      Payment.paymentWindows.clear();
    });

    test('Should send mozContentEvent cancel event', function() {
      var result = stubDispatchEvent.getCall(1).args[0];
      assert.equal(result.type, 'mozContentEvent');
      assert.equal(result.detail.type, 'cancel');
      assert.equal(result.detail.id, 'aChromeId');
      assert.equal(result.detail.errorMsg, 'DIALOG_CLOSED_BY_USER');
    });

    test('Should remove payment window', function() {
      assert.equal(Payment.paymentWindows.size, 0);
      assert.isFalse(Payment.paymentWindows.has('aRequestId'));
    });
  });
});
