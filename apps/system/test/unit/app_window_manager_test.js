/* global AppWindowManager, AppWindow, homescreenLauncher,
          MockAttentionScreen, HomescreenWindow, MocksHelper,
          MockSettingsListener, HomescreenLauncher */
'use strict';

mocha.globals(['SettingsListener', 'removeEventListener', 'addEventListener',
      'dispatchEvent', 'ActivityWindow',
      'AppWindowManager', 'Applications', 'ManifestHelper',
      'KeyboardManager', 'StatusBar', 'HomescreenWindow',
      'SoftwareButtonManager', 'AttentionScreen', 'AppWindow',
      'lockScreen', 'OrientationManager', 'BrowserFrame',
      'BrowserConfigHelper', 'System', 'BrowserMixin', 'TransitionMixin',
      'homescreenLauncher', 'layoutManager', 'lockscreen']);

requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_system.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_activity_window.js');
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
  'OrientationManager', 'AttentionScreen',
  'ActivityWindow', 'System',
  'Applications', 'SettingsListener', 'HomescreenLauncher',
  'ManifestHelper', 'KeyboardManager', 'StatusBar', 'SoftwareButtonManager',
  'HomescreenWindow', 'AppWindow', 'LayoutManager',
]).init();

suite('system/AppWindowManager', function() {
  mocksForAppWindowManager.attachTestHelpers();
  var stubById;
  var app1, app2, app3, app4, app5, app6, app7, home;
  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    
    window.layoutManager = new window.LayoutManager();

    home = new HomescreenWindow('fakeHome');
    window.homescreenLauncher = new HomescreenLauncher().start();
    homescreenLauncher.mFeedFixtures({
      mHomescreenWindow: home,
      mOrigin: 'fakeOrigin',
      mReady: true
    });

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
    AppWindowManager.uninit();
    delete window.lockScreen;
    delete window.layoutManager;
    // MockHelper won't invoke mTeardown() for us
    // since MockHomescreenLauncher is instantiable now
    window.homescreenLauncher.mTeardown();
    delete window.homescreenLauncher;
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
    isActivity: true,
    parentApp: ''
  };

  function injectRunningApps() {
    AppWindowManager._apps = {};
    Array.slice(arguments).forEach(function iterator(app) {
      AppWindowManager._apps[app.instanceID] = app;
    });
  }

  suite('Handle events', function() {
    test('If cardview will open, keyboard should be dismissed', function() {
      var stubBlur = this.sinon.stub(app1, 'blur');
      this.sinon.stub(app1, 'getTopMostWindow').returns(app1);
      AppWindowManager._activeApp = app1;
      AppWindowManager.handleEvent({
        type: 'cardviewbeforeshow'
      });
      assert.isTrue(stubBlur.called);
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
      injectRunningApps(home);
      var stubEnsure = this.sinon.stub(home, 'ensure');
      AppWindowManager._activeApp = homescreenLauncher.mHomescreenWindow;
      AppWindowManager.displayedApp = homescreenLauncher.origin;
      AppWindowManager.handleEvent({ type: 'home' });
      assert.isTrue(stubEnsure.called);
    });

    test('Press home on home not displayed', function() {
      injectRunningApps(home, app1);
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');
      AppWindowManager._activeApp = app1;
      AppWindowManager.handleEvent({ type: 'home' });
      assert.isTrue(stubDisplay.called);
    });

    test('app is killed at background', function() {
      injectRunningApps(app1, app2);
      AppWindowManager._activeApp = app2;

      AppWindowManager.handleEvent({ type: 'appterminated', detail: app2 });
      assert.isFalse(app2.instanceID in AppWindowManager._apps);
    });

    test('app is killed at foreground', function() {
      injectRunningApps(app1, app2);
      AppWindowManager._activeApp = app1;

      AppWindowManager.handleEvent({ type: 'appterminated', detail: app1 });
      assert.isFalse(app1.instanceID in AppWindowManager._apps);
    });

    test('new app instance is created', function() {
      injectRunningApps();

      AppWindowManager.handleEvent({ type: 'appcreated', detail: app1 });
      assert.isTrue(app1.instanceID in AppWindowManager._apps);
    });

    test('FTU is skipped', function() {
      injectRunningApps();
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');

      AppWindowManager.handleEvent({ type: 'ftuskip' });
      assert.isTrue(stubDisplay.calledWith());
    });

    test('FTU is skipped when lockscreen is active', function() {
      var originalLocked = window.System.locked;
      window.System.locked = true;
      injectRunningApps();
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');
      var stubSetVisible = this.sinon.stub(home, 'setVisible');

      AppWindowManager.handleEvent({ type: 'ftuskip' });
      assert.isFalse(stubDisplay.calledWith());
      assert.isTrue(stubSetVisible.calledWith(false));
      window.System.locked = originalLocked;
    });

    test('System resize', function() {
      AppWindowManager._activeApp = app1;
      var stubResize = this.sinon.stub(app1, 'resize');

      AppWindowManager.handleEvent({ type: 'system-resize' });
      assert.isTrue(stubResize.called);
    });

    test('app request to close', function() {
      injectRunningApps(app1);
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(true);
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');

      AppWindowManager.handleEvent({ type: 'apprequestclose', detail: app1 });
      assert.isTrue(stubDisplay.calledWith());
    });

    test('app request to open', function() {
      injectRunningApps(app1);

      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');

      AppWindowManager.handleEvent({ type: 'apprequestopen', detail: app1 });
      assert.isTrue(stubDisplay.calledWith(app1));
    });

    test('homescreen is created', function() {
      injectRunningApps();

      AppWindowManager.handleEvent({ type: 'homescreencreated', detail: home });
      assert.isTrue(home.instanceID in
        AppWindowManager._apps);
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
      injectRunningApps(app1);

      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');

      AppWindowManager.handleEvent({ type: 'displayapp', detail: app1 });
      assert.isTrue(stubDisplay.calledWith(app1));

    });

    test('Launch app', function() {
      var stubLaunch =
        this.sinon.stub(AppWindowManager, 'launch');

      AppWindowManager.handleEvent(
        { type: 'launchapp', detail: fakeAppConfig1 });
      assert.isTrue(stubLaunch.calledWith(fakeAppConfig1));
    });

    test('Show top window', function() {
      injectRunningApps(app1);
      AppWindowManager._activeApp = app1;
      MockAttentionScreen.mFullyVisible = false;
      var stubSetVisible = this.sinon.stub(app1, 'setVisible');

      AppWindowManager.handleEvent({
        type: 'showwindow'
      });

      assert.isTrue(stubSetVisible.calledWith(true));
    });

    test('Hide top window', function() {
      injectRunningApps(app1);
      AppWindowManager._activeApp = app1;
      var stubSetVisible = this.sinon.stub(app1, 'setVisible');

      AppWindowManager.handleEvent({
        type: 'hidewindow'
      });

      assert.isTrue(stubSetVisible.calledWith(false));
    });

    test('Show for screen reader top window', function() {
      injectRunningApps(app1);
      AppWindowManager._activeApp = app1;
      var stubSetVisibleForScreenReader = this.sinon.stub(app1,
        'setVisibleForScreenReader');

      AppWindowManager.handleEvent({
        type: 'showwindowforscreenreader'
      });

      assert.isTrue(stubSetVisibleForScreenReader.calledWith(true));
    });

    test('Hide for screen reader top window', function() {
      injectRunningApps(app1);
      AppWindowManager._activeApp = app1;
      var stubSetVisibleForScreenReader = this.sinon.stub(app1,
        'setVisibleForScreenReader');

      AppWindowManager.handleEvent({
        type: 'hidewindowforscreenreader'
      });

      assert.isTrue(stubSetVisibleForScreenReader.calledWith(false));
    });

    test('Overlay start on top of in process app', function() {
      injectRunningApps(app6);
      AppWindowManager._activeApp = app6;
      var stubIsOOP = this.sinon.stub(app6, 'isOOP');
      stubIsOOP.returns(false);
      var stubSetVisible = this.sinon.stub(app6, 'setVisible');

      AppWindowManager.handleEvent({ type: 'overlaystart' });
      assert.isTrue(stubSetVisible.calledWith(false));
    });

    test('Overlay start on top of OOP app', function() {
      injectRunningApps(app1);
      AppWindowManager._activeApp = app1;
      var stubBlur = this.sinon.stub(app1, 'blur');

      AppWindowManager.handleEvent({ type: 'overlaystart' });
      assert.isTrue(stubBlur.called);
    });
  });

  suite('Kill()', function() {
    test('kill()', function() {
      injectRunningApps(app1);
      var stubKill = this.sinon.stub(app1, 'kill');

      AppWindowManager.kill(app1.origin);
      assert.isTrue(stubKill.called);
    });
  });

  suite('updateActiveApp()', function() {
    test('update', function() {
      injectRunningApps(app1, app2, app3, app4);
      AppWindowManager._activeApp = app2;
      AppWindowManager._updateActiveApp(app1.instanceID);
      assert.deepEqual(AppWindowManager._activeApp, app1);
    });

    test('should resize the new active app', function() {
      injectRunningApps(app1, app2, app3, app4);
      AppWindowManager._activeApp = app2;

      var resizeSpy = this.sinon.spy(app1, 'resize');
      AppWindowManager._updateActiveApp(app1.instanceID);
      sinon.assert.calledOnce(resizeSpy);
    });
  });

  suite('Display()', function() {
    test('FTU', function() {
      var app = new AppWindow(fakeFTUConfig);
      injectRunningApps(app);
      AppWindowManager._activeApp = null;
      var stubReady = this.sinon.stub(app, 'ready');
      AppWindowManager.display(app);
      stubReady.yield();
      assert.equal(AppWindowManager._activeApp, app);
    });

    test('app to app', function() {
      var stub_updateActiveApp = this.sinon.stub(AppWindowManager,
        '_updateActiveApp');
      injectRunningApps(app1, app2);
      AppWindowManager._activeApp = app1;
      var stubSwitchApp = this.sinon.stub(AppWindowManager, 'switchApp');
      AppWindowManager.display(app2);
      assert.isTrue(stubSwitchApp.called);
      assert.deepEqual(stubSwitchApp.getCall(0).args[0], app1);
      assert.deepEqual(stubSwitchApp.getCall(0).args[1], app2);
      assert.isTrue(stub_updateActiveApp.called);
    });

    test('Continunous app open requests', function() {
      injectRunningApps(home, app1, app2);
      AppWindowManager._activeApp = home;

      AppWindowManager.display(app1);
      AppWindowManager.display(app2);

      assert.deepEqual(AppWindowManager._activeApp, app2);
    });
  });

  suite('Switch app', function() {
    test('home to app', function() {
      injectRunningApps(home, app1);
      AppWindowManager._activeApp = home;

      var stubReady = this.sinon.stub(app1, 'ready');
      var stubAppNextOpen = this.sinon.stub(app1, 'open');
      var stubAppCurrentClose = this.sinon.stub(home, 'close');
      AppWindowManager.switchApp(home, app1);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.called);
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
      assert.isTrue(stub_updateActiveApp.called);
    });

    test('app to home', function() {
      injectRunningApps(home, app1);
      AppWindowManager._activeApp = app1;
      var stubReady = this.sinon.stub(home, 'ready');
      var stubAppNextOpen = this.sinon.stub(home, 'open');
      var stubAppCurrentClose = this.sinon.stub(app1, 'close');
      AppWindowManager.switchApp(app1, home);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.called);
    });

    test('app to app', function() {
      injectRunningApps(app1, app2);
      AppWindowManager._activeApp = app1;
      var stubReady = this.sinon.stub(app2, 'ready');
      var stubAppNextOpen = this.sinon.stub(app2, 'open');
      var stubAppCurrentClose = this.sinon.stub(app1, 'close');
      AppWindowManager.switchApp(app1, app2, true);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.called);
      assert.isTrue(stubAppNextOpen.calledWith('invoked'));
      assert.isTrue(stubAppCurrentClose.calledWith('invoking'));
    });

    test('close app to cardsview', function() {
      injectRunningApps(app1, home);
      AppWindowManager._activeApp = app1;
      var stubReady = this.sinon.stub(home, 'ready');
      var stubAppNextOpen = this.sinon.stub(home, 'open');
      var stubAppCurrentClose = this.sinon.stub(app1, 'close');
      AppWindowManager.switchApp(app1, home, false, null, 'to-cardview');
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.calledWith('to-cardview'));
    });

    test('open app from cardsview', function() {
      injectRunningApps(app1, home);
      AppWindowManager._activeApp = app1;
      var stubReady = this.sinon.stub(app1, 'ready');
      var stubAppNextOpen = this.sinon.stub(app1, 'open');
      var stubAppCurrentClose = this.sinon.stub(home, 'close');
      AppWindowManager.switchApp(home, app1, false, 'from-cardview', null);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.calledWith('from-cardview'));
      assert.isTrue(stubAppCurrentClose.called);
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
      injectRunningApps();
      AppWindowManager.launch(fakeAppConfig1);
      assert.isTrue(stubDisplay.called);
    });

    test('Launch app1 which is already launched', function() {
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');
      injectRunningApps(app1);
      AppWindowManager.launch(fakeAppConfig1);
      assert.isTrue(stubDisplay.called);
    });

    test('Launch background app', function() {
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');
      injectRunningApps();
      AppWindowManager.launch(fakeAppConfig4Background);
      assert.isFalse(stubDisplay.called);
    });

    test('Launch app is running and change URL', function() {
      injectRunningApps(app5);
      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');
      var stubChangeURL = this.sinon.stub(app5, 'modifyURLatBackground');
      AppWindowManager.launch(fakeAppConfig5Background);
      assert.isTrue(stubChangeURL.called);
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
      AppWindowManager._updateActiveApp(app1.instanceID);

      var stubDisplay = this.sinon.stub(AppWindowManager, 'display');
      AppWindowManager.launch(fakeAppConfig7Activity);

      assert.isTrue(stubDisplay.called);
      assert.equal(app7.callerWindow, app1);
      assert.equal(app1.calleeWindow, app7);
    });
  });

  suite('Settings change', function() {
    test('app-suspending.enabled', function() {
      var stubBroadcastMessage =
        this.sinon.stub(AppWindowManager, 'broadcastMessage');
      MockSettingsListener.mCallbacks['app-suspending.enabled'](false);
      assert.ok(stubBroadcastMessage.calledWith('kill_suspended'));
    });

    test('language.current', function() {
      var stubBroadcastMessage =
        this.sinon.stub(AppWindowManager, 'broadcastMessage');
      MockSettingsListener.mCallbacks['language.current']('chinese');
      assert.ok(stubBroadcastMessage.calledWith('localized'));
    });

    test('continuous-transition.enabled', function() {
      MockSettingsListener.mCallbacks['continuous-transition.enabled'](true);
      assert.isTrue(AppWindowManager.continuousTransition);
    });
  });

  suite('linkWindowActivity', function() {
    var fakeAppConfig = Object.create(fakeAppConfig7Activity);

    setup(function() {
      // we fake getHomescreen as app2
      this.sinon.stub(homescreenLauncher, 'getHomescreen').returns(app2);
    });

    test('caller is system app, we would go to homescreen', function() {
      // callee is app7, caller is homescreen
      injectRunningApps(app7);
      fakeAppConfig.parentApp = window.location.origin;

      AppWindowManager.linkWindowActivity(fakeAppConfig);

      assert.deepEqual(app2.calleeWindow, app7);
      assert.deepEqual(app7.callerWindow, app2);
      assert.isTrue(homescreenLauncher.getHomescreen.called);
    });

    test('caller is not system app, we would go back to original app',
      function() {
        // callee is app7, caller is app2
        injectRunningApps(app7);
        AppWindowManager._activeApp = app1;
        fakeAppConfig.parentApp = '';
        this.sinon.stub(app1, 'getTopMostWindow').returns(app2);

        AppWindowManager.linkWindowActivity(fakeAppConfig);

        assert.deepEqual(app2.calleeWindow, app7);
        assert.deepEqual(app7.callerWindow, app2);
        assert.isFalse(homescreenLauncher.getHomescreen.called);
    });
  });

  test('getApp', function() {
    injectRunningApps(app1, app2, app3, app4);
    assert.deepEqual(AppWindowManager.getApp('app://www.fake2'), app2);
    assert.isNull(AppWindowManager.getApp('app://no-this-origin'));
  });
});
