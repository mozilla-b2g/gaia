/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* global asyncStorage */
/* global BaseModule */
/* global ERROR_GET_FXA_ASSERTION */
/* global ERROR_INVALID_SYNC_ACCOUNT */
/* global ERROR_SYNC_APP_KILLED */
/* global ERROR_SYNC_REQUEST */
/* global ERROR_UNVERIFIED_ACCOUNT */
/* global expect */
/* global FxAccountsClient */
/* global IACHandler */
/* global MocksHelper */
/* global MockNavigatormozSetMessageHandler */
/* global MockNavigatorSettings */
/* global MockService */

requireApp('system/js/service.js');
requireApp('system/test/unit/mock_asyncStorage.js');
requireApp('system/js/base_module.js');
requireApp('system/js/sync_state_machine.js');
requireApp('system/js/sync_manager.js');
requireApp('system/test/unit/mock_fxa_client.js');
requireApp('system/test/unit/mock_iac_handler.js');
requireApp('system/test/unit/mock_lazy_loader.js');

require('/shared/js/sync/errors.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');

var mocksForSyncManager = new MocksHelper([
  'asyncStorage',
  'FxAccountsClient',
  'IACHandler',
  'LazyLoader',
  'Service'
]).init();

suite('system/SyncManager >', () => {
  var realMozSetMessageHandler;
  var realMozSettings;
  var systemMessageHandlerSpy;

  mocksForSyncManager.attachTestHelpers();

  suiteSetup(() => {
    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    MockNavigatormozSetMessageHandler.mSetup();
    MockNavigatorSettings.mSetup();
    systemMessageHandlerSpy = this.sinon.spy(navigator, 'mozSetMessageHandler');
  });

  suiteTeardown(() => {
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    navigator.mozSettings = realMozSettings;

    MockNavigatorSettings.mTeardown();
  });

  suite('Initial state', () => {
    var syncManager;

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();
    });

    suiteTeardown(() => {
      syncManager.stop();
    });

    test('Integrity', () => {
      assert.ok(syncManager !== undefined);
      sinon.assert.calledOnce(systemMessageHandlerSpy);
      sinon.assert.calledWith(systemMessageHandlerSpy, 'request-sync');
    });
  });

  suite('Initial state setting', () => {
    var syncManager;

    const syncState = 'sync.state';
    const syncError = 'sync.state.error';
    var nextState;
    var nextError;

    var updateStateSpy;
    var requestStub;
    suiteSetup(() => {
      nextState = 'enabling';
    });

    suiteTeardown(() => {
      asyncStorage.setItem(syncState, 'disabled');
      asyncStorage.setItem(syncError, null);
    });

    setup(done => {
      asyncStorage.setItem(syncState, nextState, () => {
        asyncStorage.setItem(syncError, nextError, () => {
          syncManager = BaseModule.instantiate('SyncManager');
          updateStateSpy = this.sinon.spy(syncManager, 'updateState');
          requestStub = this.sinon.stub(MockService, 'request', () => {
            return Promise.resolve();
          });
          syncManager.start().then(done);
        });
      });
    });

    teardown(() => {
      syncManager.stop();
      updateStateSpy.restore();
      requestStub.restore();
    });

    [{
      syncStateValue: 'enabling',
      nextSyncStateValue: 'errored',
      shouldDisable: true
    }, {
      syncStateValue: 'errored',
      nextSyncStateValue: 'errored',
      nextSyncUnverified: true,
      shouldDisable: true
    }, {
      syncStateValue: 'errored',
      nextSyncStateValue: 'enabled',
      shouldDisable: false
    }, {
      syncStateValue: 'enabled',
      nextSyncStateValue: 'success',
      shouldDisable: false
    }, {
      syncStateValue: 'success',
      nextSyncStateValue: 'syncing',
      shouldDisable: false
    }, {
      syncStateValue: 'syncing',
      nextSyncStateValue: 'disabled',
      shouldDisable: false
    }].forEach(config => {
      test('sync.state ' + config.syncStateValue, () => {
        if (config.shouldDisable) {
          this.sinon.assert.calledOnce(updateStateSpy);
          assert.ok(updateStateSpy.calledWith('disabled'));
          this.sinon.assert.notCalled(requestStub);
        } else {
          this.sinon.assert.notCalled(updateStateSpy);
          this.sinon.assert.calledOnce(requestStub);
          assert.ok(requestStub.calledWith('SyncStateMachine:enable'));
        }

        if (config.nextSyncUnverified) {
          nextError = ERROR_UNVERIFIED_ACCOUNT;
        }
        nextState = config.nextSyncStateValue;
      });
    });

    test('sync.state disabled', () => {
      this.sinon.assert.notCalled(updateStateSpy);
      this.sinon.assert.notCalled(requestStub);
      nextState = 'enabled';
    });
  });

  suite('Sync management IAC based API', () => {
    var syncManager;

    var requestStub;
    var getPortStub;
    var getAccountStub;
    var port;

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();
    });

    suiteTeardown(() => {
      syncManager.stop();
    });

    setup(() => {
      requestStub = this.sinon.stub(MockService, 'request', () => {
        return Promise.resolve();
      });
      getPortStub = this.sinon.stub(IACHandler, 'getPort', () => {
        return port;
      });
      getAccountStub = this.sinon.stub(FxAccountsClient, 'getAccount',
                                       successCb => {
        successCb({
          email: 'user@domain.org'
        });
      });
    });

    teardown(() => {
      requestStub.restore();
      getPortStub.restore();
      getAccountStub.restore();
    });

    ['enable', 'disable', 'sync'].forEach(name => {
      test('receive ' + name + ' IAC request', () => {
        window.dispatchEvent(new CustomEvent('iac-gaia-sync-management', {
          detail: {
            name: name
          }
        }));
        this.sinon.assert.calledOnce(requestStub);
        assert.ok(requestStub.calledWith('SyncStateMachine:' + name));
      });
    });

    test('getInfo request', done => {
      var id = Date.now();
      var sentMessage;
      port = {
        postMessage: function(message) {
          sentMessage = message;
        }
      };
      window.dispatchEvent(new CustomEvent('iac-gaia-sync-management', {
        detail: {
          name: 'getInfo',
          id: id
        }
      }));
      setTimeout(() => {
        this.sinon.assert.notCalled(requestStub);
        this.sinon.assert.calledOnce(getPortStub);
        assert.equal(sentMessage.id, id);
        assert.equal(sentMessage.state, syncManager.state);
        assert.equal(sentMessage.lastSync, syncManager.lastSync);
        assert.equal(sentMessage.user, 'user@domain.org');
        done();
      });
    });

    test('getInfo request - missing id', () => {
      window.dispatchEvent(new CustomEvent('iac-gaia-sync-management', {
        detail: {
          name: 'getInfo'
        }
      }));
      this.sinon.assert.notCalled(requestStub);
      this.sinon.assert.notCalled(getPortStub);
    });

    test('receive unknown IAC request', () => {
      window.dispatchEvent(new CustomEvent('iac-gaia-sync-management', {
        detail: {
          name: 'whatever'
        }
      }));
      this.sinon.assert.notCalled(requestStub);
    });
  });

  suite('onsyncdisabled', () => {
    var syncManager;

    var realNavigatorSync;
    var unregisterSyncSpy;
    var updateStateSpy;
    var removeEventListenerSpy;

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();

      realNavigatorSync = navigator.sync;
      navigator.sync = {
        unregister: function() {
          return Promise.resolve();
        }
      };
      unregisterSyncSpy = this.sinon.spy(navigator.sync, 'unregister');
      updateStateSpy = this.sinon.spy(syncManager, 'updateState');
      removeEventListenerSpy = this.sinon.spy(window, 'removeEventListener');
    });

    suiteTeardown(() => {
      syncManager.stop();
      unregisterSyncSpy.restore();
      updateStateSpy.restore();
      removeEventListenerSpy.restore();
      navigator.sync = realNavigatorSync;
    });

    test('onsyncdisabled received', done => {
      window.dispatchEvent(new CustomEvent('onsyncdisabled'));
      setTimeout(() => {
        this.sinon.assert.calledOnce(unregisterSyncSpy);
        assert.ok(unregisterSyncSpy.calledWith('gaia::system::firefoxsync'));
        this.sinon.assert.calledOnce(updateStateSpy);
        this.sinon.assert.calledOnce(removeEventListenerSpy);
        assert.ok(
          removeEventListenerSpy.calledWith('mozFxAccountsUnsolChromeEvent')
        );
        done();
      });
    });
  });

  suite('onsyncenabled', () => {
    var syncManager;

    var realNavigatorSync;
    var registerSyncSpy;
    var registerError;
    var registrationsError;
    var syncRegistrations = [];
    var updateStateSpy;
    var requestStub;

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();

      realNavigatorSync = navigator.sync;
    });

    suiteTeardown(() => {
      navigator.sync = realNavigatorSync;
      syncManager.stop();
    });

    setup(() => {
      navigator.sync = {
        registrations: function() {
          return registrationsError ? Promise.reject(registrationsError)
                                    : Promise.resolve(syncRegistrations);
        },
        register: function() {
          return registerError ? Promise.reject(registerError)
                               : Promise.resolve();
        }
      };
      registerSyncSpy = this.sinon.spy(navigator.sync, 'register');
      updateStateSpy = this.sinon.spy(syncManager, 'updateState');
      requestStub = this.sinon.stub(MockService, 'request', () => {
        return Promise.resolve();
      });
    });

    teardown(() => {
      registerSyncSpy.restore();
      updateStateSpy.restore();
      requestStub.restore();
    });

    test('onsyncenabled received - success', done => {
      window.dispatchEvent(new CustomEvent('onsyncenabled'));
      setTimeout(() => {
        this.sinon.assert.calledOnce(registerSyncSpy);
        assert.ok(registerSyncSpy.calledWith('gaia::system::firefoxsync'));
        this.sinon.assert.calledOnce(updateStateSpy);
        done();
      });
    });

    test('onsyncenabled received - already registered', done => {
      teardown(() => {
        syncRegistrations = [];
      });

      syncRegistrations = [{
        task: 'gaia::system::firefoxsync'
      }];
      window.dispatchEvent(new CustomEvent('onsyncenabled'));
      setTimeout(() => {
        this.sinon.assert.notCalled(registerSyncSpy);
        this.sinon.assert.calledOnce(updateStateSpy);
        done();
      });
    });

    test('onsyncenabled received - navigator.sync.registrations error',
         done => {
      teardown(() => {
        registrationsError = null;
      });

      registrationsError = 'error';
      window.dispatchEvent(new CustomEvent('onsyncenabled'));
      setTimeout(() => {
        this.sinon.assert.notCalled(registerSyncSpy);
        this.sinon.assert.calledOnce(updateStateSpy);
        this.sinon.assert.calledOnce(requestStub);
        assert.ok(requestStub.calledWith('SyncStateMachine:error'));
        done();
      });
    });

    test('onsyncenabled received - navigator.sync.register error', done => {
      teardown(() => {
        registerError = null;
      });

      registerError = 'error';
      window.dispatchEvent(new CustomEvent('onsyncenabled'));
      setTimeout(() => {
        this.sinon.assert.calledOnce(registerSyncSpy);
        this.sinon.assert.calledOnce(updateStateSpy);
        this.sinon.assert.calledOnce(requestStub);
        assert.ok(requestStub.calledWith('SyncStateMachine:error'));
        done();
      });
    });
  });

  suite('onsyncenabling', () => {
    var syncManager;

    var updateStateStub;
    var requestStub;
    var getAssertionStub;
    var getAssertionError;
    var getKeysStub;
    var getKeysError;
    var trySyncStub;
    var trySyncError;
    var getAccountStub;
    var addEventListenerSpy;

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();
    });

    suiteTeardown(() => {
      syncManager.stop();
    });

    setup(() => {
      updateStateStub = this.sinon.stub(syncManager, 'updateState', () => {
        syncManager.updateStateDeferred = Promise.resolve();
      });
      addEventListenerSpy = this.sinon.spy(window, 'addEventListener');
      requestStub = this.sinon.stub(MockService, 'request', () => {
        return Promise.resolve();
      });
      getAssertionStub = this.sinon.stub(syncManager, 'getAssertion', () => {
        return getAssertionError ? Promise.reject(getAssertionError)
                                 : Promise.resolve();
      });
      getKeysStub = this.sinon.stub(syncManager, 'getKeys', () => {
        return getKeysError ? Promise.reject(getKeysError)
                            : Promise.resolve();
      });
      trySyncStub = this.sinon.stub(syncManager, 'trySync', () => {
        return trySyncError ? Promise.reject(trySyncError)
                            : Promise.resolve();
      });
      getAccountStub = this.sinon.stub(syncManager, 'getAccount', () => {
        return Promise.resolve();
      });
    });

    teardown(() => {
      addEventListenerSpy.restore();
      updateStateStub.restore();
      requestStub.restore();
      getAssertionStub.restore();
      getKeysStub.restore();
      trySyncStub.restore();
      getAccountStub.restore();
    });

    test('onsyncenabling received - success', done => {
      window.dispatchEvent(new CustomEvent('onsyncenabling'));
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(getAssertionStub);
        this.sinon.assert.calledOnce(getKeysStub);
        this.sinon.assert.calledOnce(trySyncStub);
        this.sinon.assert.calledOnce(getAccountStub);
        this.sinon.assert.calledOnce(addEventListenerSpy);
        this.sinon.assert.calledWith(addEventListenerSpy,
                                     'mozFxAccountsUnsolChromeEvent');
        this.sinon.assert.calledOnce(requestStub);
        assert.ok(requestStub.calledWith('SyncStateMachine:success'));
        done();
      });
    });

    test('onsyncenabling received - getAssertion error', done => {
      teardown(() => {
        getAssertionError = null;
      });

      getAssertionError = 'UNVERIFIED_ACCOUNT';
      window.dispatchEvent(new CustomEvent('onsyncenabling'));
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(getAssertionStub);
        this.sinon.assert.notCalled(getKeysStub);
        this.sinon.assert.notCalled(trySyncStub);
        this.sinon.assert.notCalled(getAccountStub);
        this.sinon.assert.calledOnce(addEventListenerSpy);
        this.sinon.assert.calledWith(addEventListenerSpy,
                                     'mozFxAccountsUnsolChromeEvent');
        this.sinon.assert.calledOnce(requestStub);
        assert.equal(requestStub.getCall(0).args[0], 'SyncStateMachine:error');
        assert.equal(requestStub.getCall(0).args[1],
                     ERROR_INVALID_SYNC_ACCOUNT);
        done();
      });
    });

    test('onsyncenabling received - getKeys error', done => {
      teardown(() => {
        getKeysError = null;
      });

      getKeysError = Date.now();
      window.dispatchEvent(new CustomEvent('onsyncenabling'));
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(getAssertionStub);
        this.sinon.assert.calledOnce(getKeysStub);
        this.sinon.assert.notCalled(trySyncStub);
        this.sinon.assert.notCalled(getAccountStub);
        this.sinon.assert.calledOnce(addEventListenerSpy);
        this.sinon.assert.calledWith(addEventListenerSpy,
                                     'mozFxAccountsUnsolChromeEvent');
        this.sinon.assert.calledOnce(requestStub);
        assert.equal(requestStub.getCall(0).args[0], 'SyncStateMachine:error');
        assert.equal(requestStub.getCall(0).args[1], getKeysError);
        done();
      });
    });

    test('onsyncenabling received - trySync error', done => {
      teardown(() => {
        trySyncError = null;
      });

      trySyncError = Date.now();
      window.dispatchEvent(new CustomEvent('onsyncenabling'));
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(getAssertionStub);
        this.sinon.assert.calledOnce(getKeysStub);
        this.sinon.assert.calledOnce(trySyncStub);
        this.sinon.assert.notCalled(getAccountStub);
        this.sinon.assert.calledOnce(addEventListenerSpy);
        this.sinon.assert.calledWith(addEventListenerSpy,
                                     'mozFxAccountsUnsolChromeEvent');
        this.sinon.assert.calledOnce(requestStub);
        assert.equal(requestStub.getCall(0).args[0], 'SyncStateMachine:error');
        assert.equal(requestStub.getCall(0).args[1], trySyncError);
        done();
      });
    });

  });

  suite('onsyncerrored', () => {
    var syncManager;

    var updateStateSpy;
    var requestStub;

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();
    });

    suiteTeardown(() => {
      syncManager.stop();
    });

    setup(() => {
      updateStateSpy = this.sinon.spy(syncManager, 'updateState');
      requestStub = this.sinon.stub(MockService, 'request', () => {
        return Promise.resolve();
      });
    });

    teardown(() => {
      updateStateSpy.restore();
      requestStub.restore();
    });

    test('onsyncerrored received - recoverable error', done => {
      window.dispatchEvent(new CustomEvent('onsyncerrored', {
        detail: {
          args: [ERROR_SYNC_APP_KILLED]
        }
      }));
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateSpy);
        assert.equal(syncManager.error, ERROR_SYNC_APP_KILLED);
        this.sinon.assert.notCalled(requestStub);
        done();
      });
    });

    test('onsyncerrored received - unrecoverable error', done => {
      window.dispatchEvent(new CustomEvent('onsyncerrored', {
        detail: {
          args: [ERROR_SYNC_REQUEST]
        }
      }));
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateSpy);
        assert.equal(syncManager.error, ERROR_SYNC_REQUEST);
        this.sinon.assert.calledOnce(requestStub);
        assert.ok(requestStub.calledWith('SyncStateMachine:disable'));
        done();
      });
    });
  });

  suite('onsyncsyncing', () => {
    var syncManager;

    var updateStateStub;
    var unregisterSyncStub;
    var requestStub;
    var getAssertionStub;
    var getAssertionError;
    var getKeysStub;
    var getKeysError;
    var realMozApps;
    var realUuid;
    var port;
    var portStub;
    var result;
    var assertion = 'assertion';
    var keys = 'keys';
    var id;

    suiteSetup(() => {
      realMozApps = navigator.mozApps;
      realUuid = window.uuid;
      port = {
        postMessage: function() {},
        set onmessage(callback) {
          setTimeout(() => {
            callback({ data: result });
          });
        }
      };

      var app = {
        connect: function() {
          return Promise.resolve([port]);
        }
      };

      var onsuccess = {
        set onsuccess(callback) {
          setTimeout(() => {
            callback({ target: { result: app } });
          });
        }
      };

      navigator.mozApps = {
        getSelf: function() {
          return onsuccess;
        }
      };

      window.uuid = () => {
        return id;
      };

      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();
    });

    suiteTeardown(() => {
      syncManager.stop();
      navigator.mozApps = realMozApps;
      window.uuid = realUuid;
    });

    setup(() => {
      updateStateStub = this.sinon.stub(syncManager, 'updateState');
      unregisterSyncStub = this.sinon.stub(syncManager,
                                           'unregisterSyncRequest');
      requestStub = this.sinon.stub(MockService, 'request', () => {
        return Promise.resolve();
      });
      getAssertionStub = this.sinon.stub(syncManager, 'getAssertion', () => {
        return getAssertionError ? Promise.reject(getAssertionError)
                                 : Promise.resolve(assertion);
      });
      getKeysStub = this.sinon.stub(syncManager, 'getKeys', () => {
        return getKeysError ? Promise.reject(getKeysError)
                            : Promise.resolve(keys);
      });
      portStub = this.sinon.stub(port, 'postMessage');

      syncManager.state = 'syncing';
    });

    teardown(() => {
      updateStateStub.restore();
      unregisterSyncStub.restore();
      requestStub.restore();
      getKeysStub.restore();
      portStub.restore();
      getAssertionStub.restore();
    });

    test('onsyncsyncing - success', done => {
      id = Date.now();
      result = {
        id: id
      };
      var previousLastSync = syncManager.lastSync;
      syncManager._settings['sync.collections.history.enabled'] = true;
      syncManager._settings['sync.collections.history.readonly'] = true;
      window.dispatchEvent(new CustomEvent('onsyncsyncing'));
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(unregisterSyncStub);
        this.sinon.assert.calledOnce(getAssertionStub);
        this.sinon.assert.calledOnce(getKeysStub);
        setTimeout(() => {
          this.sinon.assert.calledOnce(portStub);
          assert.equal(portStub.getCall(0).args[0].assertion, assertion);
          assert.equal(portStub.getCall(0).args[0].keys, keys);
          assert.ok(portStub.getCall(0).args[0].collections.history);
          assert.ok(portStub.getCall(0).args[0].collections.history.readonly);
          setTimeout(() => {
            assert.notEqual(syncManager.lastSync, previousLastSync);
            this.sinon.assert.calledOnce(requestStub);
            assert.ok(requestStub.calledWith('SyncStateMachine:success'));
            done();
          });
        });
      });
    });

   test('onsyncsyncing - no collections selected', done => {
      syncManager._settings['sync.collections.history.enabled'] = false;
      syncManager._settings['sync.collections.passwords.enabled'] = false;
      var previousLastSync = syncManager.lastSync;
      window.dispatchEvent(new CustomEvent('onsyncsyncing'));
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(unregisterSyncStub);
        this.sinon.assert.notCalled(getAssertionStub);
        this.sinon.assert.notCalled(getKeysStub);
        this.sinon.assert.notCalled(portStub);
        this.sinon.assert.calledOnce(requestStub);
        assert.equal(syncManager.lastSync, previousLastSync);
        assert.ok(requestStub.calledWith('SyncStateMachine:success'));
        done();
      });
    });

    test('onsyncsyncing - getAssertion error', done => {
      teardown(() => {
        getAssertionError = null;
      });
      getAssertionError = 'error';
      syncManager._settings['sync.collections.history.enabled'] = true;
      var previousLastSync = syncManager.lastSync;
      window.dispatchEvent(new CustomEvent('onsyncsyncing'));
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(unregisterSyncStub);
        this.sinon.assert.calledOnce(getAssertionStub);
        this.sinon.assert.notCalled(getKeysStub);
        setTimeout(() => {
          this.sinon.assert.notCalled(portStub);
          this.sinon.assert.calledOnce(requestStub);
          assert.equal(syncManager.lastSync, previousLastSync);
          assert.ok(requestStub.calledWith('SyncStateMachine:error'));
          done();
        });
      });
    });

    test('onsyncsyncing - getKeys error', done => {
      teardown(() => {
        getKeysError = null;
      });
      getKeysError = 'error';
      syncManager._settings['sync.collections.history.enabled'] = true;
      var previousLastSync = syncManager.lastSync;
      window.dispatchEvent(new CustomEvent('onsyncsyncing'));
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(unregisterSyncStub);
        this.sinon.assert.calledOnce(getAssertionStub);
        this.sinon.assert.calledOnce(getKeysStub);
        setTimeout(() => {
          this.sinon.assert.notCalled(portStub);
          this.sinon.assert.calledOnce(requestStub);
          assert.equal(syncManager.lastSync, previousLastSync);
          assert.ok(requestStub.calledWith('SyncStateMachine:error'));
          done();
        });
      });
    });

    test('onsyncsyncing - sync app error', done => {
      id = Date.now();
      result = {
        id: id,
        error: 'error'
      };
      syncManager._settings['sync.collections.passwords.enabled'] = true;
      syncManager._settings['sync.collections.passwords.readonly'] = false;
      var previousLastSync = syncManager.lastSync;
      window.dispatchEvent(new CustomEvent('onsyncsyncing'));
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(unregisterSyncStub);
        this.sinon.assert.calledOnce(getAssertionStub);
        this.sinon.assert.calledOnce(getKeysStub);
        setTimeout(() => {
          this.sinon.assert.calledOnce(portStub);
          assert.equal(portStub.getCall(0).args[0].assertion, assertion);
          assert.equal(portStub.getCall(0).args[0].keys, keys);
          assert.ok(portStub.getCall(0).args[0].collections.passwords);
          assert.ok(
            !portStub.getCall(0).args[0].collections.passwords.readonly
          );
          setTimeout(() => {
            this.sinon.assert.calledOnce(requestStub);
            assert.equal(syncManager.lastSync, previousLastSync);
            assert.ok(requestStub.calledWith('SyncStateMachine:error'));
            done();
          });
        });
      });
    });
  });

  suite('Firefox Accounts - onlogout', () => {
    var syncManager;
    var requestSpy;

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();
      requestSpy = this.sinon.spy(MockService, 'request');
    });

    suiteTeardown(() => {
      syncManager.stop();
      requestSpy.restore();
    });

    test('FxA logout should disable Sync', done => {
      requestSpy.reset();
      window.dispatchEvent(new CustomEvent('mozFxAccountsUnsolChromeEvent', {
        detail: {
          eventName: 'onlogout'
        }
      }));
      setTimeout(() => {
        assert.ok(requestSpy.calledWith('SyncStateMachine:disable'));
        done();
      });
    });
  });

  suite('Firefox Accounts - onverified', () => {
    var syncManager;
    var requestSpy;
    var getAccountStub;

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();
      requestSpy = this.sinon.spy(MockService, 'request');
      getAccountStub = this.sinon.stub(FxAccountsClient, 'getAccount',
                                       successCb => {
        successCb({
          email: 'user@domain.org'
        });
      });
    });

    suiteTeardown(() => {
      syncManager.stop();
      requestSpy.restore();
    });

    test('FxA onverified should enable Sync', done => {
      requestSpy.reset();
      syncManager.state = 'errored';
      syncManager.error = ERROR_UNVERIFIED_ACCOUNT;
      window.dispatchEvent(new CustomEvent('mozFxAccountsUnsolChromeEvent', {
        detail: {
          eventName: 'onverified'
        }
      }));
      setTimeout(() => {
        assert.ok(requestSpy.calledWith('SyncStateMachine:enable'));
        done();
      });
    });

    test('FxA onverified and not ERROR_UNVERIFIED_ACCOUNT error ' +
         'should not enable Sync', done => {
      requestSpy.reset();
      syncManager.state = 'errored';
      syncManager.error = ERROR_GET_FXA_ASSERTION;
      window.dispatchEvent(new CustomEvent('mozFxAccountsUnsolChromeEvent', {
        detail: {
          eventName: 'onverified'
        }
      }));
      setTimeout(() => {
        this.sinon.assert.notCalled(requestSpy);
        done();
      });
    });
  });

  suite('FxA getAssertion', () => {
    var syncManager;
    var getAssertionStub;

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();
    });

    teardown(() => {
      syncManager.stop();
    });

    setup(() => {
      getAssertionStub = this.sinon.stub(FxAccountsClient, 'getAssertion',
                                         (options, successCb, errorCb) => {
        successCb('assertion');
      });
    });

    teardown(() => {
      getAssertionStub.restore();
    });

    test('No audience', done => {
      syncManager._settings['sync.fxa.audience'] = null;
      syncManager.getAssertion().then(result => {
        assert.equal(result, 'assertion');
        assert.ok(getAssertionStub.calledOnce);
        assert.deepEqual(getAssertionStub.args[0][0], { audience: null });
        done();
      });
    });

    test('Audience set', done => {
      syncManager._settings['sync.fxa.audience'] = 'audience';
      syncManager.getAssertion().then(result => {
        assert.equal(result, 'assertion');
        assert.ok(getAssertionStub.calledOnce);
        assert.deepEqual(getAssertionStub.args[0][0], { audience: 'audience' });
        done();
      });
    });
  });

  suite('updateState', () => {
    var syncManager;

    var queryStub;
    var queryStubResult = 'qsState';

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();
    });

    suiteTeardown(() => {
      syncManager.stop();
    });

    setup(() => {
      queryStub = this.sinon.stub(MockService, 'query', () => {
        return queryStubResult;
      });
    });

    teardown(() => {
      queryStub.restore();
    });

    test('updateState with params should not query state machine', () => {
      var state = 'state';
      syncManager.updateState(state);
      assert.equal(syncManager.state, state);
      this.sinon.assert.notCalled(queryStub);
    });

    test('updateState w/o params should query state machine', () => {
      syncManager.updateState();
      assert.equal(syncManager.state, queryStubResult);
      this.sinon.assert.calledOnce(queryStub);
      assert.ok(queryStub.calledWith('SyncStateMachine.state'));
    });
  });

  suite('killapp', () => {
    var syncManager;
    var isSyncAppStub;
    var isSyncApp;
    var requestSpy;

    function killapp() {
      window.dispatchEvent(new CustomEvent('killapp', {
        detail: {
          origin: 'whatever'
        }
      }));
    }

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();
    });

    suiteTeardown(() => {
      syncManager.stop();
    });

    setup(() => {
      isSyncAppStub = this.sinon.stub(syncManager, 'isSyncApp', () => {
        return isSyncApp ? Promise.resolve() : Promise.reject();
      });
      requestSpy = this.sinon.spy(MockService, 'request');
    });

    teardown(() => {
      isSyncAppStub.restore();
      requestSpy.restore();
    });

    test('Is Sync app', done => {
      isSyncApp = true;
      killapp();
      setTimeout(() => {
        assert.ok(requestSpy.calledOnce);
        assert.equal(requestSpy.getCall(0).args[0], 'SyncStateMachine:error');
        assert.equal(requestSpy.getCall(0).args[1], ERROR_SYNC_APP_KILLED);
        done();
      });
    });

    test('Is not Sync app', done => {
      isSyncApp = false;
      killapp();
      setTimeout(() => {
        assert.ok(requestSpy.notCalled);
        done();
      });
    });
  });

  suite('appterminated', () => {
    var syncManager;
    var isSyncAppStub;
    var isSyncApp;

    function appterminated() {
      window.dispatchEvent(new CustomEvent('appterminated', {
        detail: {
          origin: 'whatever'
        }
      }));
    }

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();
    });

    suiteTeardown(() => {
      syncManager.stop();
    });

    setup(() => {
      isSyncAppStub = this.sinon.stub(syncManager, 'isSyncApp', () => {
        return isSyncApp ? Promise.resolve() : Promise.reject();
      });
    });

    teardown(() => {
      isSyncAppStub.restore();
    });

    test('No port', done => {
      syncManager._port = undefined;
      appterminated();
      setTimeout(() => {
        assert.ok(isSyncAppStub.notCalled);
        done();
      });
    });

    test('Is Sync app', done => {
      isSyncApp = true;
      syncManager._port = {};
      appterminated();
      setTimeout(() => {
        assert.isNull(syncManager._port);
        done();
      });
    });

    test('Is not Sync app', done => {
      isSyncApp = false;
      syncManager._port = {};
      appterminated();
      setTimeout(() => {
        assert.ok(syncManager._port);
        done();
      });
    });
  });

  suite('isSyncApp', () => {
    var syncManager;
    var realMozApps;
    var connections = [];

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();

      realMozApps = navigator.mozApps;
      var app = {
        getConnections: function() {
          return Promise.resolve(connections);
        }
      };

      var onsuccess = {
        set onsuccess(callback) {
          setTimeout(() => {
            callback({ target: { result: app } });
          });
        }
      };

      navigator.mozApps = {
        getSelf: function() {
          return onsuccess;
        }
      };
    });

    suiteTeardown(() => {
      syncManager.stop();
      navigator.mozApps = realMozApps;
    });

    setup(() => {
      connections = [];
    });

    [{
      test: 'No origin',
      origin: undefined
    }, {
      test: 'No connections',
      origin: 'origin'
    }, {
      test: 'No matching connection',
      origin: 'origin',
      connections: [{
        keyword: 'keyword',
        origin: 'anotherorigin'
      }]
    }].forEach(config => {
      connections = config.connections;
      test(config.test, done => {
        expect(syncManager.isSyncApp(config.origin))
          .to.be.rejectedWith(undefined).and.notify(done);
      });
    });

    test('Matching connection', done => {
      connections = [{
        keyword: 'gaia::sync::request',
        origin: 'origin',
        subscriber: 'origin'
      }];
      syncManager.isSyncApp('origin').then(() => {
        assert.ok(false, 'Unexpected resolution');
        done();
      }).catch(() => {
        assert.ok(true, 'Expected rejection');
        done();
      });
    });
  });

  suite('cleanup', () => {
    var syncManager;
    var unregisterSyncStub;
    var removeEventListenerStub;
    var cancelSyncStub;

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();
    });

    suiteTeardown(() => {
      syncManager.stop();
    });

    setup(() => {
      unregisterSyncStub = this.sinon.stub(syncManager,
                                           'unregisterSyncRequest');
      removeEventListenerStub = this.sinon.stub(window, 'removeEventListener');
      cancelSyncStub = this.sinon.stub(syncManager, 'cancelSync');
    });

    teardown(() => {
      unregisterSyncStub.restore();
      removeEventListenerStub.restore();
      cancelSyncStub.restore();
    });

    test('Cleanup', () => {
      syncManager.cleanup();
      assert.ok(unregisterSyncStub.calledOnce);
      assert.ok(removeEventListenerStub.calledOnce);
      assert.ok(cancelSyncStub.notCalled);
    });

    test('Cleanup while syncing', () => {
      syncManager.state = 'syncing';
      syncManager.cleanup();
      assert.ok(unregisterSyncStub.calledOnce);
      assert.ok(removeEventListenerStub.calledOnce);
      assert.ok(cancelSyncStub.calledOnce);
    });
  });

  suite('updateStatePreference', () => {
    var syncManager;
    var updateStatePreferenceSpy;
    var initialSettingValue;

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();
      initialSettingValue =
        MockNavigatorSettings.mSettings['services.sync.enabled'];
    });

    suiteTeardown(() => {
      syncManager.stop();
      MockNavigatorSettings.mSettings['services.sync.enabled'] =
        initialSettingValue;
    });

    setup(() => {
      updateStatePreferenceSpy = this.sinon.spy(syncManager,
                                                'updateStatePreference');
    });

    teardown(() => {
      updateStatePreferenceSpy.restore();
    });

    ['enabled',
     'enabling'].forEach(state => {
      test(state + ' should update setting', done => {
        MockNavigatorSettings.mSettings['services.sync.enabled'] = false;
        syncManager.state = state;
        assert.ok(updateStatePreferenceSpy.calledOnce);
        assert.ok(MockNavigatorSettings.mSettings['services.sync.enabled']);
        syncManager.updateStateDeferred.then(done);
        window.dispatchEvent(new CustomEvent('mozPrefChromeEvent', {
          detail: {
            prefName: 'services.sync.enabled',
            value: true
          }
        }));
      });
    });

    test('disabled should update setting', done => {
      MockNavigatorSettings.mSettings['services.sync.enabled'] = true;
      syncManager.state = 'disabled';
      assert.ok(updateStatePreferenceSpy.calledOnce);
      assert.ok(!MockNavigatorSettings.mSettings['services.sync.enabled']);
      syncManager.updateStateDeferred.then(done);
      window.dispatchEvent(new CustomEvent('mozPrefChromeEvent', {
        detail: {
          prefName: 'services.sync.enabled',
          value: false
        }
      }));
    });

    ['errored',
     'success',
     'syncing'].forEach(state => {
       test(state + ' should not update setting', () => {
        var initialValue =
          MockNavigatorSettings.mSettings['services.sync.enabled'];
        syncManager.state = state;
        assert.ok(updateStatePreferenceSpy.notCalled);
        assert.equal(MockNavigatorSettings.mSettings['services.sync.enabled'],
                     initialValue);
      });
    });
  });

  suite('trySync', () => {
    var syncManager;
    var iacRequestStub;
    var iacRequestError;

    suiteSetup(() => {
      syncManager = BaseModule.instantiate('SyncManager');
      syncManager.start();
    });

    suiteTeardown(() => {
      syncManager.stop();
    });

    setup(() => {
      iacRequestStub = this.sinon.stub(syncManager, 'iacRequest', () => {
        return Promise.resolve(iacRequestError ? {
          error: {
            message: iacRequestError
          }
        } : undefined);
      });
    });

    teardown(() => {
      iacRequestStub.restore();
    });

    test('trySync success', done => {
      syncManager.trySync().then(done).catch(error => {
        assert.ok(false, 'Unexpected error ' + error);
        done();
      });
    });

    test('trySync error', done => {
      iacRequestError = Date.now();
      syncManager.trySync().then(() => {
        assert.ok(false, 'Unexpected success');
        done();
      }).catch(error => {
        assert.equal(error, iacRequestError);
        done();
      });
    });
  });
});
