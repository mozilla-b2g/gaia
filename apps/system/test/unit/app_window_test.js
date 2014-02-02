'use strict';

mocha.globals(['SettingsListener', 'removeEventListener', 'addEventListener',
      'dispatchEvent', 'Applications', 'ManifestHelper',
      'KeyboardManager', 'StatusBar', 'BrowserMixin',
      'SoftwareButtonManager', 'AppWindow',
      'OrientationManager', 'SettingsListener', 'BrowserFrame',
      'BrowserConfigHelper', 'System', 'LayoutManager',
      'AppTransitionController']);

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_layout_manager.js');

requireApp('system/test/unit/mock_screen_layout.js');

var mocksForAppWindow = new MocksHelper([
  'OrientationManager', 'Applications', 'SettingsListener',
  'ManifestHelper', 'LayoutManager',
  'ScreenLayout'
]).init();

suite('system/AppWindow', function() {
  var stubById;
  mocksForAppWindow.attachTestHelpers();
  setup(function(done) {
    this.sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js', done);
  });

  teardown(function() {
    stubById.restore();
  });

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

  var fakeAppConfigWithIcon = {
    url: 'app://www.fake4/index.html',
    manifest: {
      icons: {
        '100': '/xxxx.png'
      }
    },
    manifestURL: 'app://wwww.fake4/ManifestURL',
    origin: 'app://www.fake4'
  };

  var fakeAppConfigWithMultiIcon = {
    url: 'app://www.fake4/index.html',
    manifest: {
      icons: {
        '30': '/foo.jpg',
        '60': '/bar.jpg',
        '120': '/xxxx.png',
        '240': '/yyyy.ico',
        '300': '/lol.gif',
        '400': '/xd.img'
      }
    },
    manifestURL: 'app://wwww.fake4/ManifestURL',
    origin: 'app://www.fake4'
  };

  var fakeWrapperConfig = {
    url: 'http://www.fake5/index.html',
    origin: 'http://www.fake5',
    title: 'Fakebook'
  };

  test('App created with instanceID', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var app2 = new AppWindow(fakeAppConfig2);
    assert.isTrue(app1.instanceID !== app2.instanceID);
  });

  suite('Resize', function() {
    var app1;
    setup(function() {
      app1 = new AppWindow(fakeAppConfig1);
    });
    teardown(function() {});

    test('Resize in foreground', function() {
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(true);
      app1.resize();
      assert.isTrue(app1.resized);
    });

    test('Resize in background', function() {
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(false);
      app1.resize();
      assert.isUndefined(app1.resized);
    });

    test('Resize if we are fullscreen', function() {
      var stubIsFullScreen = this.sinon.stub(app1, 'isFullScreen');
      stubIsFullScreen.returns(true);
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(true);
      app1.resize();
      assert.equal(app1.height, MockLayoutManager.fullscreenHeight);
    });

    test('Resize if we are not fullscreen', function() {
      var stubIsFullScreen = this.sinon.stub(app1, 'isFullScreen');
      stubIsFullScreen.returns(true);
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(true);
      app1.resize();
      assert.equal(app1.height, MockLayoutManager.usualHeight);
    });

    test('Send message to appChrome: w/o keyboard', function() {
      MockLayoutManager.keyboardEnabled = false;
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      var stubbroadcast = this.sinon.stub(app1, 'broadcast');
      stubIsActive.returns(true);
      app1.resize();
      assert.isTrue(stubbroadcast.calledWith('withoutkeyboard'));
    });

    test('Send message to appChrome: w/ keyboard', function() {
      MockLayoutManager.keyboardEnabled = true;
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      var stubbroadcast = this.sinon.stub(app1, 'broadcast');
      stubIsActive.returns(true);
      app1.resize();
      assert.isTrue(stubbroadcast.calledWith('withkeyboard'));
    });
  });

  suite('Orientations', function() {
    var fakeAppConfigWithPortraitOrientation = {
      url: 'app://www.fake/index.html',
      manifest: {
        orientation: 'portrait'
      },
      manifestURL: 'app://wwww.fake/ManifestURL',
      origin: 'app://www.fake'
    };
    var fakeAppConfigWithLandscapeOrientation = {
      url: 'app://www.fake/index.html',
      manifest: {
        orientation: 'landscape'
      },
      manifestURL: 'app://wwww.fake/ManifestURL',
      origin: 'app://www.fake'
    };
    var fakeAppConfigWithLandscapePrimaryOrientation = {
      url: 'app://www.fake/index.html',
      manifest: {
        orientation: 'landscape-primary'
      },
      manifestURL: 'app://wwww.fake/ManifestURL',
      origin: 'app://www.fake'
    };
    var fakeAppConfigWithDefaultOrientation = {
      url: 'app://www.fake/index.html',
      manifest: {
        orientation: 'default'
      },
      manifestURL: 'app://wwww.fake/ManifestURL',
      origin: 'app://www.fake'
    };
    var fakeAppConfigWithLandscapeSecondaryOrientation = {
      url: 'app://www.fake/index.html',
      manifest: {
        orientation: 'landscape-secondary'
      },
      manifestURL: 'app://wwww.fake/ManifestURL',
      origin: 'app://www.fake'
    };

    var fakeAppConfigWithPortraitPrimaryOrientation = {
      url: 'app://www.fake/index.html',
      manifest: {
        orientation: 'portrait-primary'
      },
      manifestURL: 'app://wwww.fake/ManifestURL',
      origin: 'app://www.fake'
    };

    var fakeAppConfigWithPortraitSecondaryOrientation = {
      url: 'app://www.fake/index.html',
      manifest: {
        orientation: 'portrait-secondary'
      },
      manifestURL: 'app://wwww.fake/ManifestURL',
      origin: 'app://www.fake'
    };

    test('rotatingDegree on / default is portrait-primary', function() {
      MockOrientationManager.defaultOrientation = 'portrait-primary';
      var app1 = new AppWindow(fakeAppConfig1);
      assert.isTrue(typeof(app1.rotatingDegree) !== 'undefined');
      var app2 = new AppWindow(fakeAppConfigWithDefaultOrientation);
      assert.isTrue(app2.rotatingDegree === 0);
      var app3 = new AppWindow(fakeAppConfigWithPortraitOrientation);
      assert.isTrue(app3.rotatingDegree === 0);
      var app4 = new AppWindow(fakeAppConfigWithLandscapeOrientation);
      assert.isTrue(app4.rotatingDegree === 90);
      var app5 = new AppWindow(fakeAppConfigWithPortraitPrimaryOrientation);
      assert.isTrue(app5.rotatingDegree === 0);
      var app6 = new AppWindow(fakeAppConfigWithPortraitSecondaryOrientation);
      assert.isTrue(app6.rotatingDegree === 180);
      var app7 = new AppWindow(fakeAppConfigWithLandscapePrimaryOrientation);
      assert.isTrue(app7.rotatingDegree === 90);
      var app8 = new AppWindow(fakeAppConfigWithLandscapeSecondaryOrientation);
      assert.isTrue(app8.rotatingDegree === 270);
    });

    test('rotatingDegree on / default is landscape-primary', function() {
      MockOrientationManager.defaultOrientation = 'landscape-primary';
      var app1 = new AppWindow(fakeAppConfig1);
      assert.isTrue(typeof(app1.rotatingDegree) !== 'undefined');
      var app2 = new AppWindow(fakeAppConfigWithDefaultOrientation);
      //assert.isTrue(app2.rotatingDegree === 0);
      var app3 = new AppWindow(fakeAppConfigWithPortraitOrientation);
      assert.isTrue(app3.rotatingDegree === 270);
      var app4 = new AppWindow(fakeAppConfigWithLandscapeOrientation);
      assert.isTrue(app4.rotatingDegree === 0);
      var app5 = new AppWindow(fakeAppConfigWithPortraitPrimaryOrientation);
      assert.isTrue(app5.rotatingDegree === 270);
      var app6 = new AppWindow(fakeAppConfigWithPortraitSecondaryOrientation);
      assert.isTrue(app6.rotatingDegree === 90);
      var app7 = new AppWindow(fakeAppConfigWithLandscapePrimaryOrientation);
      assert.isTrue(app7.rotatingDegree === 0);
      var app8 = new AppWindow(fakeAppConfigWithLandscapeSecondaryOrientation);
      assert.isTrue(app8.rotatingDegree === 180);
    });

    test('closing Rotation Degree / default is portrait-primary', function() {
      MockOrientationManager.defaultOrientation = 'portrait-primary';
      var stubCurrentOrientation =
        this.sinon.stub(MockOrientationManager, 'fetchCurrentOrientation');
      stubCurrentOrientation.returns('portrait-primary');
      var app1 = new AppWindow(fakeAppConfig1);
      var angle1 = app1.determineClosingRotationDegree();
      assert.equal(angle1, 0);

      stubCurrentOrientation.returns('portrait-secondary');
      var angle2 = app1.determineClosingRotationDegree();
      assert.equal(angle2, 180);

      stubCurrentOrientation.returns('landscape-primary');
      var angle3 = app1.determineClosingRotationDegree();
      assert.equal(angle3, 270);

      stubCurrentOrientation.returns('landscape-secondary');
      var angle4 = app1.determineClosingRotationDegree();
      assert.equal(angle4, 90);
    });

    test('closing Rotation Degree / default is landscape-primary', function() {
      MockOrientationManager.defaultOrientation = 'landscape-primary';
      var stubCurrentOrientation =
        this.sinon.stub(MockOrientationManager, 'fetchCurrentOrientation');
      stubCurrentOrientation.returns('portrait-primary');
      var app1 = new AppWindow(fakeAppConfig1);
      var angle1 = app1.determineClosingRotationDegree();
      assert.equal(angle1, 90);

      stubCurrentOrientation.returns('portrait-secondary');
      var angle2 = app1.determineClosingRotationDegree();
      assert.equal(angle2, 270);

      stubCurrentOrientation.returns('landscape-primary');
      var angle3 = app1.determineClosingRotationDegree();
      assert.equal(angle3, 0);

      stubCurrentOrientation.returns('landscape-secondary');
      var angle4 = app1.determineClosingRotationDegree();
      assert.equal(angle4, 180);
    });
  });

  suite('Fullscreen', function() {
    var fakeAppConfig1FullScreen = {
      url: 'app://www.fake/index.html',
      manifest: {
        'fullscreen': true
      },
      manifestURL: 'app://wwww.fake/ManifestURL',
      origin: 'app://www.fake'
    };
    test('isFullScreen', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      assert.isFalse(app1.isFullScreen());
      assert.isFalse(app1.element.classList.contains('fullscreen-app'));

      var app1f = new AppWindow(fakeAppConfig1FullScreen);
      assert.isTrue(app1f.isFullScreen());
      assert.isTrue(app1f.element.classList.contains('fullscreen-app'));
    });
  });

  suite('ScreenshotOverlay State Control', function() {
    test('show', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      // Inject mozBrowser API to app iframe
      injectFakeMozBrowserAPI(app1.browser.element);
      // The DOM is not appended exactly so we create a fake one.
      app1.screenshotOverlay = document.createElement('div');

      var stub_setVisible = this.sinon.stub(app1, '_setVisible');
      app1._screenshotOverlayState = 'frame';
      app1._showFrame();
      assert.isTrue(stub_setVisible.calledWith(true));
      stub_setVisible.restore();

      stub_setVisible = this.sinon.stub(app1, '_setVisible');
      app1._screenshotOverlayState = 'screenshot';
      app1._showFrame();
      assert.isFalse(stub_setVisible.called);
      stub_setVisible.restore();

      stub_setVisible = this.sinon.stub(app1, '_setVisible');
      app1._screenshotOverlayState = 'none';
      app1._showFrame();
      assert.isFalse(stub_setVisible.called);
      stub_setVisible.restore();
    });

    test('hide', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      // Inject mozBrowser API to app iframe
      injectFakeMozBrowserAPI(app1.browser.element);
      // The DOM is not appended exactly so we create a fake one.
      app1.screenshotOverlay = document.createElement('div');

      var stub_setVisible = this.sinon.stub(app1, '_setVisible');
      app1._screenshotOverlayState = 'frame';
      app1._hideFrame();
      assert.isFalse(stub_setVisible.called);
      stub_setVisible.restore();

      stub_setVisible = this.sinon.stub(app1, '_setVisible');
      app1._screenshotOverlayState = 'screenshot';
      app1._hideFrame();
      assert.isTrue(stub_setVisible.calledWith(false));
      stub_setVisible.restore();

      stub_setVisible = this.sinon.stub(app1, '_setVisible');
      app1._screenshotOverlayState = 'none';
      app1._hideFrame();
      assert.isTrue(stub_setVisible.calledWith(false));
      stub_setVisible.restore();
    });

    test('showScreenshotOverlay', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      // Inject mozBrowser API to app iframe
      injectFakeMozBrowserAPI(app1.browser.element);
      // The DOM is not appended exactly so we create a fake one.
      app1.screenshotOverlay = document.createElement('div');

      var stubGetScreenshot = this.sinon.stub(app1, 'getScreenshot');
      var stubHideFrame = this.sinon.stub(app1, '_hideFrame');
      var stubRequestScreenshotURL =
        this.sinon.stub(app1, 'requestScreenshotURL');
      app1._screenshotOverlayState = 'frame';
      app1._showScreenshotOverlay();
      stubGetScreenshot.getCall(0).args[0]('');
      assert.isFalse(stubHideFrame.called);
      stubGetScreenshot.getCall(0).args[0]('fakeBlob');
      assert.isFalse(stubRequestScreenshotURL.called);

      app1._screenshotOverlayState = 'screenshot';
      app1._showScreenshotOverlay();
      stubGetScreenshot.getCall(1).args[0]('');
      assert.isTrue(stubHideFrame.called);
      stubGetScreenshot.getCall(1).args[0]('fakeBlob');
      assert.isTrue(stubRequestScreenshotURL.called);

      app1._screenshotOverlayState = 'none';
      app1._showScreenshotOverlay();
      stubGetScreenshot.getCall(2).args[0]('');
      assert.isTrue(stubHideFrame.called);
      stubGetScreenshot.getCall(2).args[0]('fakeBlob');
      assert.isTrue(stubRequestScreenshotURL.called);
    });

    test('hideScreenshotOverlay', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      // Inject mozBrowser API to app iframe
      injectFakeMozBrowserAPI(app1.browser.element);
      // The DOM is not appended exactly so we create a fake one.
      app1.screenshotOverlay = document.createElement('div');
    });

    test('Request screenshotURL', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      assert.isNull(app1.requestScreenshotURL());
      var stubCreateObjectURL = this.sinon.stub(URL, 'createObjectURL');
      var stubRevokeObjectURL = this.sinon.stub(URL, 'revokeObjectURL');

      app1._screenshotBlob = 'fakeBlob';

      stubCreateObjectURL.returns('fakeURL');
      var url = app1.requestScreenshotURL();
      assert.isNotNull(url);
      assert.isTrue(stubCreateObjectURL.calledWith('fakeBlob'));
      this.sinon.clock.tick(200);
      assert.isTrue(stubRevokeObjectURL.calledWith('fakeURL'));
    });
  });

  suite('Repaint', function() {
    test('full repaint', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      var callback = this.sinon.spy();
      var stubGetScreenshot = this.sinon.stub(app1, 'getScreenshot');
      app1.tryWaitForFullRepaint(callback);
      stubGetScreenshot.getCall(0).args[0]();
      this.sinon.clock.tick(0);
      assert.isTrue(callback.called);
    });
  });

  suite('Transition', function() {
    test('Open', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var fakeTransitionController = {
        requireOpen: function() {},
        requireClose: function() {}
      };
      app1.transitionController = fakeTransitionController;
      var stubRequireOpen =
        this.sinon.stub(fakeTransitionController, 'requireOpen');
      app1.open();
      assert.isTrue(stubRequireOpen.called);
      app1.open('Orz');
      assert.isTrue(stubRequireOpen.calledWith('Orz'));
    });

    test('Close', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var fakeTransitionController = {
        requireOpen: function() {},
        requireClose: function() {}
      };
      app1.transitionController = fakeTransitionController;
      var stubRequireClose =
        this.sinon.stub(fakeTransitionController, 'requireClose');
      app1.close();
      assert.isTrue(stubRequireClose.called);
      app1.close('XD');
      assert.isTrue(stubRequireClose.calledWith('XD'));
    });
  });

  test('publish', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var stubbroadcast = this.sinon.stub(app1, 'broadcast');
    var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
    app1.publish('I-hate-you');
    assert.isTrue(stubDispatchEvent.called);
    assert.equal(stubDispatchEvent.getCall(0).args[0].type, 'appI-hate-you');
    assert.isTrue(stubbroadcast.calledWith('I-hate-you'));
  });

  test('broadcast', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var stubDispatchEvent = this.sinon.stub(app1.element, 'dispatchEvent');
    app1.broadcast('I-love-you');
    assert.isTrue(stubDispatchEvent.called);
    assert.equal(stubDispatchEvent.getCall(0).args[0].type, '_I-love-you');
  });

  test('setFrameBackground', function() {
    ScreenLayout.setDefault({
      tiny: true
    });

    var app = new AppWindow(fakeAppConfigWithIcon);
    this.sinon.clock.tick(0);
    var background = app.element.style.backgroundImage;
    var backgroundSize = app.element.style.backgroundSize;
    assert.isTrue(app.splashed);
    assert.isDefined(app._splash);
    assert.equal(background, 'url("' + app._splash + '")');
    assert.equal(backgroundSize, '120px 120px');
  });

  test('get Icon Splash with Multi Icons, dppx=1', function() {
    // Overwrite value for testing dppx
    var _devicePixelRatio = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 1
    });

    ScreenLayout.setDefault({
      tiny: true
    });

    var app = new AppWindow(fakeAppConfigWithMultiIcon);

    this.sinon.clock.tick(0);
    assert.isTrue(
      app._splash.indexOf(fakeAppConfigWithMultiIcon.
        manifest.icons['120']) >= 0);

    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: _devicePixelRatio
    });
  });

  test('get Icon Splash with Multi Icons, dppx=2', function() {
    // Overwrite value for testing dppx
    var _devicePixelRatio = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 2
    });

    ScreenLayout.setDefault({
      tiny: true
    });

    var app = new AppWindow(fakeAppConfigWithMultiIcon);

    this.sinon.clock.tick(0);
    assert.isTrue(
      app._splash.indexOf(fakeAppConfigWithMultiIcon.
        manifest.icons['240']) >= 0);

    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: _devicePixelRatio
    });
  });

  var fakeMozBrowserIframe = {
    focus: function() {},
    blur: function() {},
    setVisible: function() {},
    goBack: function() {},
    goForward: function() {},
    reload: function() {},
    getCanGoForward: function() {
      return {
        onsuccess: function() {},
        onerror: function() {}
      };
    },
    getCanGoBack: function() {
      return {
        onsuccess: function() {},
        onerror: function() {}
      };
    },
    getScreenshot: function() {
      return {
        onsuccess: function() {},
        onerror: function() {}
      };
    },
    addNextPaintListener: function() {},
    removeNextPaintListener: function() {}
  };

  function injectFakeMozBrowserAPI(iframe) {
    for (var method in fakeMozBrowserIframe) {
      iframe[method] = fakeMozBrowserIframe[method];
    }
  }

  test('ready', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var callback = this.sinon.spy();
    var stubWaitForNextPaint = this.sinon.stub(app1, 'waitForNextPaint');
    var stubEnsureFullRepaint = this.sinon.stub(app1, 'tryWaitForFullRepaint');

    app1.loaded = true;
    app1.ready(callback);
    assert.isTrue(stubEnsureFullRepaint.called);
    assert.isTrue(stubWaitForNextPaint.called);
    stubEnsureFullRepaint.getCall(0).args[0]();
    stubWaitForNextPaint.getCall(0).args[0]();
    this.sinon.clock.tick(0);
    assert.isTrue(callback.calledOnce);
  });

  suite('Browser Mixin', function() {
    test('MozBrowser API: simple methods', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      var stubFocus = this.sinon.stub(app1.browser.element, 'focus');
      var stubBlur = this.sinon.stub(app1.browser.element, 'blur');
      var stubBack = this.sinon.stub(app1.browser.element, 'goBack');
      var stubForward = this.sinon.stub(app1.browser.element, 'goForward');
      var stubReload = this.sinon.stub(app1.browser.element, 'reload');

      app1.focus();
      assert.isTrue(stubFocus.called);
      app1.blur();
      assert.isTrue(stubBlur.called);
      app1.back();
      assert.isTrue(stubBack.called);
      app1.forward();
      assert.isTrue(stubForward.called);
      app1.reload();
      assert.isTrue(stubReload.called);
    });

    test('MozBrowser API: getScreenshot', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      var stubScreenshot = this.sinon.stub(app1.browser.element,
        'getScreenshot');

      var fakeDOMRequest = {
        onsuccess: function() {},
        onerror: function() {}
      };

      stubScreenshot.returns(fakeDOMRequest);

      var callback1 = this.sinon.spy();
      app1.getScreenshot(callback1);
      assert.isTrue(stubScreenshot.called);
      fakeDOMRequest.onsuccess({ target: { result: 'fakeBlob' } });
      assert.equal(app1._screenshotBlob, 'fakeBlob');
      assert.isTrue(callback1.calledWith('fakeBlob'));

      fakeDOMRequest.onerror();
      assert.isTrue(callback1.called);
    });

    test('MozBrowser API: getGoForward', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      var stubCanGoForward = this.sinon.stub(app1.browser.element,
        'getCanGoForward');

      var fakeDOMRequest = {
        onsuccess: function() {},
        onerror: function() {}
      };

      stubCanGoForward.returns(fakeDOMRequest);

      var callback = this.sinon.spy();
      app1.canGoForward(callback);
      assert.isTrue(stubCanGoForward.called);
      fakeDOMRequest.onsuccess({ target: { result: true } });
      assert.isTrue(callback.calledWith(true));

      fakeDOMRequest.onsuccess({ target: { result: false } });
      assert.isTrue(callback.calledWith(false));

      fakeDOMRequest.onerror();
      assert.isTrue(callback.called);
    });

    test('MozBrowser API: getGoBack', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      var stubCanGoBack = this.sinon.stub(app1.browser.element, 'getCanGoBack');

      var fakeDOMRequest = {
        onsuccess: function() {},
        onerror: function() {}
      };

      stubCanGoBack.returns(fakeDOMRequest);

      var callback = this.sinon.spy();
      app1.canGoBack(callback);
      assert.isTrue(stubCanGoBack.called);
      fakeDOMRequest.onsuccess({ target: { result: true } });
      assert.isTrue(callback.calledWith(true));

      fakeDOMRequest.onsuccess({ target: { result: false } });
      assert.isTrue(callback.calledWith(false));

      fakeDOMRequest.onerror();
      assert.isTrue(callback.called);
    });

    test('MozBrowser API: NextPaint', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      var callback = this.sinon.spy();
      var stubAddNextPaintListener = this.sinon.stub(app1.browser.element,
        'addNextPaintListener');
      var stubRemoveNextPaintListener = this.sinon.stub(app1.browser.element,
        'removeNextPaintListener');

      app1.waitForNextPaint(callback);
      assert.isTrue(stubAddNextPaintListener.called);
      stubAddNextPaintListener.getCall(0).args[0]();
      assert.isTrue(callback.called);

      var callback2 = this.sinon.spy();
      app1.waitForNextPaint(callback2);
      this.sinon.clock.tick(app1.NEXTPAINT_TIMEOUT);
      assert.isTrue(callback2.called);
    });
  });

  suite('setVisible', function() {
    test('setVisible: true', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      app1.screenshotOverlay = document.createElement('div');
      var stub_showScreenshotOverlay = this.sinon.stub(app1,
        '_showScreenshotOverlay');
      var stub_hideScreenshotOverlay = this.sinon.stub(app1,
        '_hideScreenshotOverlay');
      var stub_showFrame = this.sinon.stub(app1,
        '_showFrame');
      var stub_hideFrame = this.sinon.stub(app1,
        '_hideFrame');

      app1.setVisible(true);
      assert.equal(app1._screenshotOverlayState, 'frame');
      assert.isTrue(stub_showFrame.called);
    });
    test('setVisible: false', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      app1.screenshotOverlay = document.createElement('div');
      var stub_showScreenshotOverlay = this.sinon.stub(app1,
        '_showScreenshotOverlay');
      var stub_hideScreenshotOverlay = this.sinon.stub(app1,
        '_hideScreenshotOverlay');
      var stub_showFrame = this.sinon.stub(app1,
        '_showFrame');
      var stub_hideFrame = this.sinon.stub(app1,
        '_hideFrame');

      app1.setVisible(false);
      assert.equal(app1._screenshotOverlayState, 'none');
      assert.isTrue(stub_hideFrame.called);
    });
    test('setVisible: false, true', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      app1.screenshotOverlay = document.createElement('div');
      var stub_showScreenshotOverlay = this.sinon.stub(app1,
        '_showScreenshotOverlay');
      var stub_hideScreenshotOverlay = this.sinon.stub(app1,
        '_hideScreenshotOverlay');
      var stub_showFrame = this.sinon.stub(app1,
        '_showFrame');
      var stub_hideFrame = this.sinon.stub(app1,
        '_hideFrame');

      app1.setVisible(false, true);
      assert.equal(app1._screenshotOverlayState, 'screenshot');
      assert.isTrue(stub_showScreenshotOverlay.called);
    });
  });

  suite('Event handlers', function() {
    test('ActivityDone event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var app2 = new AppWindow(fakeAppConfig2);
      var spyRequestOpen = this.sinon.spy(app1, 'requestOpen');
      var stubPublish = this.sinon.stub(app1, 'publish');
      app1.setActivityCallee(app2);

      assert.deepEqual(app1.activityCallee, app2);
      assert.deepEqual(app2.activityCaller, app1);

      app2.handleEvent({
        type: 'mozbrowseractivitydone'
      });

      assert.isNull(app1.activityCallee);
      assert.isNull(app2.activityCaller);
      assert.isTrue(spyRequestOpen.called);
      assert.isTrue(stubPublish.calledWith('requestopen'));
    });

    test('Error event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubKill = this.sinon.stub(app1, 'kill');
      var stubPublish = this.sinon.stub(app1, 'publish');
      app1.handleEvent({
        type: 'mozbrowsererror',
        detail: {
          type: 'fatal'
        }
      });

      assert.isTrue(stubKill.called);
      assert.isTrue(stubPublish.calledWith('crashed'));
    });

    test('Close event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubKill = this.sinon.stub(app1, 'kill');

      app1.handleEvent({
        type: 'mozbrowserclose'
      });

      assert.isTrue(stubKill.called);
    });

    test('Load event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: 'mozbrowserloadstart'
      });

      assert.isTrue(app1.loading);
      assert.isTrue(!app1.loaded);

      app1.handleEvent({
        type: 'mozbrowserloadend',
        detail: {
          backgroundColor: 'transparent'
        }
      });

      assert.isTrue(app1.loaded);
      assert.isFalse(app1.loading);
    });

    test('Locationchange event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var url = app1.config.url;

      app1.handleEvent({
        type: 'mozbrowserlocationchange',
        detail: 'http://fakeURL.changed'
      });

      assert.equal(app1.config.url, 'http://fakeURL.changed');
      app1.config.url = url;
    });

    test('VisibilityChange event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var url = app1.config.url;
      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: 'mozbrowservisibilitychange',
        detail: {
          visible: false
        }
      });

      assert.isTrue(stubPublish.calledWith('background'));

      app1.handleEvent({
        type: 'mozbrowservisibilitychange',
        detail: {
          visible: true
        }
      });

      assert.isTrue(stubPublish.calledWith('foreground'));
    });

    test('Localized event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var spy = this.sinon.spy(window, 'ManifestHelper');
      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: '_localized'
      });

      assert.isTrue(spy.calledWithNew());
      assert.isTrue(spy.calledWithExactly(app1.manifest));
      assert.isTrue(stubPublish.calledWithExactly('namechanged'));
    });

    test('Localized event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var spy = this.sinon.spy(window, 'ManifestHelper');

      app1.handleEvent({
        type: '_localized'
      });

      assert.isTrue(spy.calledWithNew());
      assert.isTrue(spy.calledWithExactly(app1.manifest));
    });

    test('Swipe in event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var atc1 = {
        switchTransitionState: function() {}
      };
      var spy = this.sinon.spy(atc1, 'switchTransitionState');
      app1.transitionController = atc1;

      app1.handleEvent({
        type: '_swipein'
      });

      assert.isTrue(spy.calledWith('opened'));
    });

    test('Swipe out event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var atc1 = {
        switchTransitionState: function() {}
      };
      var spy = this.sinon.spy(atc1, 'switchTransitionState');
      app1.transitionController = atc1;

      app1.handleEvent({
        type: '_swipeout'
      });

      assert.isTrue(spy.calledWith('closed'));
    });
  });

  test('Change URL at run time', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var stubIsActive = this.sinon.stub(app1, 'isActive');
    var url = app1.config.url;
    stubIsActive.returns(true);
    app1.modifyURLatBackground('http://changed.url');
    assert.isTrue(app1.browser.element.src.indexOf('http://changed.url') < 0);

    stubIsActive.returns(false);
    app1.modifyURLatBackground('http://changed.url');
    assert.isTrue(app1.browser.element.src.indexOf('http://changed.url') >= 0);
  });

  test('Launch wrapper should have name from title config', function() {
    var app1 = new AppWindow(fakeWrapperConfig);
    assert.equal(app1.name, 'Fakebook');
  });
});
