/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* global ERROR_DIALOG_CLOSED_BY_USER */
/* global ERROR_INVALID_SYNC_ACCOUNT */
/* global ERROR_UNVERIFIED_ACCOUNT */
/* global expect */
/* global loadBodyHTML */
/* global MockL10n */
/* global MockMozIntl */
/* global MockSettingsListener */
/* global Panel */
/* global SyncManagerBridge */

'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/sync/errors.js');
require('/shared/test/unit/mocks/mock_moz_intl.js');
require('/shared/test/unit/mocks/mock_l20n.js');

suite('Firefox Sync panel >', () => {
  var realMozIntl = null;
  var realMozL10n = null;
  var realAddIdleObserver = null;

  var isOnline = true;

  const BOOKMARKS = 'sync.collections.bookmarks.enabled';
  const HISTORY   = 'sync.collections.history.enabled';
  const PASSWORDS = 'sync.collections.passwords.enabled';
  const LOGGED_OUT_SCREEN = 'loggedout';
  const LOGGED_IN_SCREEN = 'loggedin';

  const LOGGED_OUT_SCREEN_ELEMENTS = [{
    name: 'login',
    event: 'click',
    listener: 'enable'
  }];

  const LOGGED_IN_SCREEN_ELEMENTS = [{
    name: 'logout',
    event: 'click',
    listener: 'disable'
  }, {
    name: 'user'
  }, {
    name: 'syncNow',
    event: 'click',
    listener: 'sync'
  }, {
    name: 'tos',
    event: 'click',
    listener: 'openTos'
  }, {
    name: 'privacy',
    event: 'click',
    listener: 'openPrivacy'
  }, {
    name: 'collectionsBookmarks'
  }, {
    name: 'collectionsHistory'
  }, {
    name: 'collectionsPasswords'
  }, {
    name: 'lastSync'
  }, {
    name: 'unverified'
  }, {
    name: 'emptyAccount'
  }];

  // Global spies and stubs.
  var alertSpy;
  var disableStub;
  var enableStub;
  var getInfoStub;
  var observeSpy;
  var syncStub;

  function suiteSetupCommon() {
    var panel = Panel();
    panel.onInit(document.body);
    return panel.syncPanel;
  }

  // Subject spies and stubs.
  var cleanSpy;
  var hideEmptyAccountSpy;
  var refreshSpy;
  var showEmptyAccountSpy;
  var showLastSyncSpy;
  var showScreenSpy;
  var showSyncNowSpy;
  var showUnverifiedSpy;
  var showUserSpy;

  function setSubjectSpiesAndStubs(subject) {
    cleanSpy = sinon.spy(subject, 'clean');
    hideEmptyAccountSpy = sinon.spy(subject, 'hideEmptyAccount');
    refreshSpy = sinon.spy(subject, 'refresh');
    showEmptyAccountSpy = sinon.spy(subject, 'showEmptyAccount');
    showLastSyncSpy = sinon.spy(subject, 'showLastSync');
    showScreenSpy = sinon.spy(subject, 'showScreen');
    showSyncNowSpy = sinon.spy(subject, 'showSyncNow');
    showUnverifiedSpy = sinon.spy(subject, 'showUnverified');
    showUserSpy = sinon.spy(subject, 'showUser');
  }

  function restoreSubjectSpiesAndStubs() {
    cleanSpy.restore();
    hideEmptyAccountSpy.restore();
    refreshSpy.restore();
    showEmptyAccountSpy.restore();
    showLastSyncSpy.restore();
    showScreenSpy.restore();
    showSyncNowSpy.restore();
    showUnverifiedSpy.restore();
    showUserSpy.restore();
  }

  function setListenerSpies(subject, listenerSpies) {
    LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
      if (!element || !element.listener) {
        return;
      }
      var spy = sinon.spy(subject, element.listener);
      listenerSpies.set(element.name, spy);
    });
    LOGGED_OUT_SCREEN_ELEMENTS.forEach(element => {
      if (!element || !element.listener) {
        return;
      }
      var spy = sinon.spy(subject, element.listener);
      listenerSpies.set(element.name, spy);
    });
  }

  function restoreListenerSpies(listenerSpies) {
    LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
      if (!element || !element.listener) {
        return;
      }
      var spy = listenerSpies.get(element.name);
      spy.restore();
      listenerSpies.delete(element.name);
    });
    LOGGED_OUT_SCREEN_ELEMENTS.forEach(element => {
      var spy = listenerSpies.get(element.name);
      spy.restore();
      listenerSpies.delete(element.name);
    });
  }

  suiteSetup(done => {
    loadBodyHTML('_firefox_sync.html');

    realAddIdleObserver = navigator.addIdleObserver;
    navigator.addIdleObserver = function() {};

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: function() {
        return isOnline;
      }
    });

    var map = {
      '*': {
        'modules/dialog_service': 'unit/mock_dialog_service',
        'modules/settings_panel': 'unit/mock_settings_panel',
        'shared/settings_listener': 'shared_mocks/mock_settings_listener',
        'shared/lazy_loader': 'shared_mocks/mock_lazy_loader'
      }
    };

    testRequire([
      'modules/dialog_service',
      'modules/settings_panel',
      'shared/settings_listener',
      'modules/sync_manager_bridge',
      'panels/firefox_sync/panel',
      'shared_mocks/mock_lazy_loader',
      'panels/firefox_sync/firefox_sync',
    ], map, (MockDialogService,
             MockSettingsPanel, MockSettingsListener,
             SyncManagerBridge, Panel, MockLazyLoader,
             FirefoxSyncPanel) => {
       MockSettingsPanel.mInnerFunction = (options) => {
        var obj = {};
        for (var key in options) {
          obj[key] = options[key];
        }
        return obj;
      };

      this.Panel = Panel;
      this.SyncManagerBridge = SyncManagerBridge;
      this.LazyLoader = MockLazyLoader;
      this.FirefoxSyncPanel = FirefoxSyncPanel;

      alertSpy = this.sinon.spy(MockDialogService, 'alert');
      observeSpy = this.sinon.spy(MockSettingsListener, 'observe');
      getInfoStub = this.sinon.stub(SyncManagerBridge, 'getInfo', () => {
        return Promise.resolve();
      });
      disableStub = this.sinon.stub(SyncManagerBridge, 'disable');
      syncStub = this.sinon.stub(SyncManagerBridge, 'sync');
      enableStub = this.sinon.stub(SyncManagerBridge, 'enable');

      realMozIntl = window.mozIntl;
      window.mozIntl = MockMozIntl;

      realMozL10n = document.l10n;
      document.l10n = MockL10n;

      done();
    });
  });

  suiteTeardown(() => {
    delete navigator.onLine;
    alertSpy.restore();
    enableStub.restore();
    disableStub.restore();
    getInfoStub.restore();
    observeSpy.restore();
    syncStub.restore();
    window.mozIntl = realMozIntl;
    document.l10n = realMozL10n;
  });

  teardown(() => {
    alertSpy.reset();
    enableStub.reset();
    disableStub.reset();
    getInfoStub.reset();
    syncStub.reset();
  });

  suite('Initial state', () => {
    var subject;

    suiteSetup(() => {
      subject = suiteSetupCommon();
    });

    suiteTeardown(() => {
      subject = null;
    });

    test('Integrity', () => {
      assert.ok(subject !== undefined);
      assert.ok(SyncManagerBridge !== undefined);
      assert.ok(subject.screens.loggedIn !== undefined);
      assert.ok(subject.screens.loggedOut !== undefined);
    });

    test('Settings should be observed', () => {
      this.sinon.assert.calledThrice(observeSpy);
      assert.equal(observeSpy.getCall(0).args[0], BOOKMARKS);
      assert.equal(observeSpy.getCall(1).args[0], HISTORY);
      assert.equal(observeSpy.getCall(2).args[0], PASSWORDS);
    });
  });

  suite('Collection settings observers', () => {
    var subject;
    var maybeEnableSyncNowSpy;

    suiteSetup(() => {
      subject = suiteSetupCommon();
      subject.showScreen(LOGGED_IN_SCREEN);
    });

    suiteTeardown(() => {
      subject = null;
    });

    setup(() => {
      maybeEnableSyncNowSpy = this.sinon.spy(subject, 'maybeEnableSyncNow');
    });

    teardown(() => {
      maybeEnableSyncNowSpy.restore();
    });

    [{
      setting: HISTORY,
      enabled: true
    }, {
      setting: HISTORY,
      enabled: false
    }, {
      setting: PASSWORDS,
      enabled: true
    }, {
      setting: PASSWORDS,
      enabled: false
    }].forEach(config => {
      test((config.enabled ? 'Enabling ' : 'Disabling ') + config.setting +
           ' should be observed', done => {
        subject.collections.set(config.setting, !config.enabled);
        MockSettingsListener.mTriggerCallback(config.setting, config.enabled);
        setTimeout(() => {
          var value = subject.collections.get(config.setting);
          config.enabled ? assert.ok(value)
                         : assert.isUndefined(value);
          this.sinon.assert.calledOnce(maybeEnableSyncNowSpy);
          done();
        });
      });
    });
  });

  suite('onShow', () => {
    var panel;
    var subject;

    suiteSetup(() => {
      panel = Panel();
      panel.onInit(document.body);
      subject = panel.syncPanel;
      setSubjectSpiesAndStubs(subject);
      panel.onShow();
    });

    suiteTeardown(() => {
      panel = null;
      subject = null;
      restoreSubjectSpiesAndStubs();
    });

    test('onShow should refresh', () => {
      this.sinon.assert.calledOnce(refreshSpy);
      this.sinon.assert.calledOnce(getInfoStub);
    });
  });

  suite('onHide', () => {
    var panel;
    var subject;

    suiteSetup(() => {
      panel = Panel();
      panel.onInit(document.body);
      subject = panel.syncPanel;
      setSubjectSpiesAndStubs(subject);
      panel.onHide();
    });

    suiteTeardown(() => {
      panel = null;
      subject = null;
      restoreSubjectSpiesAndStubs();
    });

    test('onHide should clean', () => {
      this.sinon.assert.calledOnce(cleanSpy);
    });
  });

  suite('onsyncchange "disabled"', () => {
    var subject;

    var listenerSpies = new Map();

    suiteSetup(() => {
      subject = suiteSetupCommon();
      setSubjectSpiesAndStubs(subject);
      setListenerSpies(subject, listenerSpies);
      subject.onsyncchange({
        state: 'disabled'
      });
    });

    suiteTeardown(() => {
      subject = null;
      restoreSubjectSpiesAndStubs();
      restoreListenerSpies(listenerSpies);
    });

    test('onsyncchange disabled should show logged out screen', () => {
      this.sinon.assert.calledOnce(showScreenSpy);
      assert.equal(showScreenSpy.getCall(0).args[0], LOGGED_OUT_SCREEN);
      this.sinon.assert.calledOnce(cleanSpy);
      assert.ok(!subject.screens.loggedOut.hidden);
      assert.ok(subject.screens.loggedIn.hidden);
    });

    test('Logged out screen elements should be defined', () => {
      LOGGED_OUT_SCREEN_ELEMENTS.forEach(element => {
        assert.ok(subject.elements[element.name]);
      });
    });

    test('Logged in screen elements should NOT be defined', () => {
      LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
        assert.isNull(subject.elements[element.name]);
      });
    });

    LOGGED_OUT_SCREEN_ELEMENTS.forEach(element => {
      if (!element || !element.event) {
        return;
      }
      test(element.name + ' ' + element.event + ' listener should be set',
        () => {
        subject.elements[element.name][element.event]();
        var spy = listenerSpies.get(element.name);
        this.sinon.assert.calledOnce(spy);
      });
    });

    test('Should have enabled "Get Started" button', () => {
      expect(subject.elements.login).to.be.an('object');
      expect(subject.elements.login.getAttribute('data-l10n-id'))
        .to.equals('fxsync-get-started');
      expect(subject.elements.login.disabled).to.equals(false);
    });
  });

  suite('onsyncchange "errored"', () => {
    var subject;

    var listenerSpies = new Map();

    suiteSetup(() => {
      subject = suiteSetupCommon();
    });

    suiteTeardown(() => {
      subject = null;
    });

    setup(() => {
      setSubjectSpiesAndStubs(subject);
      setListenerSpies(subject, listenerSpies);
    });

    teardown(() => {
      restoreSubjectSpiesAndStubs();
      restoreListenerSpies(listenerSpies);
    });

    test('onsyncchange errored ERROR_INVALID_SYNC_ACCOUNT ' +
         'should show logged in screen', () => {
      [ERROR_INVALID_SYNC_ACCOUNT,
       ERROR_UNVERIFIED_ACCOUNT].forEach(error => {
        showScreenSpy.reset();
        subject.onsyncchange({
          state: 'errored',
          error: error
        });
        setTimeout(() => {
          this.sinon.assert.calledOnce(showScreenSpy);
          this.sinon.assert.notCalled(cleanSpy);
          assert.equal(showScreenSpy.getCall(0).args[0], LOGGED_IN_SCREEN);
          assert.ok(subject.screens.loggedOut.hidden);
          assert.ok(!subject.screens.loggedIn.hidden);
          LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
            assert.ok(subject.elements[element.name]);
          });
          LOGGED_OUT_SCREEN_ELEMENTS.forEach(element => {
            assert.isNull(subject.elements[element.name]);
          });

          if (error == ERROR_INVALID_SYNC_ACCOUNT) {
            this.sinon.assert.calledOnce(showEmptyAccountSpy);
            assert.ok(!subject.elements.emptyAccount.hidden);
          }

          if (error == ERROR_UNVERIFIED_ACCOUNT) {
            this.sinon.assert.calledOnce(showUnverifiedSpy);
            assert.ok(!subject.elements.unverified.hidden);
          }
        });
      });
    });
  });

  suite('onsyncchange "enabling"', () => {
    var subject;

    var listenerSpies = new Map();

    suiteSetup(() => {
      subject = suiteSetupCommon();
      setSubjectSpiesAndStubs(subject);
      setListenerSpies(subject, listenerSpies);
      subject.onsyncchange({
        state: 'enabling'
      });
    });

    suiteTeardown(() => {
      subject = null;
      restoreSubjectSpiesAndStubs();
      restoreListenerSpies(listenerSpies);
    });

    test('onsyncchange enabling should show logged out screen', () => {
      expect(showScreenSpy.calledOnce).to.equals(true);
      expect(showScreenSpy.getCall(0).args[0]).to.equals(LOGGED_OUT_SCREEN);
      expect(subject.screens.loggedOut.hidden).to.equals(false);
      expect(subject.screens.loggedIn.hidden).to.equals(true);
    });

    test('Logged out screen elements should be defined', () => {
      LOGGED_OUT_SCREEN_ELEMENTS.forEach(element => {
        expect(subject.elements[element.name]).to.be.an('object');
      });
    });

    test('Logged in screen elements should NOT be defined', () => {
      LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
        expect(subject.elements[element.name]).to.equals(null);
      });
    });

    test('Should have disabled "Signing..." button', () => {
      expect(subject.elements.login).to.be.an('object');
      expect(subject.elements.login.getAttribute('data-l10n-id'))
        .to.equals('fxsync-signing');
      expect(subject.elements.login.disabled).to.equals(true);
    });
  });

  suite('onsyncchange "enabled"', () => {
    var subject;
    var email = 'user@domain.org';

    var disabledElements = ['syncNow'];

    var listenerSpies = new Map();

    suiteSetup(() => {
      subject = suiteSetupCommon();
      setSubjectSpiesAndStubs(subject);
      setListenerSpies(subject, listenerSpies);
      subject.onsyncchange({
        state: 'enabled',
        user: email
      });
    });

    suiteTeardown(() => {
      subject = null;
      restoreSubjectSpiesAndStubs();
      restoreListenerSpies(listenerSpies);
    });

    test('onsyncchange enabled should show logged in screen', () => {
      this.sinon.assert.calledOnce(showScreenSpy);
      assert.equal(showScreenSpy.getCall(0).args[0], LOGGED_IN_SCREEN);
      assert.ok(subject.screens.loggedOut.hidden);
      assert.ok(!subject.screens.loggedIn.hidden);
    });

    test('Sync Now button should be disabled', () => {
      this.sinon.assert.calledOnce(showSyncNowSpy);
      assert.ok(subject.elements.syncNow.disabled);
    });

    test('Unverified should be hidden', () => {
      assert.ok(subject.elements.unverified.hidden);
    });

    test('User email should be shown', () => {
      this.sinon.assert.calledOnce(showUserSpy);
      assert.equal(subject.elements.user.textContent, email);
    });

    test('Last sync label should be hidden', () => {
      this.sinon.assert.calledOnce(showLastSyncSpy);
      assert.ok(subject.elements.lastSync.classList.contains('hidden'));
    });

    test('Empty account should be hidden', () => {
      this.sinon.assert.calledOnce(hideEmptyAccountSpy);
      assert.ok(subject.elements.emptyAccount.hidden);
    });

    test('Logged in screen elements should be defined', () => {
      LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
        assert.ok(subject.elements[element.name]);
      });
    });

    test('Logged out screen elements should NOT be defined', () => {
      LOGGED_OUT_SCREEN_ELEMENTS.forEach(element => {
        assert.isNull(subject.elements[element.name]);
      });
    });

    LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
      if (!element || !element.event) {
        return;
      }
      test(element.name + ' ' + element.event + ' listener should be set',
           () => {
        subject.elements[element.name][element.event]();
        var spy = listenerSpies.get(element.name);
        disabledElements.indexOf(element.name) > -1 ?
          this.sinon.assert.notCalled(spy) :
          this.sinon.assert.calledOnce(spy);
      });
    });
  });

  suite('onsyncchange "enabled" with error', () => {
    var subject;
    var email = 'user@domain.org';
    var error = 'error';

    suiteSetup(() => {
      subject = suiteSetupCommon();
      setSubjectSpiesAndStubs(subject);
    });

    suiteTeardown(() => {
      subject = null;
      restoreSubjectSpiesAndStubs();
    });

    setup(() => {
      subject.onsyncchange({
        state: 'enabled',
        user: email,
        error: error
      });
    });

    teardown(() => {
      error = ERROR_INVALID_SYNC_ACCOUNT;
    });

    test('unknown error should not show empty account',
      () => {
      this.sinon.assert.notCalled(showEmptyAccountSpy);
      assert.ok(subject.elements.emptyAccount.hidden);
    });

    test('ERROR_INVALID_SYNC_ACCOUNT should show empty account', () => {
      this.sinon.assert.calledOnce(showEmptyAccountSpy);
      assert.ok(!subject.elements.emptyAccount.hidden);
    });
  });

  suite('onsyncchange "syncing"', () => {
    var subject;

    var disabledElements = ['syncNow'];

    var listenerSpies = new Map();

    var email = 'user@domain.org';

    suiteSetup(() => {
      subject = suiteSetupCommon();
      setSubjectSpiesAndStubs(subject);
      setListenerSpies(subject, listenerSpies);
      subject.onsyncchange({
        state: 'syncing',
        user: email
      });
    });

    suiteTeardown(() => {
      subject = null;
      restoreSubjectSpiesAndStubs();
      restoreListenerSpies(listenerSpies);
    });

    test('onsyncchange syncing should show logged in screen', () => {
      this.sinon.assert.calledOnce(showScreenSpy);
      assert.equal(showScreenSpy.getCall(0).args[0], LOGGED_IN_SCREEN);
      assert.ok(subject.screens.loggedOut.hidden);
      assert.ok(!subject.screens.loggedIn.hidden);
    });

    test('User email should be shown', () => {
      this.sinon.assert.calledOnce(showUserSpy);
      assert.equal(subject.elements.user.textContent, email);
    });

    test('Sync Now button and collection switches should be disabled', () => {
      assert.ok(subject.elements.syncNow.disabled);
      assert.ok(subject.elements.collectionsHistory.disabled);
      assert.ok(subject.elements.collectionsPasswords.disabled);
    });

    test('"Syncing" should be shown', () => {
      assert.equal(subject.elements.syncNow.dataset.l10nId, 'fxsync-syncing');
    });

    test('Logged in screen elements should be defined', () => {
      LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
        assert.ok(subject.elements[element.name]);
      });
    });

    test('Logged out screen elements should NOT be defined', () => {
      LOGGED_OUT_SCREEN_ELEMENTS.forEach(element => {
        assert.isNull(subject.elements[element.name]);
      });
    });

    LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
      if (!element || !element.event) {
        return;
      }
      test(element.name + ' ' + element.event + ' listener should be set',
           () => {
        subject.elements[element.name][element.event]();
        var spy = listenerSpies.get(element.name);
        disabledElements.indexOf(element.name) > -1 ?
          this.sinon.assert.notCalled(spy) :
          this.sinon.assert.calledOnce(spy);
      });
    });
  });

  suite('onsyncchange "errored" - ERROR_UNVERIFIED_ACCOUNT', () => {
    var subject;

    var email = 'user@domain.org';

    var disabledElements = [
      'syncNow',
      'collectionsHistory',
      'collectionsPasswords'
    ];

    var listenerSpies = new Map();

    suiteSetup(() => {
      subject = suiteSetupCommon();
      setSubjectSpiesAndStubs(subject);
      setListenerSpies(subject, listenerSpies);
      subject.onsyncchange({
        state: 'errored',
        user: email,
        error: ERROR_UNVERIFIED_ACCOUNT
      });
    });

    suiteTeardown(() => {
      subject = null;
      restoreSubjectSpiesAndStubs();
      restoreListenerSpies(listenerSpies);
    });

    test('onsyncchange errored with ERROR_UNVERIFIED_ACCOUNT '+
         'should show logged in screen', () => {
      this.sinon.assert.calledOnce(showScreenSpy);
      assert.equal(showScreenSpy.getCall(0).args[0], LOGGED_IN_SCREEN);
      assert.ok(subject.screens.loggedOut.hidden);
      assert.ok(!subject.screens.loggedIn.hidden);
    });

    test('Unverified screen', () => {
      this.sinon.assert.calledOnce(showUserSpy);
      assert.equal(subject.elements.user.textContent, email);
      this.sinon.assert.calledOnce(showLastSyncSpy);
      disabledElements.forEach(element => {
        assert.ok(subject.elements[element].disabled);
      });
      assert.equal(subject.elements.unverified.hidden, false);
    });

    test('Logged in screen elements should be defined', () => {
      LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
        assert.ok(subject.elements[element.name]);
      });
    });

    test('Logged out screen elements should NOT be defined', () => {
      LOGGED_OUT_SCREEN_ELEMENTS.forEach(element => {
        assert.isNull(subject.elements[element.name]);
      });
    });

    LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
      if (!element || !element.event) {
        return;
      }
      test(element.name + ' ' + element.event + ' listener should be set',
           () => {
        subject.elements[element.name][element.event]();
        var spy = listenerSpies.get(element.name);
        disabledElements.indexOf(element.name) > -1 ?
          this.sinon.assert.notCalled(spy) :
          this.sinon.assert.calledOnce(spy);
      });
    });
  });

  suite('onsyncchange "errored" - ignored error', () => {
    var subject;

    suiteSetup(() => {
      subject = suiteSetupCommon();
      setSubjectSpiesAndStubs(subject);
      subject.onsyncchange({
        state: 'errored',
        error: ERROR_DIALOG_CLOSED_BY_USER
      });
    });

    suiteTeardown(() => {
      subject = null;
      restoreSubjectSpiesAndStubs();
    });

    test('onsyncchange errored with ERROR_DIALOG_CLOSED_BY_USER '+
         'should be ignored', () => {
      this.sinon.assert.notCalled(showScreenSpy);
    });
  });

  suite('onsyncchange "errored" - known errors', () => {
    var subject;
    const ERROR_OFFLINE = 'fxsync-error-offline';
    const ERROR_NO_KEY_FETCH_TOKEN = 'fxsync-error-no-key-fetch-token';

    suiteSetup(() => {
      subject = suiteSetupCommon();
      setSubjectSpiesAndStubs(subject);
    });

    suiteTeardown(() => {
      subject = null;
      restoreSubjectSpiesAndStubs();
    });

    teardown(() => {
      showScreenSpy.reset();
      cleanSpy.reset();
      alertSpy.reset();
    });

    [ERROR_OFFLINE,
     ERROR_NO_KEY_FETCH_TOKEN].forEach(error => {
      test('onsyncchange errored with ' + error +
           ' should show alert', done => {
        subject.onsyncchange({
          state: 'errored',
          error: error
        });

        setTimeout(() => {
          this.sinon.assert.calledOnce(showScreenSpy);
          this.sinon.assert.calledOnce(cleanSpy);
          this.sinon.assert.calledOnce(alertSpy);
          assert.equal(alertSpy.getCall(0).args[0],
                       error + '-explanation');
          assert.equal(alertSpy.getCall(0).args[1].title,
                       error);
          done();
        });
      });
    });
  });

  suite('"Sync Now" button', () => {
    var subject;

    suiteSetup(() => {
      subject = suiteSetupCommon();
      subject.showScreen(LOGGED_IN_SCREEN);
      setSubjectSpiesAndStubs(subject);
    });

    suiteTeardown(() => {
      subject = null;
      restoreSubjectSpiesAndStubs();
    });

    test('No collections selected should disable "Sync Now" button', done => {
      assert.ok(subject.elements.syncNow);
      MockSettingsListener.mTriggerCallback(PASSWORDS, false);
      setTimeout(() => {
        assert.ok(subject.elements.syncNow.disabled);
        done();
      });
    });

    test('At least one collection selected should enable "Sync Now" button',
         done => {
      assert.ok(subject.elements.syncNow);
      MockSettingsListener.mTriggerCallback(PASSWORDS, true);
      setTimeout(() => {
        assert.ok(!subject.elements.syncNow.disabled);
        done();
      });
    });

    test('"Sync Now" should be disabled while offline', done => {
      assert.ok(subject.elements.syncNow);
      assert.ok(!subject.elements.syncNow.disabled);
      isOnline = false;
      window.dispatchEvent(new CustomEvent('online'));
      setTimeout(() => {
        assert.ok(subject.elements.syncNow.disabled);
        done();
      });
    });
  });

  suite('showScreen', () => {
    var subject;
    var loadElementsSpy;

    suiteSetup(() => {
      subject = suiteSetupCommon();
      subject.showScreen(LOGGED_IN_SCREEN);
      loadElementsSpy = this.sinon.spy(subject, 'loadElements');
    });

    suiteTeardown(() => {
      loadElementsSpy.restore();
      subject = null;
    });

    test('showScreen should not load elements if they are already loaded',
         () => {
      subject.currentScreen = LOGGED_IN_SCREEN;
      subject.showScreen(LOGGED_IN_SCREEN);
      this.sinon.assert.notCalled(loadElementsSpy);
    });
  });

  suite('showLastSync', () => {
    var subject;
    var setAttributesSpy;

    suiteSetup(() => {
      subject = suiteSetupCommon();
      subject.showScreen(LOGGED_IN_SCREEN);
      setAttributesSpy = this.sinon.spy(document.l10n, 'setAttributes');
    });

    suiteTeardown(() => {
      subject = null;
      setAttributesSpy.restore();
    });

    test('Last sync should not be shown', () => {
      assert.ok(subject.elements.lastSync.classList.contains('hidden'));
    });

    test('Last sync should be shown', done => {
      subject.showLastSync(Date.now());
      setTimeout(() => {
        assert.ok(!subject.elements.lastSync.classList.contains('hidden'));
        assert.ok(setAttributesSpy.calledOnce);
        var selector = 'span[data-l10n-id=fxsync-last-synced]';
        var span = subject.elements.lastSync.querySelector(selector);
        assert.equal(setAttributesSpy.args[0][0], span);
        assert.equal(setAttributesSpy.args[0][1], 'fxsync-last-synced');
        assert.deepEqual(setAttributesSpy.args[0][2], {
          when: 'pretty date'
        });
        done();
      });
    });
  });
});
