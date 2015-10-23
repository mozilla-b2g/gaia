/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* global expect */
/* global FirefoxSyncSettings */
/* global MocksHelper */
/* global MockL10n */
/* global NavigatorSettings */
/* global SettingsListener */
/* global SyncManagerBridge */

'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('browser/test/unit/sync/mocks/mock_manager_bridge.js');

var mocksForSettings = new MocksHelper([
  'LazyLoader',
  'NavigatorSettings',
  'SettingsListener',
  'SyncManagerBridge'
]).init();

suite('Sync settings >', function() {

  const BOOKMARKS_SETTING = 'sync.collections.bookmarks.enabled';
  const HISTORY_SETTING = 'sync.collections.history.enabled';

  var subject;
  var realL10n;
  var realMozSettings;

  var observeStub;
  var addListenerStub;
  var addEventListenerStub;
  var getInfoSpy;
  var showScreenSpy;

  var observers = {};
  var onsyncchange;
  var visibilityListener;

  mocksForSettings.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = NavigatorSettings;

    loadBodyHTML('sync/fixtures/settings.html');

    getInfoSpy = sinon.spy(SyncManagerBridge, 'getInfo');
    observeStub = sinon.stub(SettingsListener, 'observe',
                             (setting, unused, observer) => {
      observers[setting] = observer;
    });
    addListenerStub = sinon.stub(SyncManagerBridge, 'addListener',
                                listener => {
      onsyncchange = listener;
    });
    addEventListenerStub = sinon.stub(document, 'addEventListener',
                                      (event, listener) => {
      visibilityListener = listener;
    });

    require('/tv_apps/browser/js/sync/settings.js').then(() => {
      subject = FirefoxSyncSettings;
      showScreenSpy = sinon.spy(subject, 'showScreen');
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozSettings = realMozSettings;
    observeStub.restore();
    addListenerStub.restore();
    addEventListenerStub.restore();
    getInfoSpy.restore();
    showScreenSpy.restore();
  });

  suite('Initial state', function() {
    test('Integrity', function() {
      expect(subject).to.be.an('object');
    });

    test('Initialization', function() {
      expect(getInfoSpy.calledOnce).to.equal(true);
      expect(addListenerStub.calledOnce).to.equal(true);
      expect(addListenerStub.args[0][0]).to.be.a('function');
      expect(addEventListenerStub.calledOnce).to.equal(true);
      expect(onsyncchange).to.be.a('function');
      expect(visibilityListener).to.be.a('function');
    });

    test('should observe settings', function() {
      expect(observeStub.calledTwice).to.be.equal(true);
      expect(observers[HISTORY_SETTING]).to.be.a('function');
      expect(observers[BOOKMARKS_SETTING]).to.be.a('function');
    });

    test('DOM initial state', function() {
      expect(subject.area).to.be.an('object');
      expect(subject.elements.enabled).to.be.an('object');
      expect(subject.elements.disabled).to.be.an('object');
      expect(subject.listeners).to.be.an('object');
      expect(subject.listeners.size).to.be.equals(0);
      expect(subject.collections).to.be.an('object');
      expect(subject.collections.size).to.be.equals(0);
      expect(subject.screen).to.be.equals(null);
      expect(subject.state).to.be.equals(null);
    });
  });

  suite('visibilitychange', function() {
    setup(function() {
      getInfoSpy.reset();
    });

    teardown(function() {
      getInfoSpy.reset();
    });

    test('should refresh on visibity change', function() {
      expect(getInfoSpy.called).to.be.equal(false);
      visibilityListener();
      expect(getInfoSpy.called).to.be.equal(true);
    });
  });

  suite('Disabled', function() {
    suiteSetup(function() {
      onsyncchange({
        state: 'disabled'
      });
    });

    suiteTeardown(function() {
      showScreenSpy.reset();
    });

    test('should show disabled screen', function() {
      expect(showScreenSpy.calledOnce).to.be.equal(true);
      expect(showScreenSpy.args[0][0]).to.equal('disabled');
      expect(subject.elements.enabled.hidden).to.be.equal(true);
      expect(subject.elements.disabled.hidden).to.be.equal(false);
    });

    test('should have signin button', function() {
      expect(subject.elements.signInButton).to.be.an('object');
      expect(subject.elements.signInButton.getAttribute('data-l10n-id'))
        .to.equals('fxsync-create-account-or-sign-in');
    });
  });

  suite('Enabled', function() {
    suiteSetup(function() {
      onsyncchange({
        state: 'enabled',
        user: 'pepito'
      });
    });

    suiteTeardown(function() {
      showScreenSpy.reset();
    });

    test('should show enabled screen', function() {
      expect(showScreenSpy.calledOnce).to.be.equal(true);
      expect(showScreenSpy.args[0][0]).to.equal('enabled');
      expect(subject.elements.enabled.hidden).to.be.equal(false);
      expect(subject.elements.disabled.hidden).to.be.equal(true);
    });

    test('should show user', function() {
      expect(subject.elements.signedInAs).to.be.an('object');
      expect(subject.elements.signedInAs.getAttribute('data-l10n-id'))
        .to.equals('fxsync-signed-in-as');
      expect(subject.elements.signedInAs.getAttribute('data-l10n-args'))
        .to.equals('{"email":"pepito"}');
    });

    test('should show sync now button', function() {
      expect(subject.elements.syncNowButton).to.be.an('object');
      expect(subject.elements.syncNowButton.getAttribute('data-l10n-id'))
        .to.equals('fxsync-sync-now');
    });

    test('should show signout button', function() {
      expect(subject.elements.signOutButton).to.be.an('object');
      expect(subject.elements.signOutButton.getAttribute('data-l10n-id'))
        .to.equals('fxsync-disconnect');
    });

    test('should show collection switches', function() {
      expect(subject.elements.collectionBookmarks).to.be.an('object');
      expect(subject.elements.collectionHistory).to.be.an('object');
    });
  });

  suite('Syncing', function() {
    suiteSetup(function() {
      onsyncchange({
        state: 'syncing',
        user: 'pepito'
      });
    });

    test('should show syncing button', function() {
      expect(subject.elements.syncNowButton.dataset.l10nId)
        .to.equals('fxsync-syncing');
    });

    test('should disable sync button and collection switches', function() {
      expect(subject.elements.syncNowButton.classList.contains('disabled'))
        .to.equals(true);
      expect(subject.elements.collectionBookmarks.disabled).to.equal(true);
      expect(subject.elements.collectionHistory.disabled).to.equal(true);
    });
  });

  suite('Collections', function() {
    suiteSetup(function() {
      onsyncchange({
        state: 'enabled',
        user: 'pepito'
      });
    });

    [{
      test: 'should check bookmarks on setting enabled',
      collection: 'collectionBookmarks',
      setting: BOOKMARKS_SETTING,
      enabled: true
    }, {
      test: 'should uncheck bookmarks on setting disabled',
      collection: 'collectionBookmarks',
      setting: BOOKMARKS_SETTING,
      enabled: false
    }, {
      test: 'should check history on setting enabled',
      collection: 'collectionHistory',
      setting: HISTORY_SETTING,
      enabled: true
    }, {
      test: 'should uncheck history on setting disabled',
      collection: 'collectionHistory',
      setting: HISTORY_SETTING,
      enabled: false
    }].forEach(config => {
      test(config.test, function() {
        expect(subject.elements[config.collection].checked)
          .to.be.equal(!config.enabled);
        observers[config.setting](config.enabled);
        expect(subject.elements[config.collection].checked)
          .to.be.equal(config.enabled);
      });
    });

    [{
      test: 'bookmark checked',
      setting: BOOKMARKS_SETTING,
      checked: true,
      collection: 'collectionBookmarks',
      oncheckedFunction: 'onbookmarkschecked'
    }, {
      test: 'bookmark unchecked',
      setting: BOOKMARKS_SETTING,
      checked: false,
      collection: 'collectionBookmarks',
      oncheckedFunction: 'onbookmarkschecked'
    }, {
      test: 'history checked',
      setting: HISTORY_SETTING,
      checked: true,
      collection: 'collectionHistory',
      oncheckedFunction: 'onhistorychecked'
    }, {
      test: 'history unchecked',
      setting: HISTORY_SETTING,
      checked: false,
      collection: 'collectionHistory',
      oncheckedFunction: 'onhistorychecked'
    }].forEach(config => {
      test('should enable setting on ' + config.test, function() {
        expect(subject.collections.has(config.setting))
          .to.be.equal(!config.checked);
        subject.elements[config.collection].checked = config.checked;
        subject[config.oncheckedFunction]();
        expect(subject.collections.has(config.setting))
          .to.be.equal(config.checked);
      });
    });

    test('should enable/disable Sync Now button on setting enabled/disabled',
         function() {
      [{
        setting: HISTORY_SETTING,
        enabled: true
      }, {
        setting: HISTORY_SETTING,
        enabled: false
      }, {
        setting: BOOKMARKS_SETTING,
        enabled: true
      }, {
        setting: BOOKMARKS_SETTING,
        enabled: true
      }].forEach(config => {
        observers[config.setting](config.enabled);
        expect(subject.elements.syncNowButton.classList.contains('disabled'))
          .to.equals(!config.enabled);
      });
    });
  });
});
