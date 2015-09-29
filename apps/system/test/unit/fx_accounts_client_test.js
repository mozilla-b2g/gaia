/* global FxAccountsClient */
'use strict';

requireApp('system/js/fx_accounts_client.js');

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

  var promiseResolved = false;
  var promiseRejected = false;

  var stubAddEventListener;
  var stubRemoveEventListener;
  var stubDispatchEvent;

  function resolve(data) {
    promiseResolved = true;
    result = data;
  }

  function reject(errorMsg) {
    promiseRejected = true;
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
      assert.equal(Object.keys(FxAccountsClient).length, 9);
    });

    test('No event listeners', function() {
      assert.isUndefined(MockEventListener.mozFxAccountsChromeEvent);
    });
  });

  // API calls

  suite('getAccount', function() {
    setup(function() {
      // This only creates the promise, and does not wait for it to be
      // resolved or rejected; the sub-suites take care of that part
      // (same in other setup functions below).
      FxAccountsClient.getAccount().then(resolve, reject);
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 1);
      assert.ok(MockEventListener.mozFxAccountsChromeEvent);
      assert.ok(MockDispatchedEvents[0].detail.id);
      assert.ok(MockDispatchedEvents[0].detail.data);
      assert.deepEqual(MockDispatchedEvents[0].detail.data, {
        method: 'getAccount'
      });
    });
  });

  suite('getAccount reply success', function() {
    setup(function(done) {
      MockEventListener.mozFxAccountsChromeEvent({
        detail: {
          id: MockDispatchedEvents[0].detail.id,
          data: expectedData
        }
      });
      // Wait for promise to resolve (same in other setup functions below):
      setTimeout(function() {
        done();
      }, 0);
    });

    suiteTeardown(function() {
      MockDispatchedEvents = [];
      result = null;
      error = null;
      promiseResolved = false;
      promiseRejected = false;
    });

    test('On chrome event', function() {
      assert.isTrue(promiseResolved);
      assert.isFalse(promiseRejected);
      assert.equal(result, expectedData);
    });
  });

  suite('getAccount', function() {
    setup(function() {
      FxAccountsClient.getAccount().then(resolve, reject);
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 1);
      assert.ok(MockEventListener.mozFxAccountsChromeEvent);
      assert.ok(MockDispatchedEvents[0].detail.id);
      assert.ok(MockDispatchedEvents[0].detail.data);
      assert.deepEqual(MockDispatchedEvents[0].detail.data, {
        method: 'getAccount'
      });
    });
  });

  suite('getAccount reply error', function() {
    setup(function(done) {
      MockEventListener.mozFxAccountsChromeEvent({
        detail: {
          id: MockDispatchedEvents[0].detail.id,
          error: expectedError
        }
      });
      // Give eventloop time to do the promise resolution in reaction to this
      // mock event (same for other setup functions below).
      setTimeout(done, 0);
    });

    suiteTeardown(function() {
      MockDispatchedEvents = [];
      result = null;
      error = null;
      promiseResolved = false;
      promiseRejected = false;
    });

    test('On chrome event', function() {
      assert.isFalse(promiseResolved);
      assert.isTrue(promiseRejected);
      assert.equal(error, expectedError);
    });
  });

  suite('logout', function() {
    setup(function() {
      FxAccountsClient.logout().then(resolve, reject);
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 1);
      assert.ok(MockEventListener.mozFxAccountsChromeEvent);
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
      FxAccountsClient.queryAccount('email').then(resolve, reject);
      FxAccountsClient.verificationStatus('email').then(resolve, reject);
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 2);
      assert.ok(MockEventListener.mozFxAccountsChromeEvent);
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
      FxAccountsClient.signIn('email', 'pass').then(resolve, reject);
      FxAccountsClient.signUp('email', 'pass').then(resolve, reject);
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 2);
      assert.ok(MockEventListener.mozFxAccountsChromeEvent);
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
      FxAccountsClient.resendVerificationEmail('email').then(resolve, reject);
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 1);
      assert.ok(MockEventListener.mozFxAccountsChromeEvent);
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

  suite('getKeys', function() {
    setup(function() {
      FxAccountsClient.getKeys().then(resolve, reject);
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 1);
      assert.ok(MockEventListener.mozFxAccountsChromeEvent);
      assert.ok(MockDispatchedEvents[0].detail.id);
      assert.ok(MockDispatchedEvents[0].detail.data);
      assert.deepEqual(MockDispatchedEvents[0].detail.data, {
        method: 'getKeys'
      });
    });
  });

  suite('getKeys response', function() {
    setup(function(done) {
      MockEventListener.mozFxAccountsChromeEvent({
        detail: {
          id: MockDispatchedEvents[0].detail.id,
          data: expectedData
        }
      });
      setTimeout(done, 0);
    });

    suiteTeardown(function() {
      MockDispatchedEvents = [];
      result = null;
      error = null;
      promiseResolved = false;
      promiseRejected = false;
    });

    test('On chrome event', function() {
      assert.isTrue(promiseResolved);
      assert.isFalse(promiseRejected);
      assert.equal(result, expectedData);
    });
  });

  suite('getAssertion', function() {
    setup(function() {
      FxAccountsClient.getAssertion({
        silent: true,
        audience: 'audience'
      }).then(resolve, reject);
    });

    teardown(function() {
      MockDispatchedEvents = [];
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 1);
      assert.ok(MockEventListener.mozFxAccountsChromeEvent);
      assert.ok(MockDispatchedEvents[0].detail.id);
      assert.ok(MockDispatchedEvents[0].detail.data);
      assert.deepEqual(MockDispatchedEvents[0].detail.data, {
        method: 'getAssertion',
        silent: true,
        audience: 'audience'
      });
    });
  });

  suite('getAssertion - no options', function() {
    setup(function() {
      FxAccountsClient.getAssertion(null).then(resolve, reject);
    });

    teardown(function() {
      MockDispatchedEvents = [];
    });

    test('Event dispatched to chrome side', function() {
      assert.equal(MockDispatchedEvents.length, 1);
      assert.ok(MockEventListener.mozFxAccountsChromeEvent);
      assert.ok(MockDispatchedEvents[0].detail.id);
      assert.ok(MockDispatchedEvents[0].detail.data);
      assert.deepEqual(MockDispatchedEvents[0].detail.data, {
        method: 'getAssertion',
        silent: null,
        audience: null
      });
    });
  });

  suite('getAssertion response', function() {
    setup(function(done) {
      FxAccountsClient.getAssertion(null).then(resolve, reject);
      MockEventListener.mozFxAccountsChromeEvent({
        detail: {
          id: MockDispatchedEvents[0].detail.id,
          data: expectedData
        }
      });
      setTimeout(done, 0);
    });

    suiteTeardown(function() {
      MockDispatchedEvents = [];
      result = null;
      error = null;
      promiseResolved = false;
      promiseRejected = false;
    });

    test('On chrome event', function() {
      assert.isTrue(promiseResolved);
      assert.isFalse(promiseRejected);
      assert.equal(result, expectedData);
    });
  });

});
