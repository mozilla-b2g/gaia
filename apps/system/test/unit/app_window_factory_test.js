/* global MocksHelper, AppWindowFactory, MockApplications,
          MockAppWindowManager, AppWindow, HomescreenLauncher */
'use strict';
/* global MocksHelper, MockApplications, MockAppWindowManager,
          AppWindow, HomescreenLauncher, AppWindowFactory, appWindowFactory */

requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');

var mocksForAppWindowFactory = new MocksHelper([
  'AppWindow', 'AppWindowManager', 'HomescreenLauncher',
  'HomescreenWindow', 'Applications', 'ManifestHelper'
]).init();

suite('system/AppWindowFactory', function() {
  mocksForAppWindowFactory.attachTestHelpers();
  var stubById;
  var fakeLaunchConfig1 = {
    'isActivity': false,
    'url': 'app://fakeapp1.gaiamobile.org/pick.html',
    'name': 'Fake App 1',
    'manifestURL': 'app://fakeapp1.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeapp1.gaiamobile.org',
    'manifest': {
      'name': 'Fake App 1'
    },
    target: {}
  };

  var fakeLaunchConfig2 = {
    'isActivity': false,
    'url': 'app://fakeapp2.gaiamobile.org/pick.html',
    'name': 'Fake App 2',
    'manifestURL': 'app://fakeapp2.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeapp2.gaiamobile.org',
    'manifest': {
      'name': 'Fake App 2'
    },
    target: {}
  };

  var fakeLaunchConfig3 = {
    'isActivity': false,
    'url': 'app://fakeapp3.gaiamobile.org/pick.html',
    'name': 'Fake App 3',
    'manifestURL': 'app://fakeapp3.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeapp3.gaiamobile.org',
    'manifest': {
      'name': 'Fake App 3'
    },
    target: {}
  };

  var fakeLaunchConfig4 = {
    'isActivity': true,
    'url': 'app://fakeapp4.gaiamobile.org/pick.html',
    'name': 'Fake App 4',
    'manifestURL': 'app://fakeapp4.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeapp4.gaiamobile.org',
    'manifest': {
      'name': 'Fake App 4'
    },
    target: {
      disposition: 'inline'
    },
    extra: {
      manifestURL: 'app://fakeapp3.gaiamobile.org/manifest.webapp'
    }
  };

  var fakeLaunchConfig5 = {
    'isActivity': true,
    'url': 'app://fakeapp5.gaiamobile.org/pick.html',
    'name': 'Fake App 5',
    'manifestURL': 'app://fakeapp5.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeapp5.gaiamobile.org',
    'manifest': {
      'name': 'Fake App 5'
    },
    target: {},
    extra: {
      manifestURL: 'app://fakeapp3.gaiamobile.org/manifest.webapp'
    }
  };

  var fakeLaunchConfig6 = {
    'isActivity': false,
    'url': window.location.href,
    'name': 'System',
    'manifestURL': 'app://system.gaiamobile.org/manifest.webapp',
    'origin': 'app://system.gaiamobile.org',
    'manifest': {
      'name': 'System'
    },
    target: {}
  };

  var realApplications;

  setup(function(done) {
    MockApplications.mRegisterMockApp(fakeLaunchConfig1);
    MockApplications.mRegisterMockApp(fakeLaunchConfig2);
    MockApplications.mRegisterMockApp(fakeLaunchConfig3);
    MockApplications.mRegisterMockApp(fakeLaunchConfig4);
    MockApplications.mRegisterMockApp(fakeLaunchConfig5);

    realApplications = window.applications;
    window.applications = MockApplications;

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    window.homescreenLauncher = new HomescreenLauncher().start();

    requireApp('system/js/system.js');
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/app_window_factory.js', function() {
      window.appWindowFactory = new AppWindowFactory();
      window.appWindowFactory.start();

      done();
    });
  });

  teardown(function() {
    window.homescreenLauncher = undefined;
    window.appWindowFactory.stop();
    window.appWindowFactory = undefined;
    stubById.restore();
    window.applications = realApplications;
    realApplications = null;
  });

  suite('handle event', function() {
    test('classic app launch', function() {
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      appWindowFactory.handleEvent({
        type: 'webapps-launch',
        detail: fakeLaunchConfig1
      });
      assert.isTrue(stubDispatchEvent.called);
      assert.equal(stubDispatchEvent.getCall(0).args[0].type, 'launchapp');
      assert.equal(stubDispatchEvent.getCall(0).args[0].detail.url,
        fakeLaunchConfig1.url);
    });

    test('a second applaunch', function() {
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      appWindowFactory.handleEvent({
        type: 'webapps-launch',
        detail: fakeLaunchConfig2
      });
      assert.isTrue(stubDispatchEvent.called);
      assert.equal(stubDispatchEvent.getCall(0).args[0].type, 'launchapp');
      assert.equal(stubDispatchEvent.getCall(0).args[0].detail.url,
        fakeLaunchConfig2.url);
    });

    test('opening from a system message', function() {
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      appWindowFactory.handleEvent({
        type: 'open-app',
        detail: fakeLaunchConfig3
      });
      assert.isTrue(stubDispatchEvent.called);
      assert.equal(stubDispatchEvent.getCall(0).args[0].type, 'launchapp');
      assert.equal(stubDispatchEvent.getCall(0).args[0].detail.url,
        fakeLaunchConfig3.url);
    });

    test('opening a first activity', function() {
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      appWindowFactory.handleEvent({
        type: 'open-app',
        detail: fakeLaunchConfig4
      });
      assert.isTrue(stubDispatchEvent.called);
      assert.equal(stubDispatchEvent.getCall(0).args[0].type, 'launchactivity');
      assert.equal(stubDispatchEvent.getCall(0).args[0].detail.url,
        fakeLaunchConfig4.url);
    });

    test('opening a second activity', function() {
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      appWindowFactory.handleEvent({
        type: 'open-app',
        detail: fakeLaunchConfig5
      });
      assert.isTrue(stubDispatchEvent.called);
      assert.equal(stubDispatchEvent.getCall(0).args[0].type, 'launchapp');
      assert.equal(stubDispatchEvent.getCall(0).args[0].detail.url,
        fakeLaunchConfig5.url);
    });

    test('open system app', function() {
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      appWindowFactory.handleEvent({
        type: 'open-app',
        detail: fakeLaunchConfig6
      });
      assert.isFalse(stubDispatchEvent.called);
    });

    test('launch an already-running app', function() {
      var spy = this.sinon.stub(MockAppWindowManager, 'getApp');
      var app = new AppWindow();
      var stubReviveBrowser = this.sinon.stub(app, 'reviveBrowser');
      spy.returns(app);
      appWindowFactory.handleEvent({
        type: 'open-app',
        detail: fakeLaunchConfig5
      });
      assert.isTrue(stubReviveBrowser.called);
    });
  });
});
