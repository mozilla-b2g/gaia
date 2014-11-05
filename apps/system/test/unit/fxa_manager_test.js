'use strict';

requireApp('system/js/fxa_manager.js');
requireApp('system/test/unit/mock_fxa_client.js');
requireApp('system/test/unit/mock_fxa_ui.js');
requireApp('system/test/unit/mock_iac_handler.js');

require('/shared/test/unit/mocks/mock_lazy_loader.js');

var MockEventListener = {};
function MockAddEventListener(event, listener) {
  MockEventListener[event] = listener;
}

var mocksHelperFxAManager = new MocksHelper([
  'FxAccountsClient',
  'FxAccountsUI',
  'IACHandler',
  'LazyLoader'
]).init();

suite('system/FxAccountManager >', function() {
  var stubAddEventListener;

  mocksHelperFxAManager.attachTestHelpers();

  setup(function() {
    stubAddEventListener = this.sinon.stub(window, 'addEventListener',
                                           MockAddEventListener);
    FxAccountsManager.init();
  });

  teardown(function() {
    stubAddEventListener.restore();
  });

  suite('Init', function() {
    test('Integrity', function() {
      assert.isNotNull(FxAccountsManager);
      assert.equal(Object.keys(FxAccountsManager).length, 5);
    });

    test('Test event listeners', function() {
      assert.ok(MockEventListener['iac-fxa-mgmt']);
      assert.ok(MockEventListener['iac-fxa-mgmt'] instanceof Function);
      assert.ok(MockEventListener['mozFxAccountsUnsolChromeEvent']);
      assert.ok(MockEventListener['mozFxAccountsUnsolChromeEvent'] instanceof
                Object);
    });
  });

  suite('On getAccounts port message, successCb', function() {
    setup(function() {
      FxAccountsClient._successMsg = 'success';
      FxAccountsManager.onPortMessage({
        'detail': {
          'name': 'getAccounts'
        }
      });
    });

    teardown(function() {
      FxAccountsClient._reset();
    });

    test('FxAccountsClient.getAccounts called', function() {
      assert.equal(FxAccountsClient._call, 'getAccounts');
    });

    test('Got fxa-mgmt port', function() {
      assert.equal(MockIACPort._name, 'fxa-mgmt');
    });

    test('Sent success message through port', function() {
      assert.equal(MockIACPort._messages.length, 1);
      assert.ok(MockIACPort._messages[0] instanceof Object);
      assert.deepEqual(MockIACPort._messages[0], {
        'methodName': 'getAccounts',
        'data': 'success'
      });
    });
  });

  suite('On getAccounts port message, errorCb', function() {
    setup(function() {
      FxAccountsClient._errorMsg = 'error';
      FxAccountsManager.onPortMessage({
        'detail': {
          'name': 'getAccounts'
        }
      });
    });

    teardown(function() {
      FxAccountsClient._reset();
    });

    test('FxAccountsClient.getAccounts called', function() {
      assert.equal(FxAccountsClient._call, 'getAccounts');
    });

    test('Got fxa-mgmt port', function() {
      assert.equal(MockIACPort._name, 'fxa-mgmt');
    });

    test('Sent success message through port', function() {
      assert.equal(MockIACPort._messages.length, 1);
      assert.ok(MockIACPort._messages[0] instanceof Object);
      assert.deepEqual(MockIACPort._messages[0], {
        'methodName': 'getAccounts',
        'error': 'error'
      });
    });
  });

  suite('On logout port message, successCb', function() {
    setup(function() {
      FxAccountsClient._successMsg = 'success';
      FxAccountsManager.onPortMessage({
        'detail': {
          'name': 'logout'
        }
      });
    });

    teardown(function() {
      FxAccountsClient._reset();
    });

    test('FxAccountsClient.logout called', function() {
      assert.equal(FxAccountsClient._call, 'logout');
    });

    test('Got fxa-mgmt port', function() {
      assert.equal(MockIACPort._name, 'fxa-mgmt');
    });

    test('Sent success message through port', function() {
      assert.equal(MockIACPort._messages.length, 1);
      assert.ok(MockIACPort._messages[0] instanceof Object);
      assert.deepEqual(MockIACPort._messages[0], {
        'methodName': 'logout',
        'data': 'success'
      });
    });
  });

  suite('On logout port message, errorCb', function() {
    setup(function() {
      FxAccountsClient._errorMsg = 'error';
      FxAccountsManager.onPortMessage({
        'detail': {
          'name': 'logout'
        }
      });
    });

    teardown(function() {
      FxAccountsClient._reset();
    });

    test('FxAccountsClient.logout called', function() {
      assert.equal(FxAccountsClient._call, 'logout');
    });

    test('Got fxa-mgmt port', function() {
      assert.equal(MockIACPort._name, 'fxa-mgmt');
    });

    test('Sent success message through port', function() {
      assert.equal(MockIACPort._messages.length, 1);
      assert.ok(MockIACPort._messages[0] instanceof Object);
      assert.deepEqual(MockIACPort._messages[0], {
        'methodName': 'logout',
        'error': 'error'
      });
    });
  });

  suite('On openFlow port message, successCb', function() {
    setup(function() {
      FxAccountsUI._successMsg = 'success';
      FxAccountsManager.onPortMessage({
        'detail': {
          'name': 'openFlow'
        }
      });
    });

    teardown(function() {
      FxAccountsUI._reset();
    });

    test('FxAccountsUI.login called', function() {
      assert.equal(FxAccountsUI._call, 'login');
    });

    test('Got fxa-mgmt port', function() {
      assert.equal(MockIACPort._name, 'fxa-mgmt');
    });

    test('Sent success message through port', function() {
      assert.equal(MockIACPort._messages.length, 1);
      assert.ok(MockIACPort._messages[0] instanceof Object);
      assert.deepEqual(MockIACPort._messages[0], {
        'methodName': 'openFlow',
        'data': 'success'
      });
    });
  });

  suite('On openFlow port message, errorCb', function() {
    setup(function() {
      FxAccountsUI._errorMsg = 'error';
      FxAccountsManager.onPortMessage({
        'detail': {
          'name': 'openFlow'
        }
      });
    });

    teardown(function() {
      FxAccountsUI._reset();
    });

    test('FxAccountsUI.login called', function() {
      assert.equal(FxAccountsUI._call, 'login');
    });

    test('Got fxa-mgmt port', function() {
      assert.equal(MockIACPort._name, 'fxa-mgmt');
    });

    test('Sent success message through port', function() {
      assert.equal(MockIACPort._messages.length, 1);
      assert.ok(MockIACPort._messages[0] instanceof Object);
      assert.deepEqual(MockIACPort._messages[0], {
        'methodName': 'openFlow',
        'error': 'error'
      });
    });
  });

  suite('On openFlow mozFxAccountsRPChromeEvent', function() {
    var id = 123;
    var dispatchEventStub;
    setup(function() {
      dispatchEventStub = this.sinon.stub(window, 'dispatchEvent');

      FxAccountsUI._successMsg = 'success';
      FxAccountsManager.handleEvent({
        'detail': {
          'id': id,
          'eventName': 'openFlow'
        }
      });
    });

    teardown(function() {
      dispatchEventStub.restore();
      FxAccountsUI._reset();
    });

    test('FxAccountsUI.login called', function() {
      assert.equal(FxAccountsUI._call, 'login');
    });

    test('on FxAccountsUI reply sendContentEvent', function() {
      sinon.assert.calledOnce(dispatchEventStub);
    });
  });

  suite('On refreshAuthentication port message, successCb', function() {
    setup(function() {
      FxAccountsUI._successMsg = 'success';
      FxAccountsManager.onPortMessage({
        'detail': {
          'name': 'refreshAuthentication',
          'email': 'dummy@domain.org'
        }
      });
    });

    teardown(function() {
      FxAccountsUI._reset();
    });

    test('FxAccountsUI.refreshAuthentication called', function() {
      assert.equal(FxAccountsUI._call, 'refreshAuthentication');
      assert.equal(FxAccountsUI._email, 'dummy@domain.org');
    });

    test('Got fxa-mgmt port', function() {
      assert.equal(MockIACPort._name, 'fxa-mgmt');
    });

    test('Sent success message through port', function() {
      assert.equal(MockIACPort._messages.length, 1);
      assert.ok(MockIACPort._messages[0] instanceof Object);
      assert.deepEqual(MockIACPort._messages[0], {
        'methodName': 'refreshAuthentication',
        'data': 'success'
      });
    });
  });

  suite('On refreshAuthentication port message, errorCb', function() {
    setup(function() {
      FxAccountsUI._errorMsg = 'error';
      FxAccountsManager.onPortMessage({
        'detail': {
          'name': 'refreshAuthentication',
          'email': 'dummy@domain.org'
        }
      });
    });

    teardown(function() {
      FxAccountsUI._reset();
    });

    test('FxAccountsUI.refreshAuthentication called', function() {
      assert.equal(FxAccountsUI._call, 'refreshAuthentication');
      assert.equal(FxAccountsUI._email, 'dummy@domain.org');
    });

    test('Got fxa-mgmt port', function() {
      assert.equal(MockIACPort._name, 'fxa-mgmt');
    });

    test('Sent success message through port', function() {
      assert.equal(MockIACPort._messages.length, 1);
      assert.ok(MockIACPort._messages[0] instanceof Object);
      assert.deepEqual(MockIACPort._messages[0], {
        'methodName': 'refreshAuthentication',
        'error': 'error'
      });
    });
  });

  suite('On refreshAuthentication mozFxAccountsRPChromeEvent', function() {
    var id = 123;
    var dispatchEventStub;
    setup(function() {
      dispatchEventStub = this.sinon.stub(window, 'dispatchEvent');

      FxAccountsUI._successMsg = 'success';
      FxAccountsManager.handleEvent({
        'detail': {
          'id': id,
          'eventName': 'refreshAuthentication',
          'data': {
            'email': 'dummy@domain.org'
          }
        }
      });
    });

    teardown(function() {
      dispatchEventStub.restore();
      FxAccountsUI._reset();
    });

    test('FxAccountsUI.refreshAuthentication called', function() {
      assert.equal(FxAccountsUI._call, 'refreshAuthentication');
      assert.equal(FxAccountsUI._email, 'dummy@domain.org');
    });

    test('on FxAccountsUI reply sendContentEvent', function() {
      sinon.assert.calledOnce(dispatchEventStub);
    });
  });

  suite('On resendVerificationEmail port message, successCb', function() {
    setup(function() {
      FxAccountsClient._successMsg = 'success';
      FxAccountsManager.onPortMessage({
        'detail': {
          'name': 'resendVerificationEmail'
        }
      });
    });

    teardown(function() {
      FxAccountsClient._reset();
    });

    test('FxAccountsClient.resendVerificationEmail called', function() {
      assert.equal(FxAccountsClient._call, 'resendVerificationEmail');
    });

    test('Got fxa-mgmt port', function() {
      assert.equal(MockIACPort._name, 'fxa-mgmt');
    });

    test('Sent success message through port', function() {
      assert.equal(MockIACPort._messages.length, 1);
      assert.ok(MockIACPort._messages[0] instanceof Object);
      assert.deepEqual(MockIACPort._messages[0], {
        'methodName': 'resendVerificationEmail',
        'data': 'success'
      });
    });
  });

  suite('On resendVerificationEmail port message, errorCb', function() {
    setup(function() {
      FxAccountsClient._errorMsg = 'error';
      FxAccountsManager.onPortMessage({
        'detail': {
          'name': 'resendVerificationEmail'
        }
      });
    });

    teardown(function() {
      FxAccountsClient._reset();
    });

    test('FxAccountsClient.resendVerificationEmail called', function() {
      assert.equal(FxAccountsClient._call, 'resendVerificationEmail');
    });

    test('Got fxa-mgmt port', function() {
      assert.equal(MockIACPort._name, 'fxa-mgmt');
    });

    test('Sent success message through port', function() {
      assert.equal(MockIACPort._messages.length, 1);
      assert.ok(MockIACPort._messages[0] instanceof Object);
      assert.deepEqual(MockIACPort._messages[0], {
        'methodName': 'resendVerificationEmail',
        'error': 'error'
      });
    });
  });


});
