'use strict';

mocha.globals(['Applications', 'UtilityTray']);

requireApp('system/test/unit/mock_utility_tray.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/js/simcard_manager.js');

var mocksForSimCardManager = new MocksHelper([
  'Applications',
  'UtilityTray'
]).init();

suite('simcard manager', function() {

  mocksForSimCardManager.attachTestHelpers();

  suite(' > launchSettingsApp', function() {
    var fakeManifestURL;
    var fakeApp;

    suiteSetup(function() {
      var host = document.location.host;
      var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
      var protocol = document.location.protocol + '//';

      fakeManifestURL = protocol + 'settings.' + domain + '/manifest.webapp';
      fakeApp = {
        manifestURL: fakeManifestURL,
        launch: function() {
          this.isLaunchCalled = true;
        }
      };

      Applications.mRegisterMockApp(fakeApp);
    });

    suiteTeardown(function() {
      Applications.mUnregisterMockApp(fakeApp);
    });

    setup(function() {
      this.sinon.spy(Applications, 'getByManifestURL');
      SimCardManager.launchSettingsApp();
    });

    test('call SimCardManager.launchSettingsApp', function() {
      assert.equal(Applications.getByManifestURL.args[0][0],
        fakeManifestURL);
      assert.ok(fakeApp.isLaunchCalled);
    });
  });

  suite(' > init', function() {

    var stubId;
    var stubEventListener;

    suiteSetup(function() {
      stubId = sinon.stub(document, 'getElementById', function() {
        var element = document.createElement('div');
        stubEventListener = sinon.stub(element, 'addEventListener');
        return element;
      });
    });

    suiteTeardown(function() {
      stubId.restore();
      stubEventListener.restore();
    });

    setup(function() {
      this.sinon.stub(SimCardManager, 'launchSettingsApp');
      SimCardManager.init();

      var onClickEvent = stubEventListener.args[0][1];
      onClickEvent();
    });

    test('call SimCardManager.init', function() {
      assert.ok(SimCardManager.launchSettingsApp.called);
      assert.isFalse(UtilityTray.mShown);
    });
  });
});
