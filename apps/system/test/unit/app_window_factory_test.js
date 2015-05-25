/* global MocksHelper,
   AppWindowFactory,
   MockApplications,
   AppWindow,
   HomescreenLauncher,
   appWindowFactory,
   MockAppWindowManager,
   MockAppWindow,
   Service
 */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');

var mocksForAppWindowFactory = new MocksHelper([
  'AppWindow', 'AppWindowManager', 'HomescreenLauncher',
  'HomescreenWindow', 'Applications', 'ManifestHelper', 'Service'
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

  var fakeLaunchConfig7 = {
    'isActivity': false,
    'url': 'app://search.gaiamobile.org/index.html',
    'name': 'search',
    'manifestURL': 'app://search.gaiamobile.org/manifest.webapp',
    'origin': 'app://search.gaiamobile.org',
    'manifest': {
      'name': 'Search',
      'role': 'search',
    },
    target: {}
  };

  var fakeLaunchConfig8 = {
    'isActivity': false,
    'showApp': false,
    'url': 'app://findmydevice.gaiamobile.org/index.html',
    'name': 'Find my device',
    'manifestURL': 'app://findmydevice.gaiamobile.org/manifest.webapp',
    'origin': 'app://findmydevice.gaiamobile.org',
    'manifest': {
      'name': 'Find my device',
      'role': 'system',
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
    window.homescreenLauncher = new HomescreenLauncher();
    window.homescreenLauncher.start();

    window.appWindowManager = new MockAppWindowManager();
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/app_window_factory.js', function() {
      window.appWindowFactory = new AppWindowFactory();
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

  suite('isLaunchingWindow', function() {
    var app;
    setup(function() {
      app = new MockAppWindow();
      this.sinon.stub(window, 'AppWindow').returns(app);
      window.applications.ready = true;
      window.appWindowFactory.start();
    });

    test('Launching app', function() {
      window.dispatchEvent(new CustomEvent('webapps-launch',
        {detail: fakeLaunchConfig1}));
      assert.isTrue(window.appWindowFactory.isLaunchingWindow());
      app.element.dispatchEvent(new CustomEvent('_opened', {
        detail: app
      }));
      assert.isFalse(window.appWindowFactory.isLaunchingWindow());
    });

    test('Ignore background app', function() {
      window.dispatchEvent(new CustomEvent('open-app',
        {detail: fakeLaunchConfig8}));
      assert.isFalse(window.appWindowFactory.isLaunchingWindow());
    });
  });

  suite('check for open-app queueing', function() {
    var applicationsReady;
    var eventHandlerSpy, preEventHandlerSpy, queuePendingEventSpy;
    var openAppEvent;

    setup(function() {
      openAppEvent = new CustomEvent('open-app', {'detail': {}});
      applicationsReady = window.applications.ready;
      eventHandlerSpy =
        this.sinon.spy(window.appWindowFactory, 'handleEvent');
      preEventHandlerSpy =
        this.sinon.spy(window.appWindowFactory, 'preHandleEvent');
      queuePendingEventSpy =
        this.sinon.spy(window.appWindowFactory, '_queuePendingEvent');
    });

    teardown(function() {
      window.applications.ready = applicationsReady;
    });

    suite('open-app delivered, applications.ready is false', function() {
      setup(function() {
        window.applications.ready = false;
        window.appWindowFactory.start();
        window.dispatchEvent(openAppEvent);
      });

      test('handleEvent not called', function() {
        sinon.assert.notCalled(eventHandlerSpy);
      });

      test('preHandleEvent called', function() {
        sinon.assert.called(preEventHandlerSpy);
      });

      test('_queuePendingEvent called', function() {
        sinon.assert.calledOnce(queuePendingEventSpy);
      });
    });

    suite('open-app delivered, applications.ready is true', function() {
      setup(function() {
        window.applications.ready = true;
        window.appWindowFactory.start();
        window.dispatchEvent(openAppEvent);
      });

      test('preHandleEvent called', function() {
        sinon.assert.called(preEventHandlerSpy);
      });

      test('handleEvent called after open-app',
        function() {
          sinon.assert.calledWithExactly(eventHandlerSpy, openAppEvent);
        });
    });

    suite('open-app delivered, applicationready event', function() {
      var handlePendingSpy;
      setup(function() {
        window.applications.ready = false;
        window.appWindowFactory.start();
        window.dispatchEvent(openAppEvent);
        handlePendingSpy =
          this.sinon.spy(window.appWindowFactory, '_handlePendingEvents');
        window.dispatchEvent(new CustomEvent('applicationready'));
      });

      test('preHandleEvent called', function() {
        sinon.assert.called(preEventHandlerSpy);
      });

      test('_queuePendingEvent called', function() {
        sinon.assert.calledOnce(queuePendingEventSpy);
      });

      test('_handlePendingEvents called', function() {
        sinon.assert.calledOnce(handlePendingSpy);
      });

      test('handleEvent called', function() {
        sinon.assert.called(eventHandlerSpy);
      });

      test('pending events cleared', function() {
        assert.equal(0, window.appWindowFactory._queueEvents.length);
      });
    });
  });

  suite('handle event', function() {
     setup(function() {
      window.appWindowFactory.start();
    });

    test('call event without manifestURL/url', function() {
      var stubBrowserConfigHelper = this.sinon.stub(window,
        'BrowserConfigHelper');
      appWindowFactory.handleEvent({
        detail: {
          url: null,
          manifestURL: null
        }
      });
      assert.isFalse(stubBrowserConfigHelper.calledWithNew());
    });

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

    test('redirect applaunch', function() {
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      appWindowFactory.handleEvent({
        type: 'appopenwindow',
        detail: fakeLaunchConfig2
      });
      assert.isTrue(stubDispatchEvent.called);
      assert.equal(stubDispatchEvent.getCall(0).args[0].type, 'launchapp');
      assert.equal(stubDispatchEvent.getCall(0).args[0].detail.url,
        fakeLaunchConfig2.url);
    });

    test('open a new window', function() {
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      appWindowFactory.handleEvent({
        type: 'openwindow',
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

    test('app launch with multiscreen.enabled', function() {
      this.sinon.stub(Service, 'query', function(key) {
        return key == 'MultiScreenController.enabled';
      });
      this.sinon.stub(Service, 'request', function() {
        return Promise.resolve(1);
      });
      appWindowFactory.handleEvent({
        type: 'webapps-launch',
        detail: fakeLaunchConfig1
      });
      assert.isTrue(Service.request.calledWith('chooseDisplay'));
      assert.equal(Service.request.getCall(0).args[1].url,
        fakeLaunchConfig1.url);
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

    test('webapps-close with search app', function() {
      var stubPublish = this.sinon.stub(appWindowFactory, 'publish');
      appWindowFactory.handleEvent({
        type: 'webapps-close',
        detail: fakeLaunchConfig5
      });
      assert.isTrue(stubPublish.calledOnce);
      assert.equal(stubPublish.getCall(0).args[0], 'killapp');
      assert.equal(stubPublish.getCall(0).args[1].url, fakeLaunchConfig5.url);
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
      var spy = this.sinon.stub(window.appWindowManager, 'getApp');
      var app = new AppWindow();
      var stubReviveBrowser = this.sinon.stub(app, 'reviveBrowser');
      spy.returns(app);
      appWindowFactory.handleEvent({
        type: 'open-app',
        detail: fakeLaunchConfig5
      });
      assert.isTrue(stubReviveBrowser.called);
    });

    test('open-app with search app', function() {
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      appWindowFactory.launch(fakeLaunchConfig7);
      assert.ok(stubDispatchEvent.notCalled);

      fakeLaunchConfig7.url = 'app://search.gaiamobile.org/newtab.html';
      appWindowFactory.launch(fakeLaunchConfig7);
      assert.ok(stubDispatchEvent.calledOnce);
    });
  });
});
