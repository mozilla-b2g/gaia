/* global AppWindow, MockShrinkingUI, HomescreenWindow, MocksHelper,
          MockRocketbar, MockTaskManager, MockFtuLauncher, MockWrapperFactory,
          MockAppWindowFactory,
          MockService, MockNavigatorSettings, BaseModule */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
require('/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_activity_window.js');
requireApp('system/test/unit/mock_keyboard_manager.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
requireApp('system/test/unit/mock_software_button_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_homescreen_window_manager.js');
requireApp('system/test/unit/mock_nfc_handler.js');
requireApp('system/test/unit/mock_rocketbar.js');
requireApp('system/test/unit/mock_task_manager.js');
requireApp('system/shared/test/unit/mocks/mock_shrinking_ui.js');
requireApp('system/test/unit/mock_wrapper_factory.js');
requireApp('system/test/unit/mock_app_window_factory.js');
requireApp('shared/js/lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/app_window_manager.js');
requireApp('system/js/settings_core.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');

var mocksForAppWindowManager = new MocksHelper([
  'OrientationManager', 'ActivityWindow', 'ShrinkingUI',
  'Applications',
  'ManifestHelper', 'KeyboardManager', 'SoftwareButtonManager',
  'HomescreenWindow', 'AppWindow', 'LayoutManager', 'NfcHandler',
  'TaskManager', 'NavigatorSettings', 'LazyLoader'
]).init();

suite('system/AppWindowManager', function() {
  mocksForAppWindowManager.attachTestHelpers();
  var app1, app2, app3, app4, app5, app6, app7, browser1, home;
  var subject;
  var settingsCore, realMozSettings;

  var screenElement = document.createElement('div');

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    this.sinon.stub(document, 'getElementById', function(id) {
      if (id === 'screen') {
        return screenElement;
      }

      return document.createElement('div');
    });

    window.layoutManager = new window.LayoutManager();
    window.mediaRecording = { isRecording: false };

    home = new HomescreenWindow('fakeHome');
    MockService.mockQueryWith('getHomescreen', home);

    app1 = new AppWindow(fakeAppConfig1);
    app2 = new AppWindow(fakeAppConfig2);
    app3 = new AppWindow(fakeAppConfig3);
    app4 = new AppWindow(fakeAppConfig4Background);
    app5 = new AppWindow(fakeAppConfig5Background);
    app6 = new AppWindow(fakeAppConfig6Browser);
    app7 = new AppWindow(fakeAppConfig7Activity);
    browser1 = new AppWindow(fakeBrowserConfig);

    settingsCore = BaseModule.instantiate('SettingsCore');
    settingsCore.start();

    subject = BaseModule.instantiate('AppWindowManager');
    subject.start();
    subject.service = MockService;
  });

  teardown(function() {
    subject.stop();
    settingsCore.stop();
    delete window.layoutManager;
    delete window.mediaRecording;
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

  var fakeActivityConfigInline = {
    url: 'app://www.fake8/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake8/ManifestURL',
    origin: 'app://www.fake8',
    isActivity: true,
    parentApp: '',
    inline: true
  };

  var fakeBrowserConfig = {
    url: 'http://mozilla.org/index.html',
    manifest: {},
    origin: 'http://mozilla.org'
  };

  function injectRunningApps() {
    subject._apps = {};
    Array.slice(arguments).forEach(function iterator(app) {
      subject._apps[app.instanceID] = app;
    });
  }

  test('Get active app when _activeApp is null', function() {
    subject._activeApp = null;
    assert.deepEqual(subject.getActiveApp(), home,
      'should return home app');
  });

  suite('Handle events', function() {
    test('hierarchytopmostwindowchanged', function() {
      this.sinon.stub(app1, 'setNFCFocus');
      subject._activeApp = app1;
      MockService.mockQueryWith('getTopMostUI', subject);
      subject.handleEvent({
        type: 'hierarchytopmostwindowchanged'
      });
      assert.isTrue(app1.setNFCFocus.calledWith(true));
    });

    test('should not setNFCFocus when top most is not us', function() {
      this.sinon.stub(app3, 'setNFCFocus');
      subject._activeApp = app3;
      MockService.mockQueryWith('getTopMostUI', MockRocketbar);
      subject.handleEvent({
        type: 'hierarchytopmostwindowchanged'
      });
      assert.isFalse(app3.setNFCFocus.calledWith(true));
    });

    test('localized event should be broadcasted.', function() {
      var stubBroadcastMessage =
        this.sinon.stub(subject, 'broadcastMessage');
      subject.handleEvent({
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
      var stubLaunchTrustedWindow = this.sinon.stub(subject,
        '_launchTrustedWindow');
      subject.handleEvent(testEvt);
      assert.isTrue(stubLaunchTrustedWindow.calledWith(testEvt));
    });

    test('Active app should be updated once any app is opening.', function() {
      var stub_updateActiveApp = this.sinon.stub(subject,
        '_updateActiveApp');
      injectRunningApps(app1, app2);
      subject._activeApp = app1;
      subject.handleEvent({
        type: 'appopening',
        detail: app2
      });
      assert.isTrue(stub_updateActiveApp.calledWith(app2.instanceID));
    });

    test('Active app should be updated once any app is opened.', function() {
      var stub_updateActiveApp = this.sinon.stub(subject,
        '_updateActiveApp');
      injectRunningApps(app1, app2);
      subject._activeApp = app1;
      subject.handleEvent({
        type: 'appopened',
        detail: app2
      });
      assert.isTrue(stub_updateActiveApp.calledWith(app2.instanceID));
    });

    test('Active app should be updated once homescreen is opened.', function() {
      var stub_updateActiveApp = this.sinon.stub(subject,
        '_updateActiveApp');
      injectRunningApps(app1, home);
      subject._activeApp = app1;
      subject.handleEvent({
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
        subject._activeApp = app1;
        subject.respondToHierarchyEvent({
          type: 'mozChromeEvent',
          detail: detail
        });
        assert.isTrue(stubInputMethodContextChange.calledWith(
          'inputmethod-contextchange', detail));
      });

    test('When receiving shrinking-start, we need to blur the active app',
      function() {
        var stubFocus = this.sinon.stub(app1, 'broadcast');
        MockService.mockQueryWith('getTopMostUI', subject);
        subject._activeApp = app1;

        window.dispatchEvent(new CustomEvent('shrinking-start'));
        assert.deepEqual(subject.shrinkingUI.elements
          .foregroundElement, app1.getBottomMostWindow().element);
        assert.deepEqual(subject.shrinkingUI.elements
          .backgroundElement, app1.getBottomMostWindow().element.parentNode);
        assert.isTrue(subject.shrinkingUI.mStarted);
        assert.isTrue(stubFocus.calledWith('shrinkingstart'));
      });

    test('When receiving shrinking-start and top-most ui is not ' +
         'subject',
      function() {
        var stubFocus = this.sinon.stub(app1, 'broadcast');
        subject._activeApp = app1;
        MockService.mockQueryWith('getTopMostUI', {
          name: 'UtilityTray'
        });
        window.dispatchEvent(new CustomEvent('shrinking-start'));
        assert.isFalse(stubFocus.calledWith('shrinkingstart'));
      });

    test('When receiving shrinking-stop, we need to focus the active app',
      function() {
        var stubFocus = this.sinon.stub(app1, 'broadcast');
        subject._activeApp = app1;
        subject.shrinkingUI = new MockShrinkingUI();
        subject.shrinkingUI.mActive = true;
        window.dispatchEvent(new CustomEvent('shrinking-stop'));
        assert.isTrue(stubFocus.calledWith('shrinkingstop'));
      });

    test('When permission dialog is closed, we need to focus the active app',
      function() {
        var stubFocus = this.sinon.stub(app1, 'broadcast');
        subject._activeApp = app1;
        window.dispatchEvent(new CustomEvent('permissiondialoghide'));
        assert.isTrue(stubFocus.calledWith('focus'));
      });

    test('If cardview will open, keyboard should be dismissed', function() {
      var stubBlur = this.sinon.stub(app1, 'blur');
      this.sinon.stub(app1, 'getTopMostWindow').returns(app1);
      subject._activeApp = app1;
      subject.handleEvent({
        type: 'cardviewbeforeshow'
      });
      assert.isTrue(stubBlur.called);
    });

    test('Should broadcast cardview events to apps', function() {
      var stubBroadcastMessage =
        this.sinon.stub(subject, 'broadcastMessage');

      subject.handleEvent({ type: 'cardviewbeforeshow' });
      assert.isTrue(stubBroadcastMessage.calledWith('cardviewbeforeshow'));

      subject.handleEvent({ type: 'cardviewshown' });
      assert.isTrue(stubBroadcastMessage.calledWith('cardviewshown'));

      subject.handleEvent({ type: 'cardviewclosed' });
      assert.isTrue(stubBroadcastMessage.calledWith('cardviewclosed'));
    });

    test('Home Gesture enabled', function() {
      var stubBroadcastMessage =
        this.sinon.stub(subject, 'broadcastMessage');
      subject.handleEvent({ type: 'homegesture-enabled' });
      assert.isTrue(stubBroadcastMessage.calledWith('homegesture-enabled'));
    });

    test('Home Gesture disabled', function() {
      var stubBroadcastMessage =
        this.sinon.stub(subject, 'broadcastMessage');
      subject.handleEvent({ type: 'homegesture-disabled' });
      assert.isTrue(stubBroadcastMessage.calledWith('homegesture-disabled'));
    });

    test('Orientation change', function() {
      MockService.mockQueryWith('getTopMostUI', subject);
      var stubBroadcastMessage =
        this.sinon.stub(subject, 'broadcastMessage');
      subject.handleEvent({ type: 'orientationchange' });
      assert.isTrue(stubBroadcastMessage.calledWith('orientationchange', true));
    });

    test('Press home on home displayed', function() {
      injectRunningApps(home);
      subject._activeApp = home;
      this.sinon.stub(subject, 'switchApp');
      this.sinon.stub(MockFtuLauncher, 'respondToHierarchyEvent').returns(true);
      subject.respondToHierarchyEvent({ type: 'home' });
      assert.isFalse(subject.switchApp.called);
    });

    test('Press home on home not displayed', function() {
      injectRunningApps(home, app1);
      var stubDisplay = this.sinon.stub(subject, 'display');
      subject._activeApp = app1;
      subject.ftuLauncher = MockFtuLauncher;
      this.sinon.stub(MockFtuLauncher, 'respondToHierarchyEvent').returns(true);
      subject.respondToHierarchyEvent({ type: 'home' });
      assert.isTrue(stubDisplay.called);
    });

    test('Press home but ftu launcher blocks it', function() {
      injectRunningApps(home, app1);
      var stubDisplay = this.sinon.stub(subject, 'display');
      subject._activeApp = app1;
      subject.ftuLauncher = MockFtuLauncher;
      this.sinon.stub(MockFtuLauncher, 'respondToHierarchyEvent')
          .returns(false);
      subject.respondToHierarchyEvent({ type: 'home' });
      assert.isFalse(stubDisplay.called);
    });

    test('Press home on home not displayed and shrinking ui is active',
      function() {
        injectRunningApps(home, app1);
        var stubDisplay = this.sinon.stub(subject, 'display');
        subject._activeApp = app1;
        subject.shrinkingUI = new MockShrinkingUI();
        this.sinon.stub(subject.shrinkingUI,
          'respondToHierarchyEvent').returns(true);
        this.sinon.stub(MockFtuLauncher, 'respondToHierarchyEvent')
          .returns(true);
        subject.respondToHierarchyEvent({ type: 'home' });
        assert.isFalse(stubDisplay.called);
      });

    test('app is killed at background', function() {
      injectRunningApps(app1, app2);
      subject._activeApp = app2;

      subject.handleEvent({ type: 'appterminated', detail: app2 });
      assert.isFalse(app2.instanceID in subject._apps);
    });

    test('app is killed at foreground', function() {
      injectRunningApps(app1, app2);
      subject._activeApp = app1;

      subject.handleEvent({ type: 'appterminated', detail: app1 });
      assert.isFalse(app1.instanceID in subject._apps);
    });

    test('new app instance is created', function() {
      injectRunningApps();

      subject.handleEvent({ type: 'appcreated', detail: app1 });
      assert.isTrue(app1.instanceID in subject._apps);
    });

    test('System resize (with waitUntil)', function() {
      subject._activeApp = app1;
      var stubResize = this.sinon.stub(app1, 'resize')
        .returns({ stub: 'promise '});
      var stubWaitUntil = this.sinon.stub();

      subject.respondToHierarchyEvent({
        type: 'system-resize',
        detail: {
          waitUntil: stubWaitUntil
        }
      });
      assert.isTrue(stubResize.called);
      assert.isTrue(stubWaitUntil.calledWith({ stub: 'promise '}));
    });

    test('System resize (without waitUntil)', function() {
      subject._activeApp = app1;
      var stubResize = this.sinon.stub(app1, 'resize');

      subject.respondToHierarchyEvent({
        type: 'system-resize',
        detail: { }
      });
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
        subject.handleEvent({ type: 'sheets-gesture-begin' });
        sinon.assert.calledOnce(cancelSpy);
      });
    });

    test('app request to close', function() {
      injectRunningApps(app1);
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(true);
      var stubDisplay = this.sinon.stub(subject, 'display');

      subject.handleEvent({ type: 'apprequestclose', detail: app1 });
      assert.isTrue(stubDisplay.calledWith());
    });

    test('app request to open', function() {
      injectRunningApps(app1);

      var stubDisplay = this.sinon.stub(subject, 'display');

      subject.handleEvent({ type: 'apprequestopen', detail: app1 });
      assert.isTrue(stubDisplay.calledWith(app1));
    });

    test('homescreen is created', function() {
      injectRunningApps();

      subject.handleEvent({ type: 'homescreencreated', detail: home });
      assert.isTrue(home.instanceID in
        subject._apps);
    });

    test('homescreen is changed', function() {
      var stubDisplay = this.sinon.stub(subject, 'display');

      subject.handleEvent(
        { type: 'homescreen-changed', detail: app1 });
      assert.isTrue(stubDisplay.calledWith());
    });

    test('kill app', function() {
      var stubKill = this.sinon.stub(subject, 'kill');

      subject.handleEvent({ type: 'killapp', detail: app1 });
      assert.isTrue(stubKill.called);
    });

    test('app uninstalled', function() {
      var stubKill = this.sinon.stub(subject, 'kill');

      subject.handleEvent({ type: 'applicationuninstall',
        detail: {
          application: app1
        }
      });
      assert.isTrue(stubKill.called);
    });

    test('display app', function() {
      injectRunningApps(app1);

      var stubDisplay = this.sinon.stub(subject, 'display');

      subject.handleEvent({ type: 'displayapp', detail: app1 });
      assert.isTrue(stubDisplay.calledWith(app1));

    });

    test('Launch activity dispatched on top most window', function() {
      subject._activeApp = app1;
      this.sinon.stub(app1, 'getTopMostWindow').returns(app2);
      this.sinon.stub(app2, 'broadcast');

      subject.handleEvent(
        { type: 'launchactivity', detail: fakeActivityConfigInline });
      assert.isTrue(app2.broadcast.calledWith('launchactivity',
        fakeActivityConfigInline));
    });

    test('Launch app', function() {
      var stubLaunch =
        this.sinon.stub(subject, 'launch');

      subject.handleEvent(
        { type: 'launchapp', detail: fakeAppConfig1 });
      assert.isTrue(stubLaunch.calledWith(fakeAppConfig1));
    });

    test('Show top window', function() {
      injectRunningApps(app1);
      subject._activeApp = app1;
      var stubSetVisible = this.sinon.stub(app1, 'setVisible');

      subject.handleEvent({
        type: 'showwindow'
      });

      assert.isTrue(stubSetVisible.calledWith(true));
    });

    test('Show top window than fire activity when there is an request',
    function() {
      injectRunningApps(app1);
      subject._activeApp = app1;
      var stubSetVisible = this.sinon.stub(app1, 'setVisible');
      var stubActivity = this.sinon.stub();
      var originalActivity = window.MozActivity;
      window.MozActivity = stubActivity;

      subject.handleEvent({
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
      subject._activeApp = app1;
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

      subject.handleEvent({
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
      subject._activeApp = app1;
      var stubBroadcast = this.sinon.stub(app1, 'broadcast');

      subject.handleEvent({
        type: 'hidewindow',
        detail: app2
      });

      assert.isTrue(stubBroadcast.calledWith('hidewindow', app2));
    });

    test('Show for screen reader top window', function() {
      injectRunningApps(app1);
      subject._activeApp = app1;
      var stubSetVisibleForScreenReader = this.sinon.stub(app1,
        'setVisibleForScreenReader');

      subject.handleEvent({
        type: 'showwindowforscreenreader'
      });

      assert.isTrue(stubSetVisibleForScreenReader.calledWith(true));
    });

    test('Sends sheetsgesturebegin and sheetsgestureend when expected',
    function() {
      injectRunningApps(app1);
      subject._activeApp = app1;

      var stubBroadcast = this.sinon.stub(app1, 'broadcast');

      // Should send sheetsgesturebegin.
      subject.handleEvent({ type: 'sheets-gesture-begin' });
      assert.isTrue(stubBroadcast.calledWith('sheetsgesturebegin'));
      stubBroadcast.reset();

      // Should send sheetsgestureend.
      subject.handleEvent({type: 'sheets-gesture-end'});
      assert.isTrue(stubBroadcast.calledWith('sheetsgestureend'));
      stubBroadcast.reset();
    });

    test('Hide for screen reader top window', function() {
      injectRunningApps(app1);
      subject._activeApp = app1;
      var stubSetVisibleForScreenReader = this.sinon.stub(app1,
        'setVisibleForScreenReader');

      subject.handleEvent({
        type: 'hidewindowforscreenreader'
      });

      assert.isTrue(stubSetVisibleForScreenReader.calledWith(false));
    });

    test('Overlay start on top of in process app', function() {
      injectRunningApps(app6);
      subject._activeApp = app6;
      var stubIsOOP = this.sinon.stub(app6, 'isOOP');
      stubIsOOP.returns(false);
      var stubSetVisible = this.sinon.stub(app6, 'setVisible');

      subject.handleEvent({ type: 'attentionopened' });
      assert.isTrue(stubSetVisible.calledWith(false));
    });

    test('Overlay start on top of OOP app', function() {
      injectRunningApps(app1);
      subject._activeApp = app1;
      var stubBlur = this.sinon.stub(app1, 'blur');

      subject.handleEvent({ type: 'attentionopened' });
      assert.isTrue(stubBlur.called);
    });
  });

  suite('Kill()', function() {
    test('kill()', function() {
      injectRunningApps(app1);
      var stubKill = this.sinon.stub(app1, 'kill');

      subject.kill(app1.origin);
      assert.isTrue(stubKill.called);
    });
  });

  suite('updateActiveApp()', function() {
    test('update', function() {
      var spyPublish= this.sinon.spy(subject, 'publish');
      injectRunningApps(app1, app2, app3, app4);
      subject.shrinkingUI = new MockShrinkingUI();
      var stubStart = this.sinon.stub(subject.shrinkingUI, 'start');
      subject.shrinkingUI.mActive = true;
      subject._activeApp = app2;
      subject._updateActiveApp(app1.instanceID);
      assert.equal(spyPublish.firstCall.args[0], 'activeappchanged');
      assert.deepEqual(subject._activeApp, app1);
      assert.isFalse(stubStart.calledOnce);
    });

    test('should not publish activeappchanged if activeApp is the same',
      function() {
        var spyPublish= this.sinon.spy(subject, 'publish');
        injectRunningApps(app1);
        subject._activeApp = app1;
        subject._updateActiveApp(app1.instanceID);
        assert.isFalse(spyPublish.calledWith('activeappchanged'));
      });


    test('should resize the new active app', function() {
      injectRunningApps(app1, app2, app3, app4);
      subject._activeApp = app2;

      var resizeSpy = this.sinon.spy(app1, 'resize');
      subject._updateActiveApp(app1.instanceID);
      sinon.assert.calledOnce(resizeSpy);
    });
  });

  suite('Display()', function() {
    test('FTU', function() {
      var app = new AppWindow(fakeFTUConfig);
      injectRunningApps(app);
      subject._activeApp = null;
      var stubReady = this.sinon.stub(app, 'ready');
      subject.display(app);
      stubReady.yield();
      assert.equal(subject._activeApp, app);
    });

    test('app to app', function() {
      var stub_updateActiveApp = this.sinon.stub(subject,
        '_updateActiveApp');
      injectRunningApps(app1, app2);
      subject._activeApp = app1;
      var stubSwitchApp = this.sinon.stub(subject, 'switchApp');
      var spySendStopRecording = this.sinon.spy(subject,
                                                'stopRecording');

      subject.display(app2);
      assert.isTrue(spySendStopRecording.calledOnce);
      assert.isTrue(stubSwitchApp.called);
      assert.deepEqual(stubSwitchApp.getCall(0).args[0], app1);
      assert.deepEqual(stubSwitchApp.getCall(0).args[1], app2);
      assert.isTrue(stub_updateActiveApp.called);
    });

    test('Continunous app open requests', function() {
      injectRunningApps(home, app1, app2);
      subject._activeApp = home;

      subject.display(app1);
      subject.display(app2);

      assert.deepEqual(subject._activeApp, app2);
    });

    test('Ensuring the rocketbar transition', function() {
      injectRunningApps(home, app1, app2);
      subject._activeApp = home;
      subject.display(app1);

      subject.rocketbar = new MockRocketbar();
      subject.rocketbar.active = true;
      this.sinon.spy(subject, 'switchApp');
      subject.display(app2);
      sinon.assert.notCalled(subject.switchApp);
      window.dispatchEvent(new CustomEvent('rocketbar-overlayclosed'));
      sinon.assert.calledOnce(subject.switchApp);
    });

    test('Go back to the homescreen', function() {
      this.sinon.spy(MockService, 'query');
      subject.display();
      sinon.assert.calledWith(MockService.query, 'getHomescreen', true);
    });
  });

  suite('Switch app', function() {
    test('home to app', function() {
      injectRunningApps(home, app1);
      subject._activeApp = home;


      this.sinon.stub(app1, 'reviveBrowser');
      var stubReady = this.sinon.stub(app1, 'ready');
      var stubAppNextOpen = this.sinon.stub(app1, 'open');
      var stubAppCurrentClose = this.sinon.stub(home, 'close');
      subject.switchApp(home, app1);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.called);
      assert.isTrue(app1.reviveBrowser.called);
    });

    test('home to an app killed while opening', function() {
      injectRunningApps(home, app1);
      subject._activeApp = home;
      this.sinon.stub(app1, 'isDead').returns(true);

      var stub_updateActiveApp = this.sinon.stub(subject,
        '_updateActiveApp');
      var stubReady = this.sinon.stub(app1, 'ready');
      var stubAppCurrentClose = this.sinon.stub(home, 'close');
      subject.switchApp(home, app1);
      stubReady.yield();
      assert.isFalse(stubAppCurrentClose.called);
      assert.isTrue(stub_updateActiveApp.called);
    });

    test('app to home', function() {
      injectRunningApps(home, app1);
      subject._activeApp = app1;
      var stubReady = this.sinon.stub(home, 'ready');
      var stubAppNextOpen = this.sinon.stub(home, 'open');
      var stubAppCurrentClose = this.sinon.stub(app1, 'close');
      subject.switchApp(app1, home);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.called);
    });

    test('app to home, and home is dead', function() {
      injectRunningApps(home, app1);
      subject._activeApp = app1;
      var stubReady = this.sinon.stub(home, 'ready');

      this.sinon.stub(home, 'isDead').returns(true);
      this.sinon.stub(home, 'ensure');
      subject.switchApp(app1, home);
      stubReady.yield();
      assert.isTrue(home.ensure.called);
    });

    test('app to home, and appopening on the way', function() {
      injectRunningApps(home, app1, app2);
      subject._activeApp = app1;
      var stubReady = this.sinon.stub(home, 'ready');
      var stubClose = this.sinon.stub(app2, 'close');

      subject.switchApp(app1, home);

      subject.handleEvent({
        type: 'appopening',
        detail: app2
      });

      stubReady.yield();

      assert.isTrue(stubClose.calledOnce);
      assert.isTrue(stubClose.calledWith('immediate'));
    });

    test('lockscreen to home', function() {
      injectRunningApps(home);
      subject._activeApp = null;
      var stubReady = this.sinon.stub(home, 'ready');
      var stubAppNextOpen = this.sinon.stub(home, 'open');
      subject.switchApp(null, home);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.calledWith('immediate'));
    });

    test('app to app', function() {
      injectRunningApps(app1, app2);
      subject._activeApp = app1;
      var stubReady = this.sinon.stub(app2, 'ready');
      var stubAppNextOpen = this.sinon.stub(app2, 'open');
      var stubAppCurrentClose = this.sinon.stub(app1, 'close');
      subject.switchApp(app1, app2, true);
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.called);
      assert.isTrue(stubAppNextOpen.calledWith('invoked'));
      assert.isTrue(stubAppCurrentClose.calledWith('invoking'));
    });

    test('close app to cardsview', function() {
      injectRunningApps(app1, home);
      subject._activeApp = app1;
      var stubReady = this.sinon.stub(home, 'ready');
      var stubAppNextOpen = this.sinon.stub(home, 'open');
      var stubAppCurrentClose = this.sinon.stub(app1, 'close');
      subject.switchApp(app1, home, false, null, 'to-cardview');
      stubReady.yield();
      assert.isTrue(stubAppNextOpen.called);
      assert.isTrue(stubAppCurrentClose.calledWith('to-cardview'));
    });

    test('open app from cardsview', function() {
      injectRunningApps(app1, home);
      subject._activeApp = app1;
      var stubReady = this.sinon.stub(app1, 'ready');
      var stubAppNextOpen = this.sinon.stub(app1, 'open');
      var stubAppCurrentClose = this.sinon.stub(home, 'close');
      subject.switchApp(home, app1, false, 'from-cardview', null);
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
      subject.broadcastMessage('fake-message');
      assert.isTrue(stubApp1broadcast.called);
      assert.isTrue(stubApp2broadcast.calledWith('fake-message', undefined));
      assert.isTrue(stubApp3broadcast.calledWith('fake-message', undefined));
    });
  });

  test('launchTrustedWindow', function() {
    var testDetail = 'testdetail';
    subject._activeApp = app1;
    var stubBroadcast = this.sinon.stub(app1, 'broadcast');
    subject._launchTrustedWindow({ detail: testDetail});
    assert.isTrue(stubBroadcast.calledWith('launchtrusted', testDetail));
  });

  suite('Launch()', function() {
    test('Launch app1', function() {
      var stubDisplay = this.sinon.stub(subject, 'display');
      injectRunningApps();
      subject.launch(fakeAppConfig1);
      assert.isTrue(stubDisplay.called);
    });

    test('Launch app1 which is already launched', function() {
      var stubDisplay = this.sinon.stub(subject, 'display');
      injectRunningApps(app1);
      subject.launch(fakeAppConfig1);
      assert.isTrue(stubDisplay.called);
    });

    test('Launch background app', function() {
      var stubDisplay = this.sinon.stub(subject, 'display');
      injectRunningApps();
      subject.launch(fakeAppConfig4Background);
      assert.isFalse(stubDisplay.called);
    });

    test('Launch app is running and change URL', function() {
      injectRunningApps(app5);
      var stubDisplay = this.sinon.stub(subject, 'display');
      var stubChangeURL = this.sinon.stub(app5, 'modifyURLatBackground');
      subject.launch(fakeAppConfig5Background);
      assert.isTrue(stubChangeURL.called);
      assert.isFalse(stubDisplay.called);
    });

    test('Launch app is not running and change URL', function() {
      injectRunningApps(app1, app2, app3, app5);
      var stubDisplay = this.sinon.stub(subject, 'display');
      subject.launch(fakeAppConfig5Background);
      assert.isFalse(stubDisplay.called);
    });

    test('Launch an activity app', function() {
      injectRunningApps(app1, app7);
      subject._updateActiveApp(app1.instanceID);

      var stubDisplay = this.sinon.stub(subject, 'display');
      subject.launch(fakeAppConfig7Activity);

      assert.isTrue(stubDisplay.called);
      assert.equal(app7.callerWindow, app1);
      assert.equal(app1.calleeWindow, app7);
    });
  });

  suite('Settings change', function() {
    test('app-suspending.enabled', function() {
      var stubBroadcastMessage =
        this.sinon.stub(subject, 'broadcastMessage');
      MockNavigatorSettings.mTriggerObservers('app-suspending.enabled',
        { settingValue: false });
      assert.ok(stubBroadcastMessage.calledWith('kill_suspended'));
    });

    test('continuous-transition.enabled', function() {
      MockNavigatorSettings.mTriggerObservers('continuous-transition.enabled',
        { settingValue: true });
      assert.isTrue(subject.continuousTransition);
    });
  });

  suite('linkWindowActivity', function() {
    var fakeAppConfig = Object.create(fakeAppConfig7Activity);

    setup(function() {
      // we fake getHomescreen as app2
      MockService.mockQueryWith('getHomescreen', app2);
    });

    test('Whatever caller is, we would go back to original app',
      function() {
        // callee is app7, caller is app2
        injectRunningApps(app7);
        subject._activeApp = app1;
        this.sinon.stub(app1, 'getTopMostWindow').returns(app2);

        subject.linkWindowActivity(fakeAppConfig);

        assert.deepEqual(app2.calleeWindow, app7);
        assert.deepEqual(app7.callerWindow, app2);
    });

    test('If there is a direct circular activity, ' +
          'close the frontwindow to reveal the callee',
      function() {
        // callee is app1, caller is app3(a front window)
        injectRunningApps(app1);
        subject._activeApp = app1;
        fakeAppConfig.parentApp = '';
        app1.frontWindow = app3;
        this.sinon.stub(app1, 'getTopMostWindow').returns(app3);
        this.sinon.stub(app3, 'getBottomMostWindow').returns(app1);
        var stubKill = this.sinon.stub(app3, 'kill');

        subject.linkWindowActivity(fakeAppConfig1);

        assert.isTrue(stubKill.called);
        assert.isUndefined(app1.callerWindow);
        app1.frontWindow = null;
    });
  });

  test('getApp', function() {
    injectRunningApps(app1, app2, app3, app4);
    assert.deepEqual(subject.getApp('app://www.fake2'), app2);
    assert.isNull(subject.getApp('app://no-this-origin'));
  });

  test('new browser window for getApp', function() {
    injectRunningApps(app5);
    var newApp1 = subject.getApp(fakeAppConfig5Background.origin);
    assert.deepEqual(newApp1.config, fakeAppConfig5Background);

    var newApp2 = subject.getApp(fakeBrowserConfig.origin);
    assert.deepEqual(newApp2, null);

    injectRunningApps(browser1);
    newApp2 = subject.getApp(fakeBrowserConfig.origin);
    assert.deepEqual(newApp2.config, fakeBrowserConfig);
  });

  test('getAppByURL', function() {

    var url1 = fakeBrowserConfig.url;
    var url2 = 'http://mozilla.org/page2';

    injectRunningApps(browser1);
    assert.deepEqual(subject.getAppByURL(url1), browser1);
    assert.isNull(subject.getAppByURL('app://no-this-origin'));

    // Change url in the browser and ensure we can find it again
    browser1.config.url = url2;

    assert.deepEqual(subject.getAppByURL(url2), browser1);
    assert.isNull(subject.getAppByURL(url1));
  });

  suite('Hierarchy functions', function() {
    setup(function() {
      subject.appWindowFactory = MockAppWindowFactory;
      window.WrapperFactory = MockWrapperFactory;
    });

    teardown(function() {
      window.WrapperFactory = null;
    });

    test('getActiveWindow', function() {
      subject._activeApp = app1;
      assert.equal(subject.getActiveWindow(), app1);
      subject.ftuLauncher = MockFtuLauncher;
    });

    test('setHierarchy', function() {
      this.sinon.stub(MockWrapperFactory, 'isLaunchingWindow').returns(false);
      this.sinon.stub(MockAppWindowFactory, 'isLaunchingWindow').returns(false);
      subject._activeApp = app1;
      this.sinon.stub(app1, 'setVisibleForScreenReader');

      subject.setHierarchy(true);
      assert.isTrue(app1.setVisibleForScreenReader.calledWith(true));

      subject.setHierarchy(false);
      assert.isTrue(app1.setVisibleForScreenReader.calledWith(false));
    });

    test('setFocus', function() {
      this.sinon.stub(MockWrapperFactory, 'isLaunchingWindow').returns(false);
      this.sinon.stub(MockAppWindowFactory, 'isLaunchingWindow').returns(false);
      subject._activeApp = app1;
      this.sinon.stub(app1, 'focus');
      this.sinon.stub(app1, 'blur');
      this.sinon.stub(app1, 'setNFCFocus');

      subject.setFocus(true);
      assert.isTrue(app1.focus.called);
      assert.isTrue(app1.setNFCFocus.calledWith(true));

      subject.setFocus(false);
      assert.isTrue(app1.blur.calledOnce);
    });

    test('setHierarchy(true) while launching a new window', function() {
      this.sinon.stub(MockWrapperFactory, 'isLaunchingWindow').returns(true);
      this.sinon.stub(MockAppWindowFactory, 'isLaunchingWindow').returns(false);
      subject._activeApp = app1;
      this.sinon.stub(app1, 'focus');

      subject.setHierarchy(true);
      assert.isFalse(app1.focus.called);
    });

    test('focus is redirected', function() {
      subject._activeApp = app1;
      this.sinon.stub(app1, 'focus');
      subject.focus();
      assert.isTrue(app1.focus.called);
    });

    test('Should publish activated', function() {
      this.sinon.stub(subject, 'publish');
      injectRunningApps(app1);
      subject._activeApp = null;
      window.dispatchEvent(new CustomEvent('appopened', {
        detail: app1
      }));
      assert.isTrue(subject.publish.calledWith('-activated'));
    });

    test('Should publish deactivated', function() {
      this.sinon.stub(subject, 'publish');
      injectRunningApps(app1);
      subject._activeApp = app1;
      window.dispatchEvent(new CustomEvent('taskmanager-activated'));
      assert.isTrue(subject.publish.calledWith('-deactivated'));
    });

    suite('isActive', function() {
      setup(function() {
        subject.taskManager = new MockTaskManager();
      });

      test('No active app', function() {
        subject._activeApp = null;
        assert.isFalse(subject.isActive());
      });

      test('There is active app', function() {
        subject._activeApp = app1;
        this.sinon.stub(app1, 'isActive').returns(true);
        assert.isTrue(subject.isActive());
      });

      test('There is active app but it is closed', function() {
        subject._activeApp = app1;
        this.sinon.stub(app1, 'isActive').returns(false);
        this.sinon.stub(subject.taskManager, 'isActive').returns(true);
        assert.isFalse(subject.isActive());
      });
    });
  });

  suite('getAppInScope', function() {

    test('Returns null if no apps in scope', function() {
      subject._apps = [{
        inScope: this.sinon.stub().returns(false)
      }];
      var app = subject.getAppInScope();
      assert.isFalse(!!(app));
    });

    test('Returns the last launched app in scope', function() {
      var lastApp = {
        inScope: this.sinon.stub().returns(true),
        launchTime: 9999
      };
      var noLastApp = {
        inScope: this.sinon.stub().returns(true),
        launchTime: 1
      };
      subject._apps = [{
        inScope: this.sinon.stub().returns(false)
      }, lastApp, noLastApp];
      var app = subject.getAppInScope();
      assert.equal(app, lastApp);
    });
  });

  suite('getUnpinnedWindows', function() {
    setup(function() {
    });

    test('Returns an empty array if no browser windows', function() {
      subject._apps = [{
        isBrowser: this.sinon.stub().returns(false)
      }];
      var apps = subject.getUnpinnedWindows();
      assert.equal(apps.length, 0);
    });

    test('Returns an empty array if no unpinned windows', function() {
      subject._apps = [{
        isBrowser: this.sinon.stub().returns(true),
        appChrome: {
          pinned: true
        }
      }];
      var apps = subject.getUnpinnedWindows();
      assert.equal(apps.length, 0);
    });

    test('Returns an array with unpinned windows', function() {
      var unpinned = {
        isBrowser: this.sinon.stub().returns(true),
        appChrome: {
          pinned: false
        }
      };

      var pinned = {
        isBrowser: this.sinon.stub().returns(true),
        appChrome: {
          pinned: true
        }
      };
      subject._apps = [unpinned, pinned];
      var apps = subject.getUnpinnedWindows();
      assert.equal(apps.length, 1);
      assert.equal(apps[0], unpinned);
    });
  });

  test('busy loading', function() {
    subject._activeApp = app1;
    app1.loaded = false;
    assert.isTrue(subject.isBusyLoading());
  });
});
