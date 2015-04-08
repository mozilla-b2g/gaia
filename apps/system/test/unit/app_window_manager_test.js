/* global appWindowManager, AppWindow, HomescreenWindowManager, MockShrinkingUI,
          HomescreenWindow, MocksHelper, MockSettingsListener, Service,
          MockRocketbar, rocketbar, homescreenWindowManager,
          MockTaskManager, MockFtuLauncher, MockService, MockAppWindowFactory,
          MockWrapperFactory */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
require('/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_activity_window.js');
requireApp('system/test/unit/mock_keyboard_manager.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
requireApp('system/test/unit/mock_software_button_manager.js');
requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_homescreen_window_manager.js');
requireApp('system/test/unit/mock_nfc_handler.js');
requireApp('system/test/unit/mock_rocketbar.js');
requireApp('system/test/unit/mock_task_manager.js');
requireApp('system/shared/test/unit/mocks/mock_shrinking_ui.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_wrapper_factory.js');
requireApp('system/test/unit/mock_app_window_factory.js');

var mocksForAppWindowManager = new MocksHelper([
  'OrientationManager', 'ActivityWindow', 'ShrinkingUI',
  'Applications', 'SettingsListener', 'HomescreenWindowManager',
  'ManifestHelper', 'KeyboardManager', 'StatusBar', 'SoftwareButtonManager',
  'HomescreenWindow', 'AppWindow', 'LayoutManager', 'Service', 'NfcHandler',
  'TaskManager', 'FtuLauncher'
]).init();

suite('system/AppWindowManager', function() {
  mocksForAppWindowManager.attachTestHelpers();
  var stubById;
  var app1, app2, app3, app4, app5, app6, app7, browser1, home;

  var screenElement = document.createElement('div');

  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById', function(id) {
      if (id === 'screen') {
        return screenElement;
      }

      return document.createElement('div');
    });

    window.layoutManager = new window.LayoutManager();
    window.mediaRecording = { isRecording: false };

    home = new HomescreenWindow('fakeHome');
    window.homescreenWindowManager = new HomescreenWindowManager();
    window.homescreenWindowManager.start();
    window.homescreenWindowManager.mHomescreenWindow = home;

    window.rocketbar = new MockRocketbar();
    window.taskManager = new MockTaskManager();

    app1 = new AppWindow(fakeAppConfig1);
    app2 = new AppWindow(fakeAppConfig2);
    app3 = new AppWindow(fakeAppConfig3);
    app4 = new AppWindow(fakeAppConfig4Background);
    app5 = new AppWindow(fakeAppConfig5Background);
    app6 = new AppWindow(fakeAppConfig6Browser);
    app7 = new AppWindow(fakeAppConfig7Activity);
    browser1 = new AppWindow(fakeBrowserConfig);

    requireApp('system/js/app_window_manager.js', function() {
      window.appWindowManager = new window.AppWindowManager();
      window.appWindowManager.start();
      done();
    });
  });

  teardown(function() {
    appWindowManager.stop();
    delete window.layoutManager;
    delete window.mediaRecording;
    delete window.homescreenWindowManager;
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

  var fakeBrowserConfig = {
    url: 'http://mozilla.org/index.html',
    manifest: {},
    origin: 'http://mozilla.org'
  };

  function injectRunningApps() {
    appWindowManager._apps = {};
    Array.slice(arguments).forEach(function iterator(app) {
      appWindowManager._apps[app.instanceID] = app;
    });
  }

  test('Get active app when _activeApp is null', function() {
    appWindowManager._activeApp = null;
    assert.deepEqual(appWindowManager.getActiveApp(), home,
      'should return home app');
  });

  suite('Handle events', function() {
    test('hierarchytopmostwindowchanged', function() {
      this.sinon.stub(app1, 'setNFCFocus');
      appWindowManager._activeApp = app1;
      MockService.mTopMostUI = appWindowManager;
      appWindowManager.handleEvent({
        type: 'hierarchytopmostwindowchanged'
      });
      assert.isTrue(app1.setNFCFocus.calledWith(true));
    });

    test('should not setNFCFocus when top most is not us', function() {
      this.sinon.stub(app3, 'setNFCFocus');
      appWindowManager._activeApp = app3;
      MockService.mTopMostUI = MockRocketbar;
      appWindowManager.handleEvent({
        type: 'hierarchytopmostwindowchanged'
      });
      assert.isFalse(app3.setNFCFocus.calledWith(true));
    });

    test('localized event should be broadcasted.', function() {
      var stubBroadcastMessage =
        this.sinon.stub(appWindowManager, 'broadcastMessage');
      appWindowManager.handleEvent({
        type: 'localized'
      });
      assert.ok(stubBroadcastMessage.calledWith('localized'));
    });

    test('launchtrusted event', function() {
      var testEvt = new CustomEvent('launchtrusted', {
        detail: {
          chromeId: 'testchromeid'
        }
      });
      var stubLaunchTrustedWindow = this.sinon.stub(appWindowManager,
        '_launchTrustedWindow');
      appWindowManager.handleEvent(testEvt);
      assert.isTrue(stubLaunchTrustedWindow.calledWith(testEvt));
    });

    test('Active app should be updated once any app is opening.', function() {
      var stub_updateActiveApp = this.sinon.stub(appWindowManager,
        '_updateActiveApp');
      injectRunningApps(app1, app2);
      appWindowManager._activeApp = app1;
      appWindowManager.handleEvent({
        type: 'appopening',
        detail: app2
      });
      assert.isTrue(stub_updateActiveApp.calledWith(app2.instanceID));
    });

    test('Active app should be updated once any app is opened.', function() {
      var stub_updateActiveApp = this.sinon.stub(appWindowManager,
        '_updateActiveApp');
      injectRunningApps(app1, app2);
      appWindowManager._activeApp = app1;
      appWindowManager.handleEvent({
        type: 'appopened',
        detail: app2
      });
      assert.isTrue(stub_updateActiveApp.calledWith(app2.instanceID));
    });

    test('Active app should be updated once homescreen is opened.', function() {
      var stub_updateActiveApp = this.sinon.stub(appWindowManager,
        '_updateActiveApp');
      injectRunningApps(app1, home);
      appWindowManager._activeApp = app1;
      appWindowManager.handleEvent({
        type: 'homescreenopened',
        detail: home
      });
      assert.isTrue(stub_updateActiveApp.calledWith(home.instanceID));
    });

    test('Topmost app should be notified about inputmethod-contextchange ' +
      'mozChromeEvent', function() {
        var stubInputMethodContextChange = this.sinon.stub(app1, 'broadcast');
        var detail = {
          type: 'inputmethod-contextchange'
        };
        this.sinon.stub(app1, 'getTopMostWindow').returns(app1);
        appWindowManager._activeApp = app1;
        appWindowManager.respondToHierarchyEvent({
          type: 'mozChromeEvent',
          detail: detail
        });
        assert.isTrue(stubInputMethodContextChange.calledWith(
          'inputmethod-contextchange', detail));
      });

    test('When receiving shrinking-start, we need to blur the active app',
      function() {
        var stubFocus = this.sinon.stub(app1, 'broadcast');
        MockService.mTopMostUI = appWindowManager;
        appWindowManager._activeApp = app1;
        appWindowManager.handleEvent({
          type: 'shrinking-start'
        });
        assert.deepEqual(appWindowManager.shrinkingUI.elements
          .foregroundElement, app1.getBottomMostWindow().element);
        assert.deepEqual(appWindowManager.shrinkingUI.elements
          .backgroundElement, app1.getBottomMostWindow().element.parentNode);
        assert.isTrue(appWindowManager.shrinkingUI.mStarted);
        assert.isTrue(stubFocus.calledWith('shrinkingstart'));
      });

    test('When receiving shrinking-start and top-most ui is not ' +
         'appWindowManager',
      function() {
        var stubFocus = this.sinon.stub(app1, 'broadcast');
        appWindowManager._activeApp = app1;
        appWindowManager.handleEvent({
          type: 'shrinking-start'
        });
        assert.isFalse(stubFocus.calledWith('shrinkingstart'));
      });

    test('When receiving shrinking-stop, we need to focus the active app',
      function() {
        var stubFocus = this.sinon.stub(app1, 'broadcast');
        appWindowManager._activeApp = app1;
        appWindowManager.shrinkingUI = new MockShrinkingUI();
        appWindowManager.shrinkingUI.mActive = true;
        appWindowManager.handleEvent({
          type: 'shrinking-stop'
        });
        assert.isTrue(stubFocus.calledWith('shrinkingstop'));
      });

    test('When permission dialog is closed, we need to focus the active app',
      function() {
        var stubFocus = this.sinon.stub(app1, 'broadcast');
        appWindowManager._activeApp = app1;
        appWindowManager.handleEvent({
          type: 'permissiondialoghide'
        });
        assert.isTrue(stubFocus.calledWith('focus'));
      });

    test('If cardview will open, keyboard should be dismissed', function() {
      var stubBlur = this.sinon.stub(app1, 'blur');
      this.sinon.stub(app1, 'getTopMostWindow').returns(app1);
      appWindowManager._activeApp = app1;
      appWindowManager.handleEvent({
        type: 'cardviewbeforeshow'
      });
      assert.isTrue(stubBlur.called);
    });

    test('Should broadcast cardview events to apps', function() {
      var stubBroadcastMessage =
        this.sinon.stub(appWindowManager, 'broadcastMessage');

      appWindowManager.handleEvent({ type: 'cardviewbeforeshow' });
      assert.isTrue(stubBroadcastMessage.calledWith('cardviewbeforeshow'));

      appWindowManager.handleEvent({ type: 'cardviewshown' });
      assert.isTrue(stubBroadcastMessage.calledWith('cardviewshown'));

      appWindowManager.handleEvent({ type: 'cardviewclosed' });
      assert.isTrue(stubBroadcastMessage.calledWith('cardviewclosed'));
    });

    test('Home Gesture enabled', function() {
      var stubBroadcastMessage =
        this.sinon.stub(appWindowManager, 'broadcastMessage');
      appWindowManager.handleEvent({ type: 'homegesture-enabled' });
      assert.isTrue(stubBroadcastMessage.calledWith('homegesture-enabled'));
    });

    test('Home Gesture disabled', function() {
      var stubBroadcastMessage =
        this.sinon.stub(appWindowManager, 'broadcastMessage');
      appWindowManager.handleEvent({ type: 'homegesture-disabled' });
      assert.isTrue(stubBroadcastMessage.calledWith('homegesture-disabled'));
    });

    test('Orientation change', function() {
      Service.mTopMostUI = appWindowManager;
      var stubBroadcastMessage =
        this.sinon.stub(appWindowManager, 'broadcastMessage');
      appWindowManager.handleEvent({ type: 'orientationchange' });
      assert.isTrue(stubBroadcastMessage.calledWith('orientationchange', true));
    });

    test('Press home on home displayed', function() {
      injectRunningApps(home);
      var stubGetHomescreen = this.sinon.stub(homescreenWindowManager,
                                              'getHomescreen');
      appWindowManager._activeApp = homescreenWindowManager.mHomescreenWindow;
      this.sinon.stub(MockFtuLauncher, 'respondToHierarchyEvent').returns(true);
      appWindowManager.respondToHierarchyEvent({ type: 'home' });
      assert.isTrue(stubGetHomescreen.called,
        'press home on home displayed should still call getHomescreen()');
      // check the first argument of first call.
      assert.isTrue(stubGetHomescreen.calledWith(true),
        'getHomescreen should be called with true as argument in this case.');
    });

    test('Press home on home not displayed', function() {
      injectRunningApps(home, app1);
      var stubDisplay = this.sinon.stub(appWindowManager, 'display');
      appWindowManager._activeApp = app1;
      this.sinon.stub(MockFtuLauncher, 'respondToHierarchyEvent').returns(true);
      appWindowManager.respondToHierarchyEvent({ type: 'home' });
      assert.isTrue(stubDisplay.called);
    });

    test('Press home but ftu launcher blocks it', function() {
      injectRunningApps(home, app1);
      var stubDisplay = this.sinon.stub(appWindowManager, 'display');
      appWindowManager._activeApp = app1;
      this.sinon.stub(MockFtuLauncher, 'respondToHierarchyEvent')
          .returns(false);
      appWindowManager.respondToHierarchyEvent({ type: 'home' });
      assert.isFalse(stubDisplay.called);
    });

    test('app is killed at background', function() {
      injectRunningApps(app1, app2);
      appWindowManager._activeApp = app2;

      appWindowManager.handleEvent({ type: 'appterminated', detail: app2 });
      assert.isFalse(app2.instanceID in appWindowManager._apps);
    });

    test('app is killed at foreground', function() {
      injectRunningApps(app1, app2);
      appWindowManager._activeApp = app1;

      appWindowManager.handleEvent({ type: 'appterminated', detail: app1 });
      assert.isFalse(app1.instanceID in appWindowManager._apps);
    });

    test('new app instance is created', function() {
      injectRunningApps();

      appWindowManager.handleEvent({ type: 'appcreated', detail: app1 });
      assert.isTrue(app1.instanceID in appWindowManager._apps);
    });

    test('FTU is skipped', function() {
      injectRunningApps();
      var stubDisplay = this.sinon.stub(appWindowManager, 'display');

      appWindowManager.handleEvent({ type: 'ftuskip' });
      assert.isTrue(stubDisplay.calledWith());
    });

    test('FTU is skipped when lockscreen is active', function() {
      Service.locked = true;
      injectRunningApps();
      var stubDisplay = this.sinon.stub(appWindowManager, 'display');

      appWindowManager.handleEvent({ type: 'ftuskip' });
      assert.isFalse(stubDisplay.calledWith());
      Service.locked = false;
    });

    test('FTU is skipped when active app is not homescreen', function() {
      injectRunningApps(app1);
      appWindowManager._activeApp = app1;
      var stubDisplay = this.sinon.stub(appWindowManager, 'display');

      appWindowManager.handleEvent({ type: 'ftuskip' });
      assert.isFalse(stubDisplay.calledWith());
    });

    test('System resize', function() {
      appWindowManager._activeApp = app1;
      var stubResize = this.sinon.stub(app1, 'resize');

      appWindowManager.respondToHierarchyEvent({ type: 'system-resize' });
      assert.isTrue(stubResize.called);
    });

    suite('when a document is fullscreen', function() {
      var realFullScreen;

      setup(function() {
        realFullScreen = document.mozFullScreen;
        Object.defineProperty(document, 'mozFullScreen', {
          configurable: true,
          get: function() { return true; }
        });
      });

      teardown(function() {
        Object.defineProperty(document, 'mozFullScreen', {
          configurable: true,
          get: function() { return realFullScreen; }
        });
      });

      test('should exit fullscreen when the sheet gesture begins',
      function() {
        var cancelSpy = this.sinon.spy(document, 'mozCancelFullScreen');
        appWindowManager.handleEvent({ type: 'sheets-gesture-begin' });
        sinon.assert.calledOnce(cancelSpy);
      });
    });

    test('app request to close', function() {
      injectRunningApps(app1);
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(true);
      var stubDisplay = this.sinon.stub(appWindowManager, 'display');

      appWindowManager.handleEvent({ type: 'apprequestclose', detail: app1 });
      assert.isTrue(stubDisplay.calledWith());
    });

    test('app request to open', function() {
      injectRunningApps(app1);

      var stubDisplay = this.sinon.stub(appWindowManager, 'display');

      appWindowManager.handleEvent({ type: 'apprequestopen', detail: app1 });
      assert.isTrue(stubDisplay.calledWith(app1));
    });

    test('homescreen is created', function() {
      injectRunningApps();

      appWindowManager.handleEvent({ type: 'homescreencreated', detail: home });
      assert.isTrue(home.instanceID in
        appWindowManager._apps);
    });

    test('homescreen is changed', function() {
      var stubDisplay = this.sinon.stub(appWindowManager, 'display');

      appWindowManager.handleEvent(
        { type: 'homescreen-changed', detail: app1 });
      assert.isTrue(stubDisplay.calledWith());
    });

    test('kill app', function() {
      var stubKill = this.sinon.stub(appWindowManager, 'kill');

      appWindowManager.handleEvent({ type: 'killapp', detail: app1 });
      assert.isTrue(stubKill.called);
    });

    test('app uninstalled', function() {
      var stubKill = this.sinon.stub(appWindowManager, 'kill');

      appWindowManager.handleEvent({ type: 'applicationuninstall',
        detail: {
          application: app1
        }
      });
      assert.isTrue(stubKill.called);
    });

    test('display app', function() {
      injectRunningApps(app1);

      var stubDisplay = this.sinon.stub(appWindowManager, 'display');

      appWindowManager.handleEvent({ type: 'displayapp', detail: app1 });
      assert.isTrue(stubDisplay.calledWith(app1));

    });

    test('Launch app', function() {
      var stubLaunch =
        this.sinon.stub(appWindowManager, 'launch');

      appWindowManager.handleEvent(
        { type: 'launchapp', detail: fakeAppConfig1 });
      assert.isTrue(stubLaunch.calledWith(fakeAppConfig1));
    });

    test('Show top window', function() {
      injectRunningApps(app1);
      appWindowManager._activeApp = app1;
      var stubSetVisible = this.sinon.stub(app1, 'setVisible');

      appWindowManager.handleEvent({
        type: 'showwindow'
      });

      assert.isTrue(stubSetVisible.calledWith(true));
    });

    test('Show top window than fire activity when there is an request',
    function() {
      injectRunningApps(app1);
      appWindowManager._activeApp = app1;
      var stubSetVisible = this.sinon.stub(app1, 'setVisible');
      var stubActivity = this.sinon.stub();
      var originalActivity = window.MozActivity;
      window.MozActivity = stubActivity;

      appWindowManager.handleEvent({
        type: 'showwindow',
        detail: {
          activity: {
            name: 'record',
            data: {
              type: 'photos'
            }
          }
        }
      });

      assert.isTrue(stubSetVisible.calledWith(true));
      assert.isTrue(stubActivity.called,
        'it didn\'t invoke the activity');
      window.MozActivity = originalActivity;
    });

    test('Show top window than fire notification event when the request comes',
    function() {
      injectRunningApps(app1);
      appWindowManager._activeApp = app1;
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent'),
          stubInitCustomEvent =
          function(type, flag1, flag2, content) {
            // Assume the API event would be fired.
            assert.equal('mozContentNotificationEvent', type);
            assert.equal(true, flag1);
            assert.equal(true, flag2);
            assert.equal('desktop-notification-click', content.type);
            assert.equal('foobar', content.id);
          },
          stubCustomEvent = this.sinon.stub(window, 'CustomEvent',
          function(type, content) {
            // Assume the custome event would be fired.
            assert.equal('notification-clicked', type);
            assert.equal('foobar', content.detail.id);
          }),
          stubCreateEvent = this.sinon.stub(document, 'createEvent',
          function() {
            return {
              initCustomEvent: stubInitCustomEvent
            };
          });
      var stubSetVisible = this.sinon.stub(app1, 'setVisible');

      appWindowManager.handleEvent({
        type: 'showwindow',
        detail: {
          notificationId: 'foobar'
        }
      });

      assert.isTrue(stubSetVisible.calledWith(true));
      stubDispatchEvent.restore();  // For linter.
      stubCreateEvent.restore();
      stubCustomEvent.restore();
    });

    test('Hide top window', function() {
      injectRunningApps(app1);
      appWindowManager._activeApp = app1;
      var stubBroadcast = this.sinon.stub(app1, 'broadcast');

      appWindowManager.handleEvent({
        type: 'hidewindow',
        detail: app2
      });

      assert.isTrue(stubBroadcast.calledWith('hidewindow', app2));
    });

    test('Show for screen reader top window', function() {
      injectRunningApps(app1);
      appWindowManager._activeApp = app1;
      var stubSetVisibleForScreenReader = this.sinon.stub(app1,
        'setVisibleForScreenReader');

      appWindowManager.handleEvent({
        type: 'showwindowforscreenreader'
      });

      assert.isTrue(stubSetVisibleForScreenReader.calledWith(true));
    });

    test('Sends sheetsgesturebegin and sheetsgestureend when expected',
    function() {
      injectRunningApps(app1);
      appWindowManager._activeApp = app1;

      var stubBroadcast = this.sinon.stub(app1, 'broadcast');

      // Should send sheetsgesturebegin.
      appWindowManager.handleEvent({ type: 'sheets-gesture-begin' });
      assert.isTrue(stubBroadcast.calledWith('sheetsgesturebegin'));
      stubBroadcast.reset();

      // Should send sheetsgestureend.
      appWindowManager.handleEvent({type: 'sheets-gesture-end'});
      assert.isTrue(stubBroadcast.calledWith('sheetsgestureend'));
      stubBroadcast.reset();
    });

    test('Hide for screen reader top window', function() {
      injectRunningApps(app1);
      appWindowManager._activeApp = app1;
      var stubSetVisibleForScreenReader = this.sinon.stub(app1,
        'setVisibleForScreenReader');

      appWindowManager.handleEvent({
        type: 'hidewindowforscreenreader'
      });

      assert.isTrue(stubSetVisibleForScreenReader.calledWith(false));
    });

    test('Overlay start on top of in process app', function() {
      injectRunningApps(app6);
      appWindowManager._activeApp = app6;
      var stubIsOOP = this.sinon.stub(app6, 'isOOP');
      stubIsOOP.returns(false);
      var stubSetVisible = this.sinon.stub(app6, 'setVisible');

      appWindowManager.handleEvent({ type: 'attentionopened' });
      assert.isTrue(stubSetVisible.calledWith(false));
    });

    test('Overlay start on top of OOP app', function() {
      injectRunningApps(app1);
      appWindowManager._activeApp = app1;
      var stubBlur = this.sinon.stub(app1, 'blur');

      appWindowManager.handleEvent({ type: 'attentionopened' });
      assert.isTrue(stubBlur.called);
    });
  });

  suite('Kill()', function() {
    test('kill()', function() {
      injectRunningApps(app1);
      var stubKill = this.sinon.stub(app1, 'kill');

      appWindowManager.kill(app1.origin);
      assert.isTrue(stubKill.called);
    });
  });

  suite('updateActiveApp()', function() {
    test('update', function() {
      var spyPublish= this.sinon.spy(appWindowManager, 'publish');
      injectRunningApps(app1, app2, app3, app4);
      appWindowManager.shrinkingUI = new MockShrinkingUI();
      var stubStart = this.sinon.stub(appWindowManager.shrinkingUI, 'start');
      appWindowManager.shrinkingUI.mActive = true;
      appWindowManager._activeApp = app2;
      appWindowManager._updateActiveApp(app1.instanceID);
      assert.equal(spyPublish.firstCall.args[0], 'activeappchanged');
      assert.deepEqual(appWindowManager._activeApp, app1);
      assert.isFalse(stubStart.calledOnce);
    });

    test('should not publish activeappchanged if activeApp is the same',
      function() {
        var spyPublish= this.sinon.spy(appWindowManager, 'publish');
        injectRunningApps(app1);
        appWindowManager._activeApp = app1;
        appWindowManager._updateActiveApp(app1.instanceID);
        assert.isFalse(spyPublish.calledWith('activeappchanged'));
      });


    test('should resize the new active app', function() {
      injectRunningApps(app1, app2, app3, app4);
      appWindowManager._activeApp = app2;

      var resizeSpy = this.sinon.spy(app1, 'resize');
      appWindowManager._updateActiveApp(app1.instanceID);
      sinon.assert.calledOnce(resizeSpy);
    });
  });

  suite('Display()', function() {
    test('FTU', function() {
      var app = new AppWindow(fakeFTUConfig);
      injectRunningApps(app);
      appWindowManager._activeApp = null;
      var stubReady = this.sinon.stub(app, 'ready');
      appWindowManager.display(app);
      stubReady.yield();
      assert.equal(appWindowManager._activeApp, app);
    });

    test('app to app', function() {
      var stub_updateActiveApp = this.sinon.stub(appWindowManager,
        '_updateActiveApp');
      injectRunningApps(app1, app2);
      appWindowManager._activeApp = app1;
      var stubSwitchApp = this.sinon.stub(appWindowManager, 'switchApp');
      var spySendStopRecording = this.sinon.spy(appWindowManager,
                                                'sendStopRecordingRequest');

      appWindowManager.display(app2);
      assert.isTrue(spySendStopRecording.calledOnce);
      assert.isTrue(stubSwitchApp.called);
      assert.deepEqual(stubSwitchApp.getCall(0).args[0], app1);
      assert.deepEqual(stubSwitchApp.getCall(0).args[1], app2);
      assert.isTrue(stub_updateActiveApp.called);
    });

    test('Continunous app open requests', function() {
      injectRunningApps(home, app1, app2);
      appWindowManager._activeApp = home;

      appWindowManager.display(app1);
      appWindowManager.display(app2);

      assert.deepEqual(appWindowManager._activeApp, app2);
    });

    test('Ensuring the rocketbar transition', function() {
      injectRunningApps(home, app1, app2);
      appWindowManager._activeApp = home;
      appWindowManager.display(app1);

      rocketbar.active = true;
      this.sinon.spy(appWindowManager, 'switchApp');
      appWindowManager.display(app2);
      sinon.assert.notCalled(appWindowManager.switchApp);
      window.dispatchEvent(new CustomEvent('rocketbar-overlayclosed'));
      sinon.assert.calledOnce(appWindowManager.switchApp);
    });
  });

  suite('Switch app', function() {
    test('home to app', function() {
      injectRunningApps(home, app1);
      appWindowManager._activeApp = home;


      this.sinon.stub(app1, 'reviveBrowser');
      var stubReady = this.sinon.stub(app1, 'ready');
      var stubAppNextOpen = this.sinon.stub(app1, 'open');
      var stubAppCurrentClose = this.sinon.stub(home, 'close');
      appWindowManager.switchApp(home, app1);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.called);
      assert.isTrue(app1.reviveBrowser.called);
    });

    test('home to an app killed while opening', function() {
      injectRunningApps(home, app1);
      appWindowManager._activeApp = home;
      this.sinon.stub(app1, 'isDead').returns(true);

      var stub_updateActiveApp = this.sinon.stub(appWindowManager,
        '_updateActiveApp');
      var stubReady = this.sinon.stub(app1, 'ready');
      var stubAppCurrentClose = this.sinon.stub(home, 'close');
      appWindowManager.switchApp(home, app1);
      stubReady.yield();
      assert.isFalse(stubAppCurrentClose.called);
      assert.isTrue(stub_updateActiveApp.called);
    });

    test('app to home', function() {
      injectRunningApps(home, app1);
      appWindowManager._activeApp = app1;
      var stubReady = this.sinon.stub(home, 'ready');
      var stubAppNextOpen = this.sinon.stub(home, 'open');
      var stubAppCurrentClose = this.sinon.stub(app1, 'close');
      appWindowManager.switchApp(app1, home);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.called);
    });

    test('app to home, and home is dead', function() {
      injectRunningApps(home, app1);
      appWindowManager._activeApp = app1;
      var stubGetHomescreen =
        this.sinon.stub(homescreenWindowManager, 'getHomescreen');
      stubGetHomescreen.returns(home);
      var stubReady = this.sinon.stub(home, 'ready');

      this.sinon.stub(home, 'isDead').returns(true);
      appWindowManager.switchApp(app1, home);
      stubReady.yield();
      assert.isTrue(stubGetHomescreen.called);
    });

    test('lockscreen to home', function() {
      injectRunningApps(home);
      appWindowManager._activeApp = null;
      var stubReady = this.sinon.stub(home, 'ready');
      var stubAppNextOpen = this.sinon.stub(home, 'open');
      appWindowManager.switchApp(null, home);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.calledWith('immediate'));
    });

    test('app to app', function() {
      injectRunningApps(app1, app2);
      appWindowManager._activeApp = app1;
      var stubReady = this.sinon.stub(app2, 'ready');
      var stubAppNextOpen = this.sinon.stub(app2, 'open');
      var stubAppCurrentClose = this.sinon.stub(app1, 'close');
      appWindowManager.switchApp(app1, app2, true);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.called);
      assert.isTrue(stubAppNextOpen.calledWith('invoked'));
      assert.isTrue(stubAppCurrentClose.calledWith('invoking'));
    });

    test('close app to cardsview', function() {
      injectRunningApps(app1, home);
      appWindowManager._activeApp = app1;
      var stubReady = this.sinon.stub(home, 'ready');
      var stubAppNextOpen = this.sinon.stub(home, 'open');
      var stubAppCurrentClose = this.sinon.stub(app1, 'close');
      appWindowManager.switchApp(app1, home, false, null, 'to-cardview');
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.calledWith('to-cardview'));
    });

    test('open app from cardsview', function() {
      injectRunningApps(app1, home);
      appWindowManager._activeApp = app1;
      var stubReady = this.sinon.stub(app1, 'ready');
      var stubAppNextOpen = this.sinon.stub(app1, 'open');
      var stubAppCurrentClose = this.sinon.stub(home, 'close');
      appWindowManager.switchApp(home, app1, false, 'from-cardview', null);
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
      appWindowManager.broadcastMessage('fake-message');
      assert.isTrue(stubApp1broadcast.called);
      assert.isTrue(stubApp2broadcast.calledWith('fake-message', undefined));
      assert.isTrue(stubApp3broadcast.calledWith('fake-message', undefined));
    });
  });

  test('launchTrustedWindow', function() {
    var testDetail = 'testdetail';
    appWindowManager._activeApp = app1;
    var stubBroadcast = this.sinon.stub(app1, 'broadcast');
    appWindowManager._launchTrustedWindow({ detail: testDetail});
    assert.isTrue(stubBroadcast.calledWith('launchtrusted', testDetail));
  });

  suite('Launch()', function() {
    test('Launch app1', function() {
      var stubDisplay = this.sinon.stub(appWindowManager, 'display');
      injectRunningApps();
      appWindowManager.launch(fakeAppConfig1);
      assert.isTrue(stubDisplay.called);
    });

    test('Launch app1 which is already launched', function() {
      var stubDisplay = this.sinon.stub(appWindowManager, 'display');
      injectRunningApps(app1);
      appWindowManager.launch(fakeAppConfig1);
      assert.isTrue(stubDisplay.called);
    });

    test('Launch background app', function() {
      var stubDisplay = this.sinon.stub(appWindowManager, 'display');
      injectRunningApps();
      appWindowManager.launch(fakeAppConfig4Background);
      assert.isFalse(stubDisplay.called);
    });

    test('Launch app is running and change URL', function() {
      injectRunningApps(app5);
      var stubDisplay = this.sinon.stub(appWindowManager, 'display');
      var stubChangeURL = this.sinon.stub(app5, 'modifyURLatBackground');
      appWindowManager.launch(fakeAppConfig5Background);
      assert.isTrue(stubChangeURL.called);
      assert.isFalse(stubDisplay.called);
    });

    test('Launch app is not running and change URL', function() {
      injectRunningApps(app1, app2, app3, app5);
      var stubDisplay = this.sinon.stub(appWindowManager, 'display');
      appWindowManager.launch(fakeAppConfig5Background);
      assert.isFalse(stubDisplay.called);
    });

    test('Launch an activity app', function() {
      injectRunningApps(app1, app7);
      appWindowManager._updateActiveApp(app1.instanceID);

      var stubDisplay = this.sinon.stub(appWindowManager, 'display');
      appWindowManager.launch(fakeAppConfig7Activity);

      assert.isTrue(stubDisplay.called);
      assert.equal(app7.callerWindow, app1);
      assert.equal(app1.calleeWindow, app7);
    });
  });

  suite('Settings change', function() {
    test('app-suspending.enabled', function() {
      var stubBroadcastMessage =
        this.sinon.stub(appWindowManager, 'broadcastMessage');
      MockSettingsListener.mCallbacks['app-suspending.enabled'](false);
      assert.ok(stubBroadcastMessage.calledWith('kill_suspended'));
    });

    test('continuous-transition.enabled', function() {
      MockSettingsListener.mCallbacks['continuous-transition.enabled'](true);
      assert.isTrue(appWindowManager.continuousTransition);
    });
  });

  suite('linkWindowActivity', function() {
    var fakeAppConfig = Object.create(fakeAppConfig7Activity);

    setup(function() {
      // we fake getHomescreen as app2
      this.sinon.stub(homescreenWindowManager, 'getHomescreen').returns(app2);
    });

    test('Whatever caller is, we would go back to original app',
      function() {
        // callee is app7, caller is app2
        injectRunningApps(app7);
        appWindowManager._activeApp = app1;
        this.sinon.stub(app1, 'getTopMostWindow').returns(app2);

        appWindowManager.linkWindowActivity(fakeAppConfig);

        assert.deepEqual(app2.calleeWindow, app7);
        assert.deepEqual(app7.callerWindow, app2);
        assert.isFalse(homescreenWindowManager.getHomescreen.called);
    });

    test('If there is a direct circular activity, ' +
          'close the frontwindow to reveal the callee',
      function() {
        // callee is app1, caller is app3(a front window)
        injectRunningApps(app1);
        appWindowManager._activeApp = app1;
        fakeAppConfig.parentApp = '';
        app1.frontWindow = app3;
        this.sinon.stub(app1, 'getTopMostWindow').returns(app3);
        this.sinon.stub(app3, 'getBottomMostWindow').returns(app1);
        var stubKill = this.sinon.stub(app3, 'kill');

        appWindowManager.linkWindowActivity(fakeAppConfig1);

        assert.isTrue(stubKill.called);
        assert.isUndefined(app1.callerWindow);
        app1.frontWindow = null;
    });
  });

  test('getApp', function() {
    injectRunningApps(app1, app2, app3, app4);
    assert.deepEqual(appWindowManager.getApp('app://www.fake2'), app2);
    assert.isNull(appWindowManager.getApp('app://no-this-origin'));
  });

  test('new browser window for getApp', function() {
    injectRunningApps(app5);
    var newApp1 = appWindowManager.getApp(fakeAppConfig5Background.origin);
    assert.deepEqual(newApp1.config, fakeAppConfig5Background);

    var newApp2 = appWindowManager.getApp(fakeBrowserConfig.origin);
    assert.deepEqual(newApp2, null);

    injectRunningApps(browser1);
    newApp2 = appWindowManager.getApp(fakeBrowserConfig.origin);
    assert.deepEqual(newApp2.config, fakeBrowserConfig);
  });

  test('getAppByURL', function() {

    var url1 = fakeBrowserConfig.url;
    var url2 = 'http://mozilla.org/page2';

    injectRunningApps(browser1);
    assert.deepEqual(appWindowManager.getAppByURL(url1), browser1);
    assert.isNull(appWindowManager.getAppByURL('app://no-this-origin'));

    // Change url in the browser and ensure we can find it again
    browser1.config.url = url2;

    assert.deepEqual(appWindowManager.getAppByURL(url2), browser1);
    assert.isNull(appWindowManager.getAppByURL(url1));
  });

  suite('Hierarchy functions', function() {
    setup(function() {
      window.appWindowFactory = MockAppWindowFactory;
      window.WrapperFactory = MockWrapperFactory;
    });

    teardown(function() {
      window.appWindowFactory = null;
      window.WrapperFactory = null;
    });

    test('getActiveWindow', function() {
      appWindowManager._activeApp = app1;
      assert.equal(appWindowManager.getActiveWindow(), app1);
    });

    test('setHierarchy', function() {
      this.sinon.stub(MockWrapperFactory, 'isLaunchingWindow').returns(false);
      this.sinon.stub(MockAppWindowFactory, 'isLaunchingWindow').returns(false);
      appWindowManager._activeApp = app1;
      this.sinon.stub(app1, 'focus');
      this.sinon.stub(app1, 'blur');
      this.sinon.stub(app1, 'setVisibleForScreenReader');
      this.sinon.stub(app1, 'setNFCFocus');
      appWindowManager.setHierarchy(true);
      assert.isTrue(app1.focus.called);
      assert.isTrue(app1.setVisibleForScreenReader.calledWith(true));
      assert.isTrue(app1.setNFCFocus.calledWith(true));

      appWindowManager.setHierarchy(false);
      assert.isTrue(app1.blur.calledOnce);
      assert.isTrue(app1.setVisibleForScreenReader.calledWith(false));
    });

    test('setHierarchy(true) while launching a new window', function() { 
      this.sinon.stub(MockWrapperFactory, 'isLaunchingWindow').returns(true);
      this.sinon.stub(MockAppWindowFactory, 'isLaunchingWindow').returns(false);
      appWindowManager._activeApp = app1;
      this.sinon.stub(app1, 'focus');

      appWindowManager.setHierarchy(true);
      assert.isFalse(app1.focus.called);
    });
      
    test('setHierarchy', function() {
      appWindowManager._activeApp = app1;
      this.sinon.stub(app1, 'focus');
      this.sinon.stub(app1, 'blur');
      this.sinon.stub(app1, 'setVisibleForScreenReader');
      this.sinon.stub(app1, 'setNFCFocus');
      appWindowManager.setHierarchy(true);
      assert.isTrue(app1.focus.called);
      assert.isTrue(app1.setVisibleForScreenReader.calledWith(true));
      assert.isTrue(app1.setNFCFocus.calledWith(true));

      appWindowManager.setHierarchy(false);
      assert.isTrue(app1.blur.calledOnce);
      assert.isTrue(app1.setVisibleForScreenReader.calledWith(false));
    });

    test('focus is redirected', function() {
      appWindowManager._activeApp = app1;
      this.sinon.stub(app1, 'focus');
      appWindowManager.focus();
      assert.isTrue(app1.focus.called);
    });

    test('Should publish activated', function() {
      this.sinon.stub(appWindowManager, 'publish');
      injectRunningApps(app1);
      appWindowManager._activeApp = null;
      window.dispatchEvent(new CustomEvent('appopened', {
        detail: app1
      }));
      assert.isTrue(appWindowManager.publish.calledWith(
        appWindowManager.EVENT_PREFIX + '-activated'));
    });

    test('Should publish deactivated', function() {
      this.sinon.stub(appWindowManager, 'publish');
      injectRunningApps(app1);
      appWindowManager._activeApp = app1;
      window.dispatchEvent(new CustomEvent('taskmanager-activated'));
      assert.isTrue(appWindowManager.publish.calledWith(
        appWindowManager.EVENT_PREFIX + '-deactivated'));
    });

    suite('isActive', function() {
      test('No active app', function() {
        appWindowManager._activeApp = null;
        assert.isFalse(appWindowManager.isActive());
      });

      test('There is active app', function() {
        appWindowManager._activeApp = app1;
        this.sinon.stub(app1, 'isActive').returns(true);
        assert.isTrue(appWindowManager.isActive());
      });

      test('There is active app but it is closed', function() {
        appWindowManager._activeApp = app1;
        this.sinon.stub(app1, 'isActive').returns(false);
        this.sinon.stub(window.taskManager, 'isActive').returns(true);
        assert.isFalse(appWindowManager.isActive());
      });
    });
  });
});
