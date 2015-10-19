/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* global expect */
/* global FirefoxSyncToolbar */
/* global loadBodyHTML */
/* global MocksHelper */
/* global MockL10n */
/* global MockSyncManagerBridge */
/* global SyncManagerBridge */

'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('browser/test/unit/mocks/mock_settings.js');
requireApp('browser/test/unit/sync/mocks/mock_manager_bridge.js');

var mocksForToolbar = new MocksHelper([
  'LazyLoader',
  'Settings',
  'SyncManagerBridge'
]).init();

suite('Sync toolbar >', function() {
  var subject;
  var realL10n;

  var initialSyncInfo = {
    state: 'disabled'
  };

  var getInfoSpy;
  var addListenerStub;
  var addEventListenerStub;

  var onsyncchange;
  var visibilityListener;

  mocksForToolbar.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    loadBodyHTML('sync/fixtures/toolbar.html');

    getInfoSpy = sinon.spy(SyncManagerBridge, 'getInfo');
    addListenerStub = sinon.stub(SyncManagerBridge, 'addListener',
                                listener => {
      onsyncchange = listener;
    });
    addEventListenerStub = sinon.stub(document, 'addEventListener',
                                      (event, listener) => {
      visibilityListener = listener;
    });
    MockSyncManagerBridge._syncInfo = initialSyncInfo;

    require('/tv_apps/browser/js/sync/toolbar.js').then(() => {
      subject = FirefoxSyncToolbar;
      done();
    });
  });

  suiteTeardown(function() {
    getInfoSpy.restore();
    addListenerStub.restore();
    addEventListenerStub.restore();
    navigator.mozL10n = realL10n;
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

    test('DOM initial state', function() {
      expect(subject.syncBlock).to.be.an('object');
      expect(subject.syncTab).to.be.an('object');
      expect(subject.syncTab.getAttribute('data-l10n-id'))
        .to.equal('fxsync-sign-in-to-sync');
      expect(subject.syncTab.getAttribute('data-l10n-args'))
        .to.equal(null);
    });
  });

  suite('visibilitychange', function() {
    setup(function() {
      getInfoSpy.reset();
    });

    teardown(function() {
      getInfoSpy.reset();
    });

    test('visibity change to not hidden should refresh', function() {
      expect(getInfoSpy.called).to.be.equal(false);
      visibilityListener();
      expect(getInfoSpy.called).to.be.equal(true);
    });
  });

  suite('Enable', function() {
    suiteSetup(function() {
      onsyncchange({
        state: 'enabled',
        user: 'pepito'
      });
    });

    test('Tab name should change', function() {
      expect(subject.syncTab.getAttribute('data-l10n-id'))
        .to.equal('fxsync-signed-in-as');
      expect(subject.syncTab.getAttribute('data-l10n-args'))
        .to.equal('{"email":"pepito"}');
    });
  });

  suite('Disable', function() {
    suiteSetup(function() {
      onsyncchange({
        state: 'disabled'
      });
    });

    test('Tab name should change', function() {
      expect(subject.syncTab.getAttribute('data-l10n-id'))
        .to.equal('fxsync-sign-in-to-sync');
      expect(subject.syncTab.getAttribute('data-l10n-args'))
        .to.equal(null);
    });
  });
});
