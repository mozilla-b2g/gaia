/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* global ERROR_UNVERIFIED_ACCOUNT */
/* global loadBodyHTML */
/* global MockSettingsListener */
/* global Panel */
/* global SyncManagerBridge */

'use strict';

requireApp('settings/shared/test/unit/load_body_html_helper.js');
require('/shared/js/sync/errors.js');

suite('Firefox Sync panel >', () => {
  var map = {
    '*': {
      'modules/settings_panel': 'unit/mock_settings_panel',
      'shared/settings_listener': 'shared_mocks/mock_settings_listener',
      'shared/lazy_loader': 'shared_mocks/mock_lazy_loader'
    }
  };

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
    name: 'collectionsHistory'
  }, {
    name: 'collectionsPasswords'
  }, {
    name: 'lastSync'
  }, {
    name: 'unverified'
  }];

  // Global spies and stubs.
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
  var refreshSpy;
  var showLastSyncSpy;
  var showScreenSpy;
  var showSyncNowSpy;
  var showUserSpy;

  function setSubjectSpiesAndStubs(subject) {
    cleanSpy = sinon.spy(subject, 'clean');
    refreshSpy = sinon.spy(subject, 'refresh');
    showLastSyncSpy = sinon.spy(subject, 'showLastSync');
    showScreenSpy = sinon.spy(subject, 'showScreen');
    showSyncNowSpy = sinon.spy(subject, 'showSyncNow');
    showUserSpy = sinon.spy(subject, 'showUser');
  }

  function restoreSubjectSpiesAndStubs() {
    cleanSpy.restore();
    refreshSpy.restore();
    showLastSyncSpy.restore();
    showScreenSpy.restore();
    showSyncNowSpy.restore();
    showUserSpy.restore();
  }

  suiteSetup(done => {
    loadBodyHTML('_firefox_sync.html');

    testRequire([
      'modules/settings_panel',
      'shared/settings_listener',
      'modules/sync_manager_bridge',
      'panels/firefox_sync/panel',
      'shared_mocks/mock_lazy_loader',
      'panels/firefox_sync/firefox_sync'
    ], map, (MockSettingsPanel, MockSettingsListener,
             SyncManagerBridge, Panel, MockLazyLoader, FirefoxSyncPanel) => {
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

      observeSpy = this.sinon.spy(MockSettingsListener, 'observe');
      getInfoStub = this.sinon.stub(SyncManagerBridge, 'getInfo', () => {
        return Promise.resolve();
      });
      disableStub = this.sinon.stub(SyncManagerBridge, 'disable');
      syncStub = this.sinon.stub(SyncManagerBridge, 'sync');
      enableStub = this.sinon.stub(SyncManagerBridge, 'enable');

      done();
    });
  });

  suiteTeardown(() => {
    enableStub.restore();
    disableStub.restore();
    getInfoStub.restore();
    observeSpy.restore();
    syncStub.restore();
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
      this.sinon.assert.calledTwice(observeSpy);
      assert.equal(observeSpy.getCall(0).args[0], HISTORY);
      assert.equal(observeSpy.getCall(1).args[0], PASSWORDS);
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

  ['disabled',
   'errored'].forEach(state => {
    suite('onsyncchange "' + state + '"', () => {
      var subject;

      var listenerSpies = new Map();

      suiteSetup(() => {
        subject = suiteSetupCommon();
        setSubjectSpiesAndStubs(subject);
        LOGGED_OUT_SCREEN_ELEMENTS.forEach(element => {
          if (!element || !element.listener) {
            return;
          }
          var spy = this.sinon.spy(subject, element.listener);
          listenerSpies.set(element.name, spy);
        });
        subject.onsyncchange({
          state: state
        });
      });

      suiteTeardown(() => {
        subject = null;
        restoreSubjectSpiesAndStubs();
        LOGGED_OUT_SCREEN_ELEMENTS.forEach(element => {
          var spy = listenerSpies.get(element.name);
          spy.restore();
          listenerSpies.delete(element.name);
        });
      });

      test('onsyncchange ' + state + ' should show logged out screen', () => {
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
      LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
        if (!element || !element.listener) {
          return;
        }
        var spy = this.sinon.spy(subject, element.listener);
        listenerSpies.set(element.name, spy);
      });
      subject.onsyncchange({
        state: 'enabled',
        user: email
      });
    });

    suiteTeardown(() => {
      subject = null;
      restoreSubjectSpiesAndStubs();
      LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
        if (!element || !element.listener) {
          return;
        }
        var spy = listenerSpies.get(element.name);
        spy.restore();
        listenerSpies.delete(element.name);
      });
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

  suite('onsyncchange "syncing"', () => {
    var subject;

    var disabledElements = ['syncNow'];

    var listenerSpies = new Map();

    suiteSetup(() => {
      subject = suiteSetupCommon();
      setSubjectSpiesAndStubs(subject);
      LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
        if (!element || !element.listener) {
          return;
        }
        var spy = this.sinon.spy(subject, element.listener);
        listenerSpies.set(element.name, spy);
      });
      subject.onsyncchange({
        state: 'syncing'
      });
    });

    suiteTeardown(() => {
      subject = null;
      restoreSubjectSpiesAndStubs();
      LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
        if (!element || !element.listener) {
          return;
        }
        var spy = listenerSpies.get(element.name);
        spy.restore();
        listenerSpies.delete(element.name);
      });
    });

    test('onsyncchange syncing should show logged in screen', () => {
      this.sinon.assert.calledOnce(showScreenSpy);
      assert.equal(showScreenSpy.getCall(0).args[0], LOGGED_IN_SCREEN);
      assert.ok(subject.screens.loggedOut.hidden);
      assert.ok(!subject.screens.loggedIn.hidden);
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
      LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
        if (!element || !element.listener) {
          return;
        }
        var spy = this.sinon.spy(subject, element.listener);
        listenerSpies.set(element.name, spy);
      });
      subject.onsyncchange({
        state: 'errored',
        user: email,
        error: ERROR_UNVERIFIED_ACCOUNT
      });
    });

    suiteTeardown(() => {
      subject = null;
      restoreSubjectSpiesAndStubs();
      LOGGED_IN_SCREEN_ELEMENTS.forEach(element => {
        if (!element || !element.listener) {
          return;
        }
        var spy = listenerSpies.get(element.name);
        spy.restore();
        listenerSpies.delete(element.name);
      });
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
});
