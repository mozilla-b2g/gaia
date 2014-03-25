'use strict';

/* global CallHandler, KeypadManager, MockNavigatorMozTelephony, MocksHelper,
          Promise */

require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/test/unit/mock_keypad.js');

require('/emergency-call/js/dialer.js');

var mocksHelperForDialer = new MocksHelper([
  'KeypadManager'
]).init();

suite('Emergency Dialer', function() {
  var realMozTelephony;

  mocksHelperForDialer.attachTestHelpers();

  suiteSetup(function() {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    CallHandler._telephony = MockNavigatorMozTelephony;
  });

  suiteTeardown(function() {
    navigator.mozTelephony = realMozTelephony;
  });

  suite('> Classic Telephony API', function() {
    var mockCall;

    setup(function() {
      mockCall = {};
      this.sinon.stub(navigator.mozTelephony, 'dialEmergency')
        .returns(mockCall);
      CallHandler.call('123');
    });

    test('> calls dialEmergency', function() {
      sinon.assert.calledWith(navigator.mozTelephony.dialEmergency, '123');
    });

    test('> installs onconnected handler', function() {
      assert.isFunction(mockCall.onconnected);
    });

    test('> installs ondisconnected handler', function() {
      assert.isFunction(mockCall.ondisconnected);
    });

    test('> clears the keypad on connected', function() {
      this.sinon.spy(KeypadManager, 'updatePhoneNumber');
      mockCall.onconnected();
      sinon.assert.calledWith(KeypadManager.updatePhoneNumber, '');
    });

    test('> clears the keypad on disconnected', function() {
      this.sinon.spy(KeypadManager, 'updatePhoneNumber');
      mockCall.ondisconnected();
      sinon.assert.calledWith(KeypadManager.updatePhoneNumber, '');
    });

  });

  suite('> Promise Telephony API', function() {
    var mockCall;
    var mockPromise;

    setup(function() {
      mockCall = {};
      mockPromise = Promise.resolve(mockCall);
      this.sinon.stub(navigator.mozTelephony, 'dialEmergency')
        .returns(mockPromise);
      CallHandler.call('123');
    });

    test('> calls dialEmergency', function() {
      sinon.assert.calledWith(navigator.mozTelephony.dialEmergency, '123');
    });

    test('> installs onconnected handler', function(done) {
      mockPromise.then(function() {
        assert.isFunction(mockCall.onconnected);
      }).then(done, done);
    });

    test('> installs ondisconnected handler', function(done) {
      mockPromise.then(function() {
        assert.isFunction(mockCall.ondisconnected);
      }).then(done, done);
    });

    test('> clears the keypad on connected', function(done) {
      this.sinon.spy(KeypadManager, 'updatePhoneNumber');
      mockPromise.then(function() {
        mockCall.onconnected();
        sinon.assert.calledWith(KeypadManager.updatePhoneNumber, '');
      }).then(done, done);
    });

    test('> clears the keypad on disconnected', function(done) {
      this.sinon.spy(KeypadManager, 'updatePhoneNumber');
      mockPromise.then(function() {
        mockCall.ondisconnected();
        sinon.assert.calledWith(KeypadManager.updatePhoneNumber, '');
      }).then(done, done);
    });
  });
});
