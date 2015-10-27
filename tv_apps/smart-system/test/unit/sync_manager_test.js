/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* global asyncStorage */
/* global ERROR_GET_FXA_ASSERTION */
/* global ERROR_SYNC_APP_KILLED */
/* global ERROR_SYNC_REQUEST */
/* global ERROR_UNVERIFIED_ACCOUNT */
/* global expect */
/* global FxAccountsClient */
/* global IACHandler */
/* global MocksHelper */
/* global MockNavigatormozSetMessageHandler */
/* global MockNavigatorSettings */
/* global SettingsListener */
/* global SyncManager */
/* global SyncStateMachine */

require('/shared/js/sync/errors.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');

requireApp('smart-system/test/unit/mock_asyncStorage.js');
requireApp('smart-system/js/sync_state_machine.js');
requireApp('smart-system/js/sync_manager.js');
requireApp('smart-system/test/unit/mock_fxa_client.js');
requireApp('smart-system/test/unit/mock_iac_handler.js');

var mocksForSyncManager = new MocksHelper([
  'asyncStorage',
  'FxAccountsClient',
  'IACHandler',
  'LazyLoader',
  'SettingsListener'
]).init();

suite('smart-system/SyncManager >', () => {
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
    var settingsObserveSpy;

    suiteSetup(() => {
      syncManager = new SyncManager();
      settingsObserveSpy = this.sinon.spy(SettingsListener, 'observe');
      syncManager.start();
    });

    suiteTeardown(() => {
      settingsObserveSpy.restore();
      syncManager.stop();
    });

    test('Integrity', () => {
      assert.ok(syncManager !== undefined);
      sinon.assert.calledOnce(systemMessageHandlerSpy);
      sinon.assert.calledWith(systemMessageHandlerSpy, 'request-sync');
      ['sync.collections.bookmarks.enabled',
       'sync.collections.history.enabled',
       'sync.collections.passwords.enabled',
       'sync.collections.bookmarks.readonly',
       'sync.collections.history.readonly',
       'sync.collections.passwords.readonly',
       'sync.server.url',
       'sync.scheduler.interval',
       'sync.scheduler.wifionly',
       'sync.fxa.audience'].forEach(setting => {
         assert.ok(settingsObserveSpy.calledWith(setting));
      });
    });
  });

  suite('Initial state setting', () => {
    var syncManager;

    const syncState = 'sync.state';
    const syncError = 'sync.state.error';
    var nextState;
    var nextError;

    var updateStateSpy;
    var enableSpy;
    var syncSpy;
    var registerSyncRequestStub;
    var unregisterSyncRequestStub;

    suiteSetup(() => {
      nextState = 'enabling';
      enableSpy = this.sinon.spy(SyncStateMachine, 'enable');
      syncSpy = this.sinon.spy(SyncStateMachine, 'sync');
    });

    suiteTeardown(() => {
      asyncStorage.setItem(syncState, 'disabled');
      asyncStorage.setItem(syncError, null);
      enableSpy.restore();
      syncSpy.restore();
      syncManager.stop();
    });

    setup(done => {
      SyncStateMachine.state = 'disabled';
      asyncStorage.setItem(syncState, nextState, () => {
        asyncStorage.setItem(syncError, nextError, () => {
          nextError = null;
          syncManager = new SyncManager();
          updateStateSpy = this.sinon.spy(syncManager, 'updateState');
          registerSyncRequestStub = this.sinon.stub(syncManager,
                                                    'registerSyncRequest',
                                                    () => {
            return Promise.resolve();
          });
          unregisterSyncRequestStub = this.sinon.stub(syncManager,
                                                      'unregisterSyncRequest',
                                                      () => {});
          this.sinon.stub(syncManager, 'updateStatePreference', () => {
            return Promise.resolve();
          });
          this.sinon.stub(syncManager, 'getKeys', () => {
            return Promise.resolve();
          });
          this.sinon.stub(syncManager, 'trySync', () => {
            return Promise.resolve();
          });
          syncManager.start().then(done);
        });
      });
    });

    teardown(() => {
      updateStateSpy.restore();
      enableSpy.reset();
      syncSpy.reset();
      unregisterSyncRequestStub.restore();
      syncManager.stop();
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
          this.sinon.assert.notCalled(enableSpy);
        } else {
          this.sinon.assert.calledOnce(enableSpy);
        }

        ((shouldDisable) => {
          setTimeout(() => {
            shouldDisable ? this.sinon.assert.notCalled(syncSpy)
                          : this.sinon.assert.calledOnce(syncSpy);
          });
        })(config.shouldDisable);

        if (config.nextSyncUnverified) {
          nextError = ERROR_UNVERIFIED_ACCOUNT;
        }
        nextState = config.nextSyncStateValue;
      });
    });

    test('sync.state disabled', () => {
      this.sinon.assert.notCalled(updateStateSpy);
      this.sinon.assert.notCalled(enableSpy);
      nextState = 'enabled';
    });
  });

  suite('Sync management IAC based API', () => {
    var syncManager;

    var spies = {};
    var getPortStub;
    var getAccountStub;
    var port;

    suiteSetup(() => {
      syncManager = new SyncManager();
      syncManager.start();
    });

    suiteTeardown(() => {
      syncManager.stop();
    });

    setup(() => {
      spies.enable = this.sinon.stub(SyncStateMachine, 'enable');
      spies.disable = this.sinon.stub(SyncStateMachine, 'disable');
      spies.sync = this.sinon.stub(SyncStateMachine, 'sync');
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
      ['enable', 'disable', 'sync'].forEach(name => {
        spies[name].restore();
      });
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
        this.sinon.assert.calledOnce(spies[name]);
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
      this.sinon.assert.notCalled(getPortStub);
    });

    test('receive unknown IAC request', () => {
      window.dispatchEvent(new CustomEvent('iac-gaia-sync-management', {
        detail: {
          name: 'whatever'
        }
      }));
    });
  });

  suite('ondisabled', () => {
    var syncManager;

    var realNavigatorSync;
    var unregisterSyncSpy;
    var updateStateSpy;
    var removeEventListenerSpy;
    var logoutSpy;

    suiteSetup(() => {
      syncManager = new SyncManager();
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
      logoutSpy = this.sinon.spy(FxAccountsClient, 'logout');
    });

    suiteTeardown(() => {
      syncManager.stop();
      unregisterSyncSpy.restore();
      updateStateSpy.restore();
      removeEventListenerSpy.restore();
      logoutSpy.restore();
      navigator.sync = realNavigatorSync;
    });

    test('ondisabled received', done => {
      SyncStateMachine.ondisabled();
      setTimeout(() => {
        this.sinon.assert.calledOnce(unregisterSyncSpy);
        assert.ok(unregisterSyncSpy.calledWith('gaia::system::firefoxsync'));
        this.sinon.assert.calledOnce(updateStateSpy);
        this.sinon.assert.calledOnce(removeEventListenerSpy);
        assert.ok(
          removeEventListenerSpy.calledWith('mozFxAccountsUnsolChromeEvent')
        );
        this.sinon.assert.calledOnce(logoutSpy);
        done();
      });
    });
  });

  suite('onenabled', () => {
    var syncManager;

    var realNavigatorSync;
    var registerSyncSpy;
    var registerError;
    var registrationsError;
    var syncRegistrations = [];
    var updateStateSpy;
    var errorSpy;

    suiteSetup(() => {
      syncManager = new SyncManager();
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
      errorSpy = this.sinon.spy(SyncStateMachine, 'error');
    });

    teardown(() => {
      registerSyncSpy.restore();
      updateStateSpy.restore();
      errorSpy.restore();
    });

    test('onenabled received - success', done => {
      SyncStateMachine.onenabled();
      setTimeout(() => {
        this.sinon.assert.calledOnce(registerSyncSpy);
        assert.ok(registerSyncSpy.calledWith('gaia::system::firefoxsync'));
        this.sinon.assert.calledOnce(updateStateSpy);
        done();
      });
    });

    test('onenabled received - already registered', done => {
      teardown(() => {
        syncRegistrations = [];
      });

      syncRegistrations = [{
        task: 'gaia::system::firefoxsync'
      }];

      SyncStateMachine.onenabled();
      setTimeout(() => {
        this.sinon.assert.notCalled(registerSyncSpy);
        this.sinon.assert.calledOnce(updateStateSpy);
        done();
      });
    });

    test('onenabled received - navigator.sync.registrations error',
         done => {
      teardown(() => {
        registrationsError = null;
      });

      registrationsError = 'error';

      SyncStateMachine.onenabled();
      setTimeout(() => {
        this.sinon.assert.notCalled(registerSyncSpy);
        this.sinon.assert.calledOnce(updateStateSpy);
        this.sinon.assert.calledOnce(errorSpy);
        done();
      });
    });

    test('onenabled received - navigator.sync.register error', done => {
      teardown(() => {
        registerError = null;
      });

      registerError = 'error';

      SyncStateMachine.onenabled();
      setTimeout(() => {
        this.sinon.assert.calledOnce(registerSyncSpy);
        this.sinon.assert.calledOnce(updateStateSpy);
        this.sinon.assert.calledOnce(errorSpy);
        done();
      });
    });
  });

  suite('onenabling', () => {
    var syncManager;

    var updateStateStub;
    var getAssertionStub;
    var getAssertionError;
    var addEventListenerSpy;
    var successSpy;
    var errorSpy;
    var trySyncStub;
    var trySyncError;
    var getKeysStub;
    var getKeysError;
    var getAccountStub;

    suiteSetup(() => {
      syncManager = new SyncManager();
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
      getAssertionStub = this.sinon.stub(syncManager, 'getAssertion', () => {
        return getAssertionError ? Promise.reject(getAssertionError)
                                 : Promise.resolve();
      });
      successSpy = this.sinon.spy(SyncStateMachine, 'success');
      errorSpy = this.sinon.spy(SyncStateMachine, 'error');
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
      getAssertionStub.restore();
      successSpy.restore();
      errorSpy.restore();
      trySyncStub.restore();
      getKeysStub.restore();
      getAccountStub.restore();
    });

    test('onenabling received - success', done => {
      SyncStateMachine.onenabling();
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(getAssertionStub);
        this.sinon.assert.calledOnce(addEventListenerSpy);
        assert.equal(addEventListenerSpy.getCall(0).args[0],
                     'mozFxAccountsUnsolChromeEvent');
        this.sinon.assert.calledOnce(successSpy);
        done();
      });
    });

    test('onenabling received - getAssertion error', done => {
      teardown(() => {
        getAssertionError = null;
      });

      getAssertionError = 'error';
      SyncStateMachine.onenabling();
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(getAssertionStub);
        this.sinon.assert.notCalled(getKeysStub);
        this.sinon.assert.notCalled(trySyncStub);
        this.sinon.assert.notCalled(getAccountStub);
        this.sinon.assert.calledOnce(addEventListenerSpy);
        assert.equal(addEventListenerSpy.getCall(0).args[0],
                     'mozFxAccountsUnsolChromeEvent');
        this.sinon.assert.calledOnce(errorSpy);
        done();
      });
    });

    test('onenabling received - getKeys error', done => {
      teardown(() => {
        getKeysError = null;
      });

      getKeysError = Date.now();

      SyncStateMachine.onenabling();
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(getAssertionStub);
        this.sinon.assert.calledOnce(getKeysStub);
        this.sinon.assert.notCalled(trySyncStub);
        this.sinon.assert.notCalled(getAccountStub);
        this.sinon.assert.calledOnce(addEventListenerSpy);
        this.sinon.assert.calledWith(addEventListenerSpy,
                                     'mozFxAccountsUnsolChromeEvent');
        this.sinon.assert.calledOnce(errorSpy);
        assert.equal(errorSpy.getCall(0).args[0], getKeysError);
        done();
      });
    });

    test('onsyncenabling received - trySync error', done => {
      teardown(() => {
        trySyncError = null;
      });

      trySyncError = Date.now();

      SyncStateMachine.onenabling();
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(getAssertionStub);
        this.sinon.assert.calledOnce(getKeysStub);
        this.sinon.assert.calledOnce(trySyncStub);
        this.sinon.assert.notCalled(getAccountStub);
        this.sinon.assert.calledOnce(addEventListenerSpy);
        this.sinon.assert.calledWith(addEventListenerSpy,
                                     'mozFxAccountsUnsolChromeEvent');
        this.sinon.assert.calledOnce(errorSpy);
        assert.equal(errorSpy.getCall(0).args[0], trySyncError);
        done();
      });
    });
  });

  suite('onerrored', () => {
    var syncManager;

    var updateStateSpy;
    var disableStub;

    suiteSetup(() => {
      syncManager = new SyncManager();
      syncManager.start();
    });

    suiteTeardown(() => {
      syncManager.stop();
      SyncStateMachine.state = 'disabled';
    });

    setup(() => {
      updateStateSpy = this.sinon.spy(syncManager, 'updateState');
      disableStub = this.sinon.stub(SyncStateMachine, 'disable');
    });

    teardown(() => {
      updateStateSpy.restore();
      disableStub.restore();
    });

    test('onerrored received - recoverable error', done => {
      SyncStateMachine.state = 'enabling';
      SyncStateMachine.error(ERROR_SYNC_APP_KILLED);
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateSpy);
        assert.equal(syncManager.error, ERROR_SYNC_APP_KILLED);
        this.sinon.assert.notCalled(disableStub);
        done();
      });
    });

    test('onerrored received - unrecoverable error', done => {
      SyncStateMachine.state = 'enabling';
      SyncStateMachine.error(ERROR_SYNC_REQUEST);
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateSpy);
        assert.equal(syncManager.error, ERROR_SYNC_REQUEST);
        this.sinon.assert.calledOnce(disableStub);
        done();
      });
    });
  });

  suite('onsyncing', () => {
    var syncManager;

    var updateStateStub;
    var unregisterSyncStub;
    var getAssertionStub;
    var getAssertionError;
    var successStub;
    var errorStub;
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

      syncManager = new SyncManager();
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
      getAssertionStub = this.sinon.stub(syncManager, 'getAssertion', () => {
        return getAssertionError ? Promise.reject(getAssertionError)
                                 : Promise.resolve(assertion);
      });
      getKeysStub = this.sinon.stub(syncManager, 'getKeys', () => {
        return getKeysError ? Promise.reject(getKeysError)
                            : Promise.resolve(keys);
      });
      portStub = this.sinon.stub(port, 'postMessage');
      successStub = this.sinon.stub(SyncStateMachine, 'success');
      errorStub = this.sinon.stub(SyncStateMachine, 'error');

      syncManager.state = 'syncing';
    });

    teardown(() => {
      updateStateStub.restore();
      unregisterSyncStub.restore();
      getKeysStub.restore();
      portStub.restore();
      getAssertionStub.restore();
      successStub.restore();
      errorStub.restore();
    });

    test('onsyncing - success', done => {
      id = Date.now();
      result = {
        id: id
      };
      var previousLastSync = syncManager.lastSync;
      syncManager.settings.set('sync.collections.history.enabled', true);
      syncManager.settings.set('sync.collections.history.readonly', true);

      SyncStateMachine.onsyncing();
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
            this.sinon.assert.calledOnce(successStub);
            done();
          });
        });
      });
    });

    test('onsyncing - no collections selected', done => {
      syncManager.settings.delete('sync.collections.history.enabled');
      syncManager.settings.delete('sync.collections.passwords.enabled');
      var previousLastSync = syncManager.lastSync;

      SyncStateMachine.onsyncing();
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(unregisterSyncStub);
        this.sinon.assert.notCalled(getAssertionStub);
        this.sinon.assert.notCalled(getKeysStub);
        this.sinon.assert.notCalled(portStub);
        this.sinon.assert.calledOnce(successStub);
        assert.equal(syncManager.lastSync, previousLastSync);
        done();
      });
    });

    test('onsyncing - getAssertion error', done => {
      teardown(() => {
        getAssertionError = null;
      });
      getAssertionError = 'error';
      syncManager.settings.set('sync.collections.history.enabled', true);
      var previousLastSync = syncManager.lastSync;

      SyncStateMachine.onsyncing();
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(unregisterSyncStub);
        this.sinon.assert.calledOnce(getAssertionStub);
        this.sinon.assert.notCalled(getKeysStub);
        setTimeout(() => {
          this.sinon.assert.notCalled(portStub);
          this.sinon.assert.calledOnce(errorStub);
          assert.equal(syncManager.lastSync, previousLastSync);
          done();
        });
      });
    });

    test('onsyncing - getKeys error', done => {
      teardown(() => {
        getKeysError = null;
      });
      getKeysError = 'error';
      syncManager.settings.set('sync.collections.history.enabled', true);
      var previousLastSync = syncManager.lastSync;

      SyncStateMachine.onsyncing();
      setTimeout(() => {
        this.sinon.assert.calledOnce(updateStateStub);
        this.sinon.assert.calledOnce(unregisterSyncStub);
        this.sinon.assert.calledOnce(getAssertionStub);
        this.sinon.assert.calledOnce(getKeysStub);
        setTimeout(() => {
          this.sinon.assert.notCalled(portStub);
          this.sinon.assert.calledOnce(errorStub);
          assert.equal(syncManager.lastSync, previousLastSync);
          done();
        });
      });
    });

    test('onsyncing - sync app error', done => {
      id = Date.now();
      result = {
        id: id,
        error: 'error'
      };
      syncManager.settings.set('sync.collections.passwords.enabled', true);
      syncManager.settings.delete('sync.collections.passwords.readonly');
      var previousLastSync = syncManager.lastSync;

      SyncStateMachine.onsyncing();
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
            this.sinon.assert.calledOnce(errorStub);
            assert.equal(syncManager.lastSync, previousLastSync);
            done();
          });
        });
      });
    });
  });

  suite('Firefox Accounts - onlogout', () => {
    var syncManager;
    var disableStub;
    var successStub;

    suiteSetup(() => {
      syncManager = new SyncManager();
      syncManager.start();
      disableStub = this.sinon.stub(SyncStateMachine, 'disable');
      successStub = this.sinon.stub(SyncStateMachine, 'success');
      syncManager.onenabling();
    });

    suiteTeardown(() => {
      syncManager.stop();
      disableStub.restore();
      successStub.restore();
    });

    test('FxA logout should disable Sync', done => {
      window.dispatchEvent(new CustomEvent('mozFxAccountsUnsolChromeEvent', {
        detail: {
          eventName: 'onlogout'
        }
      }));
      setTimeout(() => {
        assert.ok(disableStub.called);
        done();
      });
    });
  });

  suite('Firefox Accounts - onverified', () => {
    var syncManager;
    var getAccountStub;
    var enableStub;

    suiteSetup(() => {
      syncManager = new SyncManager();
      syncManager.start();
      getAccountStub = this.sinon.stub(FxAccountsClient, 'getAccount',
                                       successCb => {
        successCb({
          email: 'user@domain.org'
        });
      });
    });

    suiteTeardown(() => {
      syncManager.stop();
    });

    setup(() => {
      enableStub = this.sinon.stub(SyncStateMachine, 'enable');
    });

    teardown(() => {
      enableStub.restore();
    });

    test('FxA onverified should enable Sync', done => {
      syncManager.state = 'errored';
      syncManager.error = ERROR_UNVERIFIED_ACCOUNT;
      window.dispatchEvent(new CustomEvent('mozFxAccountsUnsolChromeEvent', {
        detail: {
          eventName: 'onverified'
        }
      }));
      setTimeout(() => {
        assert.ok(enableStub.called);
        done();
      });
    });

    test('FxA onverified and not ERROR_UNVERIFIED_ACCOUNT error ' +
         'should not enable Sync', done => {
      syncManager.state = 'errored';
      syncManager.error = ERROR_GET_FXA_ASSERTION;
      window.dispatchEvent(new CustomEvent('mozFxAccountsUnsolChromeEvent', {
        detail: {
          eventName: 'onverified'
        }
      }));
      setTimeout(() => {
        this.sinon.assert.notCalled(enableStub);
        done();
      });
    });
  });

  suite('FxA getAssertion', () => {
    var syncManager;
    var getAssertionStub;

    suiteSetup(() => {
      syncManager = new SyncManager();
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
      syncManager.settings.set('sync.fxa.audience', null);
      syncManager.getAssertion().then(result => {
        assert.equal(result, 'assertion');
        assert.ok(getAssertionStub.calledOnce);
        assert.deepEqual(getAssertionStub.args[0][0], { audience: null });
        done();
      });
    });

    test('Audience set', done => {
      syncManager.settings.set('sync.fxa.audience', 'audience');
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

    suiteSetup(() => {
      syncManager = new SyncManager();
      syncManager.start();
    });

    suiteTeardown(() => {
      syncManager.stop();
    });

    test('updateState with params should not query state machine', () => {
      var state = 'argstate';
      syncManager.updateState(state);
      assert.equal(syncManager.state, state);
    });

    test('updateState w/o params should query state machine', () => {
      SyncStateMachine.state = 'disabled';
      syncManager.updateState();
      assert.equal(syncManager.state, SyncStateMachine.state);
    });
  });

  suite('killapp', () => {
    var syncManager;
    var isSyncAppStub;
    var isSyncApp;
    var errorStub;

    function killapp() {
      window.dispatchEvent(new CustomEvent('killapp', {
        detail: {
          origin: 'whatever'
        }
      }));
    }

    suiteSetup(() => {
      syncManager = new SyncManager();
      syncManager.start();
    });

    suiteTeardown(() => {
      syncManager.stop();
    });

    setup(() => {
      errorStub = this.sinon.stub(SyncStateMachine, 'error');
      isSyncAppStub = this.sinon.stub(syncManager, 'isSyncApp', () => {
        return isSyncApp ? Promise.resolve() : Promise.reject();
      });
    });

    teardown(() => {
      isSyncAppStub.restore();
      errorStub.restore();
    });

    test('Is Sync app', done => {
      isSyncApp = true;
      killapp();
      setTimeout(() => {
        assert.ok(errorStub.calledOnce);
        assert.equal(errorStub.getCall(0).args[0], ERROR_SYNC_APP_KILLED);
        done();
      });
    });

    test('Is not Sync app', done => {
      isSyncApp = false;
      killapp();
      setTimeout(() => {
        assert.ok(errorStub.notCalled);
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
      syncManager = new SyncManager();
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
      syncManager = new SyncManager();
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
      syncManager = new SyncManager();
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
      syncManager = new SyncManager();
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
});
