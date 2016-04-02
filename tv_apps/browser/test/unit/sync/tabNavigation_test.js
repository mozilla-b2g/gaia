/* global expect */
/* global loadBodyHTML */
/* global MocksHelper */
/* global SettingsListener */
/* global SyncManagerBridge */
/* global FirefoxSyncTabNavigation */

'use strict';


require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('browser/test/unit/sync/mocks/mock_manager_bridge.js');

var mocksForTabNavigation = new MocksHelper([
  'LazyLoader',
  'SettingsListener',
  'SyncManagerBridge',
]).init();

suite('Sync tabNavigation >', function() {
  var subject;

  var getInfoSpy;
  var observeStub;
  var addListenerStub;
  var addEventListenerStub;

  var settingObserver;
  var onSyncChange;
  var visibilityListener;

  mocksForTabNavigation.attachTestHelpers();

  suiteSetup(function(done) {
    loadBodyHTML('sync/fixtures/defaultContentView.html');

    getInfoSpy = sinon.spy(SyncManagerBridge, 'getInfo');

    observeStub = sinon.stub(SettingsListener, 'observe',
      (setting, unused, observer) => { settingObserver = observer; }
    );

    addListenerStub = sinon.stub(SyncManagerBridge, 'addListener',
      listener => { onSyncChange = listener; }
    );

    addEventListenerStub = sinon.stub(document, 'addEventListener',
      (event, listener) => { visibilityListener = listener; }
    );

    require('/tv_apps/browser/js/sync/tabNavigation.js').then(() => {
      subject = FirefoxSyncTabNavigation;
      done();
    });
  });

  suiteTeardown(function() {
    getInfoSpy.restore();
    observeStub.restore();
    addListenerStub.restore();
    addEventListenerStub.restore();
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
      expect(onSyncChange).to.be.a('function');
      expect(visibilityListener).to.be.a('function');
    });

    test('should observe settings', function() {
      expect(observeStub.calledOnce).to.be.equal(true);
      expect(settingObserver).to.be.a('function');
    });

    test('DOM initial state', function() {
      expect(subject.tabOptionEl).to.be.an('object');
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

  suite('setting listener', function() {
    test('setting change should update tabOptionEl hidden property',
      function() {
        [{
          enabled: true
        }, {
          enabled: false
        }].forEach(config => {
          settingObserver(config.enabled);
          expect(subject.tabOptionEl.hidden).to.equals(!config.enabled);
        });
      }
    );
  });
});
