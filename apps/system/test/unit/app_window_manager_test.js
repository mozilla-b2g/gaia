'use strict';

mocha.globals(['SettingsListener', 'removeEventListener', 'addEventListener',
      'dispatchEvent', 'ActivityWindow', 'ActivityWindowFactory',
      'AppWindowManager', 'Applications', 'ManifestHelper',
      'KeyboardManager', 'StatusBar', 'HomescreenWindow',
      'SoftwareButtonManager', 'AttentionScreen', 'AppWindow',
      'LockScreen', 'OrientationManager', 'BrowserFrame',
      'BrowserConfigHelper', 'System', 'BrowserMixin', 'TransitionMixin',
      'HomescreenLauncher', 'LayoutManager']);

requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_lock_screen.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_activity_window.js');
requireApp('system/test/unit/mock_activity_window_factory.js');
requireApp('system/test/unit/mock_keyboard_manager.js');
requireApp('system/test/unit/mock_software_button_manager.js');
requireApp('system/test/unit/mock_attention_screen.js');
requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/js/system.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForAppWindowManager = new MocksHelper([
  'LockScreen', 'OrientationManager', 'AttentionScreen',
  'ActivityWindow', 'ActivityWindowFactory',
  'Applications', 'SettingsListener', 'HomescreenLauncher',
  'ManifestHelper', 'KeyboardManager', 'StatusBar', 'SoftwareButtonManager',
  'HomescreenWindow', 'AppWindow', 'LayoutManager'
]).init();

suite('system/AppWindowManager', function() {
  mocksForAppWindowManager.attachTestHelpers();
  var stubById;
  var app1, app2, app3, app4, app5, app6, app7, home;
  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));

    home = new HomescreenWindow('fakeHome');
    MockHomescreenLauncher.mHomescreenWindow = home;
    MockHomescreenLauncher.origin = 'fakeOrigin';
    MockHomescreenLauncher.ready = true;

    app1 = new AppWindow(fakeAppConfig1);
    app2 = new AppWindow(fakeAppConfig2);
    app3 = new AppWindow(fakeAppConfig3);
    app4 = new AppWindow(fakeAppConfig4Background);
    app5 = new AppWindow(fakeAppConfig5Background);
    app6 = new AppWindow(fakeAppConfig6Browser);
    app7 = new AppWindow(fakeAppConfig7Activity);

    requireApp('system/js/app_window_manager.js', done);
  });

  teardown(function() {
    stubById.restore();
  });

  var fakeFTUConfig = {
    url: 'app://www.fakef/index.html',
    manifest: {},
    manifestURL: 'app://www.fakef/ManifestURL',
    origin: 'app://www.fakef'
  };

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  var fakeAppConfig2 = {
    url: 'app://www.fake2/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake2/ManifestURL',
    origin: 'app://www.fake2'
  };

  var fakeAppConfig3 = {
    url: 'app://www.fake3/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake3/ManifestURL',
    origin: 'app://www.fake3'
  };

  var fakeAppConfig4Background = {
    url: 'app://www.fake4/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake4/ManifestURL',
    origin: 'app://www.fake4',
    stayBackground: true
  };

  var fakeAppConfig5Background = {
    url: 'app://www.fake5/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake5/ManifestURL',
    origin: 'app://www.fake5',
    stayBackground: true,
    changeURL: true
  };

  var fakeAppConfig6Browser = {
    url: 'app://www.fake6/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake6/ManifestURL',
    origin: 'app://www.fake6',
    stayBackground: true,
    changeURL: true
  };

  var fakeAppConfig7Activity = {
    url: 'app://www.fake7/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake7/ManifestURL',
    origin: 'app://www.fake7',
    isActivity: true
  };

  function injectRunningApps() {
    AppWindowManager.runningApps = {};
    Array.slice(arguments).forEach(function iterator(app) {
      AppWindowManager.runningApps[app.origin] = app;
    });
  };

  suite('Handle events', function() {
    test('App is shown on rocketbarhidden', function() {
      AppWindowManager._activeApp = app1;
      var stubBroadcastMessage =
        this.sinon.stub(AppWindowManager._activeApp, 'setVisible');
      AppWindowManager.handleEvent({ type: 'rocketbarhidden' });
      assert.isTrue(stubBroadcastMessage.calledWith(true));
    });

    test('App is hidden on rocketbarshown', function() {
      AppWindowManager._activeApp = app1;
      var stubBroadcastMessage =
        this.sinon.stub(AppWindowManager._activeApp, 'setVisible');
      AppWindowManager.handleEvent({ type: 'rocketbarshown' });
      assert.isTrue(stubBroadcastMessage.calledWith(false));
    });

    test('Home Gesture enabled', function() {
      var stubBroadcastMessage =
        this.sinon.stub(AppWindowManager, 'broadcastMessage');
      AppWindowManager.handleEvent({ type: 'homegesture-enabled' });
      assert.isTrue(stubBroadcastMessage.calledWith('homegesture-enabled'));
    });

    test('Home Gesture disabled', function() {
      var stubBroadcastMessage =
        this.sinon.stub(AppWindowManager, 'broadcastMessage');
      AppWindowManager.handleEvent({ type: 'homegesture-disabled' });
      assert.isTrue(stubBroadcastMessage.calledWith('homegesture-disabled'));
    });

    test('Press home on home displayed', function() {
      AppWindowManager.runningApps[MockHomescreenLauncher.origin] = home;
      var stubEnsure = this.sinon.stub(home, 'ensure');
      AppWindowManager._activeApp = MockHomescreenLauncher.mHomescreenWindow;
      AppWindowManager.displayedApp = MockHomescreenLauncher.origin;
      AppWindowManager.handleEvent({ type: 'home' });
      assert.isTrue(stubEnsure.called);
    });

    test('Press home on home not displayed', function() {
      AppWindowManager.runningApps[MockHomescreenLauncher.origin] = home;
      AppWindowManager.runningApps[app1.origin] = home;
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');
      AppWindowManager._activeApp = app1;
      AppWindowManager.displayedApp = app1.origin;
      AppWindowManager.handleEvent({ type: 'home' });
      assert.isTrue(stubDisplay.called);
    });

    test('app is killed at background', function() {
      AppWindowManager.runningApps = {};
      AppWindowManager.displayedApp = app1.origin;
      AppWindowManager._activeApp = app2;
      AppWindowManager.runningApps[app1.origin] = app1;
      AppWindowManager.runningApps[app2.origin] = app2;

      AppWindowManager.handleEvent({ type: 'appterminated', detail: app2 });
      assert.isFalse(app2.origin in AppWindowManager.runningApps);
    });

    test('app is killed at foreground', function() {
      AppWindowManager.runningApps = {};
      AppWindowManager.displayedApp = app1.origin;
      AppWindowManager._activeApp = app1;
      AppWindowManager.runningApps[app1.origin] = app1;
      AppWindowManager.runningApps[app2.origin] = app2;

      AppWindowManager.handleEvent({ type: 'appterminated', detail: app1 });
      assert.isFalse(app1.origin in AppWindowManager.runningApps);
    });

    test('new app instance is created', function() {
      AppWindowManager.runningApps = {};

      AppWindowManager.handleEvent({ type: 'appcreated', detail: app1 });
      assert.isTrue(app1.origin in AppWindowManager.runningApps);
    });

    test('FTU is skipped', function() {
      AppWindowManager.runningApps = {};
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');

      AppWindowManager.handleEvent({ type: 'ftuskip' });
      assert.isTrue(stubDisplay.calledWith());
    });

    test('System resize', function() {
      AppWindowManager._activeApp = app1;
      var stubResize = this.sinon.stub(app1, 'resize');

      AppWindowManager.handleEvent({ type: 'system-resize' });
      assert.isTrue(stubResize.called);
    });

    test('app request to close', function() {
      AppWindowManager.runningApps = {};
      AppWindowManager.runningApps[app1.origin] = app1;
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(true);
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');

      AppWindowManager.handleEvent({ type: 'apprequestclose', detail: app1 });
      assert.isTrue(stubDisplay.calledWith());
    });

    test('app request to open', function() {
      AppWindowManager.runningApps = {};
      AppWindowManager.runningApps[app1.origin] = app1;

      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');

      AppWindowManager.handleEvent({ type: 'apprequestopen', detail: app1 });
      assert.isTrue(stubDisplay.calledWith(app1.origin));
    });

    test('homescreen is created', function() {
      AppWindowManager.runningApps = {};

      AppWindowManager.handleEvent({ type: 'homescreencreated', detail: app1 });
      assert.isTrue(MockHomescreenLauncher.origin in
        AppWindowManager.runningApps);
    });

    test('homescreen is changed', function() {
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');

      AppWindowManager.handleEvent(
        { type: 'homescreen-changed', detail: app1 });
      assert.isTrue(stubDisplay.calledWith());
    });

    test('kill app', function() {
      var stubKill = this.sinon.stub(AppWindowManager, 'kill');

      AppWindowManager.handleEvent({ type: 'killapp', detail: app1 });
      assert.isTrue(stubKill.called);
    });

    test('app uninstalled', function() {
      var stubKill = this.sinon.stub(AppWindowManager, 'kill');

      AppWindowManager.handleEvent({ type: 'applicationuninstall',
        detail: {
          application: app1
        }
      });
      assert.isTrue(stubKill.called);
    });

    test('display app', function() {
      AppWindowManager.runningApps = {};
      AppWindowManager.runningApps[app1.origin] = app1;

      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');

      AppWindowManager.handleEvent({ type: 'displayapp', detail: app1 });
      assert.isTrue(stubDisplay.calledWith(app1.origin));

    });

    test('Hide whole windows', function() {
      var stubSetAttribute =
        this.sinon.stub(AppWindowManager.element, 'setAttribute');

      AppWindowManager.handleEvent({ type: 'hidewindows' });
      assert.isTrue(stubSetAttribute.calledWith('aria-hidden', 'true'));
    });

    test('Show whole windows', function() {
      var stubSetAttribute =
        this.sinon.stub(AppWindowManager.element, 'setAttribute');

      AppWindowManager.handleEvent({ type: 'showwindows' });
      assert.isTrue(stubSetAttribute.calledWith('aria-hidden', 'false'));
    });

    test('Launch app', function() {
      var stubLaunch =
        this.sinon.stub(AppWindowManager, 'launch');

      AppWindowManager.handleEvent(
        { type: 'launchapp', detail: fakeAppConfig1 });
      assert.isTrue(stubLaunch.calledWith(fakeAppConfig1));
    });

    test('Show top window', function() {
      AppWindowManager.runningApps = {};
      AppWindowManager.runningApps[app1.origin] = app1;
      AppWindowManager._activeApp = app1;
      MockAttentionScreen.mFullyVisible = false;
      var stubSetVisible = this.sinon.stub(app1, 'setVisible');

      AppWindowManager.handleEvent({
        type: 'showwindow'
      });

      assert.isTrue(stubSetVisible.calledWith(true));
    });

    test('Hide top window', function() {
      AppWindowManager.runningApps = {};
      AppWindowManager.runningApps[app1.origin] = app1;
      AppWindowManager._activeApp = app1;
      var stubSetVisible = this.sinon.stub(app1, 'setVisible');

      AppWindowManager.handleEvent({
        type: 'hidewindow'
      });

      assert.isTrue(stubSetVisible.calledWith(false));
    });

    test('Overlay start on top of in process app', function() {
      AppWindowManager.runningApps = {};
      AppWindowManager.runningApps[app6.origin] = app6;
      AppWindowManager._activeApp = app6;
      AppWindowManager.displayedApp = app6.origin;
      var stubIsOOP = this.sinon.stub(app6, 'isOOP');
      stubIsOOP.returns(false);
      var stubSetVisible = this.sinon.stub(app6, 'setVisible');

      AppWindowManager.handleEvent({ type: 'overlaystart' });
      assert.isTrue(stubSetVisible.calledWith(false));
    });

    test('Overlay start on top of OOP app', function() {
      AppWindowManager.runningApps = {};
      AppWindowManager.runningApps[app1.origin] = app1;
      AppWindowManager._activeApp = app1;
      AppWindowManager.displayedApp = app1.origin;
      var stubBlur = this.sinon.stub(app1, 'blur');

      AppWindowManager.handleEvent({ type: 'overlaystart' });
      assert.isTrue(stubBlur.called);
    });
  });

  suite('Kill()', function() {
    test('kill()', function() {
      AppWindowManager.runningApps = {};
      AppWindowManager.runningApps[app1.origin] = app1;
      var stubKill = this.sinon.stub(app1, 'kill');

      AppWindowManager.kill(app1.origin);
      assert.isTrue(stubKill.called);
    });
  });

  suite('updateActiveApp()', function() {
    test('update', function() {
      injectRunningApps(app1, app2, app3, app4);
      AppWindowManager._activeApp = app2;
      AppWindowManager.displayedApp = '';
      AppWindowManager._updateActiveApp(app1.origin);
      assert.equal(AppWindowManager.displayedApp, app1.origin);
      assert.deepEqual(AppWindowManager._activeApp, app1);
    });
  });

  suite('Display()', function() {
    test('FTU', function() {
      AppWindowManager.displayedApp = '';
      AppWindowManager._activeApp = null;
      var app = new AppWindow(fakeFTUConfig);
      injectRunningApps(app);
      var stubReady = this.sinon.stub(app, 'ready');
      AppWindowManager.display(fakeFTUConfig.origin);
      stubReady.yield();
      assert.equal(AppWindowManager.displayedApp, fakeFTUConfig.origin);
    });

    test('app to app', function() {
      injectRunningApps(app1, app2);
      AppWindowManager.displayedApp = app1.origin;
      AppWindowManager._activeApp = app1;
      var stubSwitchApp = this.sinon.stub(AppWindowManager, 'switchApp');
      AppWindowManager.display(app2.origin);
      assert.isTrue(stubSwitchApp.called);
      assert.deepEqual(stubSwitchApp.getCall(0).args[0], app1);
      assert.deepEqual(stubSwitchApp.getCall(0).args[1], app2);
    });
  });

  suite('Switch app', function() {
    test('home to app', function() {
      injectRunningApps(home, app1);
      AppWindowManager._activeApp = home;
      var stub_updateActiveApp = this.sinon.stub(AppWindowManager,
        '_updateActiveApp');
      var stubReady = this.sinon.stub(app1, 'ready');
      var stubAppNextOpen = this.sinon.stub(app1, 'open');
      var stubAppCurrentClose = this.sinon.stub(home, 'close');
      AppWindowManager.switchApp(home, app1);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.called);
      assert.isTrue(stub_updateActiveApp.called);
    });

    test('home to an app killed while opening', function() {
      injectRunningApps(home, app1);
      AppWindowManager._activeApp = home;
      this.sinon.stub(app1, 'isDead').returns(true);

      var stub_updateActiveApp = this.sinon.stub(AppWindowManager,
        '_updateActiveApp');
      var stubReady = this.sinon.stub(app1, 'ready');
      var stubAppCurrentClose = this.sinon.stub(home, 'close');
      AppWindowManager.switchApp(home, app1);
      stubReady.yield();
      assert.isFalse(stubAppCurrentClose.called);
      assert.isFalse(stub_updateActiveApp.called);
    });

    test('app to home', function() {
      injectRunningApps(home, app1);
      AppWindowManager._activeApp = app1;
      var stub_updateActiveApp = this.sinon.stub(AppWindowManager,
        '_updateActiveApp');
      var stubReady = this.sinon.stub(home, 'ready');
      var stubAppNextOpen = this.sinon.stub(home, 'open');
      var stubAppCurrentClose = this.sinon.stub(app1, 'close');
      AppWindowManager.switchApp(app1, home);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.called);
      assert.isTrue(stub_updateActiveApp.called);
    });

    test('app to app', function() {
      injectRunningApps(app1, app2);
      AppWindowManager._activeApp = app1;
      var stub_updateActiveApp = this.sinon.stub(AppWindowManager,
        '_updateActiveApp');
      var stubReady = this.sinon.stub(app2, 'ready');
      var stubAppNextOpen = this.sinon.stub(app2, 'open');
      var stubAppCurrentClose = this.sinon.stub(app1, 'close');
      AppWindowManager.switchApp(app1, app2, true);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.called);
      assert.isTrue(stubAppNextOpen.calledWith('invoked'));
      assert.isTrue(stubAppCurrentClose.calledWith('invoking'));
      assert.isTrue(stub_updateActiveApp.called);
    });

    test('close app to cardsview', function() {
      injectRunningApps(app1, home);
      AppWindowManager._activeApp = app1;
      var stub_updateActiveApp = this.sinon.stub(AppWindowManager,
        '_updateActiveApp');
      var stubReady = this.sinon.stub(home, 'ready');
      var stubAppNextOpen = this.sinon.stub(home, 'open');
      var stubAppCurrentClose = this.sinon.stub(app1, 'close');
      AppWindowManager.switchApp(app1, home, false, null, 'to-cardview');
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.calledWith('to-cardview'));
      assert.isTrue(stub_updateActiveApp.called);
    });

    test('open app from cardsview', function() {
      injectRunningApps(app1, home);
      AppWindowManager._activeApp = app1;
      var stub_updateActiveApp = this.sinon.stub(AppWindowManager,
        '_updateActiveApp');
      var stubReady = this.sinon.stub(app1, 'ready');
      var stubAppNextOpen = this.sinon.stub(app1, 'open');
      var stubAppCurrentClose = this.sinon.stub(home, 'close');
      AppWindowManager.switchApp(home, app1, false, 'from-cardview', null);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.calledWith('from-cardview'));
      assert.isTrue(stubAppCurrentClose.called);
      assert.isTrue(stub_updateActiveApp.called);
    });
  });

  suite('BroadcastMessage', function() {
    test('fake message', function() {
      injectRunningApps(app1, app2, app3);
      var stubApp1broadcast = this.sinon.stub(app1, 'broadcast');
      var stubApp2broadcast = this.sinon.stub(app2, 'broadcast');
      var stubApp3broadcast = this.sinon.stub(app3, 'broadcast');
      AppWindowManager.broadcastMessage('fake-message');
      assert.isTrue(stubApp1broadcast.called);
      assert.isTrue(stubApp2broadcast.calledWith('fake-message', undefined));
      assert.isTrue(stubApp3broadcast.calledWith('fake-message', undefined));
    });
  });

  suite('Launch()', function() {
    test('Launch app1', function() {
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');
      AppWindowManager.runningApps = {};
      AppWindowManager.launch(fakeAppConfig1);
      assert.isTrue(stubDisplay.called);
    });

    test('Launch app1 which is already launched', function() {
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');
      AppWindowManager.runningApps = {};
      AppWindowManager.runningApps[app1.origin] = app1;
      AppWindowManager.launch(fakeAppConfig1);
      assert.isTrue(stubDisplay.called);
    });

    test('Launch background app', function() {
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');
      AppWindowManager.runningApps = {};
      AppWindowManager.launch(fakeAppConfig4Background);
      assert.isFalse(stubDisplay.called);
    });

    test('Launch app is running and change URL', function() {
      injectRunningApps();
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');
      var stubChangeURL = this.sinon.stub(app5, 'modifyURLatBackground');
      AppWindowManager.runningApps = {};
      AppWindowManager.runningApps[app5.origin] = app5;
      AppWindowManager.launch(fakeAppConfig5Background);
      assert.isFalse(stubDisplay.called);
    });

    test('Launch app is not running and change URL', function() {
      injectRunningApps(app1, app2, app3, app5);
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');
      AppWindowManager.launch(fakeAppConfig5Background);
      assert.isFalse(stubDisplay.called);
    });

    test('Launch an activity app', function() {
      injectRunningApps(app1, app7);
      AppWindowManager._updateActiveApp(app1.origin);

      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');
      AppWindowManager.launch(fakeAppConfig7Activity);

      assert.isTrue(stubDisplay.called);
      assert.equal(app7.activityCaller, app1);
      assert.equal(app1.activityCallee, app7);
    });

    test('Launch activity from inline activity', function() {
      injectRunningApps(app1, app7);
      AppWindowManager._updateActiveApp(app1.origin);

      var activity = new ActivityWindow({});
      ActivityWindowFactory._activeActivity = activity;

      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');
      AppWindowManager.launch(fakeAppConfig7Activity);

      assert.isTrue(stubDisplay.called);
      assert.equal(app7.activityCaller, activity);
      assert.equal(activity.activityCallee, app7);
    });
  });
});
