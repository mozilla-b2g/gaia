'use strict';

requireApp('system/js/fxa_client.js');

var MockEventListener = {};
var MockDispatchedEvents = [];

function MockAddEventListener(event, listener) {
  MockEventListener[event] = listener;
}

function MockRemoveEventListener(event, listener) {
  delete MockEventListener[event];
}

function MockDispatchEvent(event) {
  MockDispatchedEvents.push(event);
}


suite('system/FxAccountsClient >', function() {
  var result = null;
  var error = null;

  var expectedData = 'data';
  var expectedError = 'error';

  var successCbCalled = false;
  var errorCbCalled = false;

  var stubAddEventListener;
  var stubRemoveEventListener;
  var stubDispatchEvent;

  function successCb(data) {
    successCbCalled = true;
    result = data;
  }

  function errorCb(errorMsg) {
    errorCbCalled = true;
    error = errorMsg;
  }

  setup(function() {
    stubAddEventListener = this.sinon.stub(window, 'addEventListener',
                                           MockAddEventListener);
    stubRemoveEventListener = this.sinon.stub(window, 'removeEventListener',
                                              MockRemoveEventListener);
    stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent',
                                        MockDispatchEvent);
  });

  teardown(function() {
    stubAddEventListener.restore();
    stubRemoveEventListener.restore();
    stubDispatchEvent.restore();
  });

  suite('Init', function() {
    test('Integrity', function() {
      assert.isNotNull(FxAccountsClient);
      assert.equal(Object.keys(FxAccountsClient).length, 7);
    });

    test('No event listeners', function() {
      assert.isUndefined(MockEventListener['mozFxAccountsChromeEvent']);
    });
  });

  // API calls

  suite('getAccounts', function() {
    setup(function() {
      FxAccountsClient.getAccounts(successCb, errorCb);
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 1);
      assert.ok(MockEventListener['mozFxAccountsChromeEvent']);
      assert.ok(MockDispatchedEvents[0].detail.id);
      assert.ok(MockDispatchedEvents[0].detail.data);
      assert.deepEqual(MockDispatchedEvents[0].detail.data, {
        method: 'getAccounts'
      });
    });
  });

  suite('getAccounts reply success', function() {
    setup(function() {
      MockEventListener['mozFxAccountsChromeEvent']({
        detail: {
          id: MockDispatchedEvents[0].detail.id,
          data: expectedData
        }
      });
    });

    suiteTeardown(function() {
      MockDispatchedEvents = [];
      result = null;
      error = null;
      successCbCalled = false;
      errorCbCalled = false;
    });

    test('On chrome event', function() {
      assert.isTrue(successCbCalled);
      assert.isFalse(errorCbCalled);
      assert.equal(result, expectedData);
      assert.isUndefined(MockEventListener['mozFxAccountsChromeEvent']);
    });
  });

  suite('getAccounts', function() {
    setup(function() {
      FxAccountsClient.getAccounts(successCb, errorCb);
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 1);
      assert.ok(MockEventListener['mozFxAccountsChromeEvent']);
      assert.ok(MockDispatchedEvents[0].detail.id);
      assert.ok(MockDispatchedEvents[0].detail.data);
      assert.deepEqual(MockDispatchedEvents[0].detail.data, {
        method: 'getAccounts'
      });
    });
  });

  suite('getAccounts reply error', function() {
    setup(function() {
      MockEventListener['mozFxAccountsChromeEvent']({
        detail: {
          id: MockDispatchedEvents[0].detail.id,
          error: expectedError
        }
      });
    });

    suiteTeardown(function() {
      MockDispatchedEvents = [];
      result = null;
      error = null;
      successCbCalled = false;
      errorCbCalled = false;
    });

    test('On chrome event', function() {
      assert.isFalse(successCbCalled);
      assert.isTrue(errorCbCalled);
      assert.equal(error, expectedError);
      assert.isUndefined(MockEventListener['mozFxAccountsChromeEvent']);
    });
  });

  suite('logout', function() {
    setup(function() {
      FxAccountsClient.logout(successCb, errorCb);
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 1);
      assert.ok(MockEventListener['mozFxAccountsChromeEvent']);
      assert.ok(MockDispatchedEvents[0].detail.id);
      assert.ok(MockDispatchedEvents[0].detail.data);
      assert.deepEqual(MockDispatchedEvents[0].detail.data, {
        method: 'logout'
      });
    });

    suiteTeardown(function() {
      MockDispatchedEvents = [];
    });
  });

  suite('queryAccount/verificationStatus', function() {
    setup(function() {
      FxAccountsClient.queryAccount('email', successCb, errorCb);
      FxAccountsClient.verificationStatus('email', successCb, errorCb);
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 2);
      assert.ok(MockEventListener['mozFxAccountsChromeEvent']);
      assert.ok(MockDispatchedEvents[0].detail.id);
      assert.ok(MockDispatchedEvents[1].detail.id);
      assert.ok(MockDispatchedEvents[0].detail.data);
      assert.ok(MockDispatchedEvents[1].detail.data);
      assert.deepEqual(MockDispatchedEvents[0].detail.data, {
        method: 'queryAccount',
        email: 'email'
      });
      assert.deepEqual(MockDispatchedEvents[1].detail.data, {
        method: 'verificationStatus',
        email: 'email'
      });
    });

    suiteTeardown(function() {
      MockDispatchedEvents = [];
    });
  });

  suite('signIn/signUp', function() {
    setup(function() {
      FxAccountsClient.signIn('email', 'pass', successCb, errorCb);
      FxAccountsClient.signUp('email', 'pass', successCb, errorCb);
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 2);
      assert.ok(MockEventListener['mozFxAccountsChromeEvent']);
      assert.ok(MockDispatchedEvents[0].detail.id);
      assert.ok(MockDispatchedEvents[1].detail.id);
      assert.ok(MockDispatchedEvents[0].detail.data);
      assert.ok(MockDispatchedEvents[1].detail.data);
      assert.deepEqual(MockDispatchedEvents[0].detail.data, {
        method: 'signIn',
        email: 'email',
        password: 'pass'
      });
      assert.deepEqual(MockDispatchedEvents[1].detail.data, {
        method: 'signUp',
        email: 'email',
        password: 'pass'
      });
    });

    suiteTeardown(function() {
      MockDispatchedEvents = [];
    });
  });

  suite('resendVerificationEmail', function() {
    setup(function() {
      FxAccountsClient.resendVerificationEmail('email', successCb, errorCb);
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 1);
      assert.ok(MockEventListener['mozFxAccountsChromeEvent']);
      assert.ok(MockDispatchedEvents[0].detail.id);
      assert.ok(MockDispatchedEvents[0].detail.data);
      assert.deepEqual(MockDispatchedEvents[0].detail.data, {
        method: 'resendVerificationEmail',
        email: 'email'
      });
    });

    suiteTeardown(function() {
      MockDispatchedEvents = [];
    });
  });

});
