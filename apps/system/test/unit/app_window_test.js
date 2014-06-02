/* global AppWindow, ScreenLayout, MockOrientationManager,
      LayoutManager, MocksHelper, MockAttentionScreen, MockContextMenu,
      AppChrome, ActivityWindow, PopupWindow, layoutManager */
'use strict';

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_context_menu.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_app_chrome.js');
requireApp('system/test/unit/mock_screen_layout.js');
requireApp('system/test/unit/mock_popup_window.js');
requireApp('system/test/unit/mock_attention_screen.js');
requireApp('system/test/unit/mock_activity_window.js');

var mocksForAppWindow = new MocksHelper([
  'OrientationManager', 'Applications', 'SettingsListener',
  'ManifestHelper', 'LayoutManager', 'ActivityWindow',
  'ScreenLayout', 'AppChrome', 'PopupWindow', 'AttentionScreen'
]).init();

suite('system/AppWindow', function() {
  var stubById;
  mocksForAppWindow.attachTestHelpers();
  setup(function(done) {
    this.sinon.useFakeTimers();

    window.layoutManager = new LayoutManager().start();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    this.sinon.stub(HTMLElement.prototype, 'querySelector',
    function() {
      return document.createElement('div');
    });
    requireApp('system/js/system.js');
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js', done);
  });

  teardown(function() {
    delete window.layoutManager;

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

  var fakeAppConfig4 = {
    url: 'app://www.fake4/index.html',
    manifest: {},
    origin: 'app://www.fake4'
  };

  var fakeAppConfigBackground = {
    url: 'app://www.fakebackground/index.html',
    manifest: {},
    origin: 'app://www.fakebackground',
    stayBackground: true
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

  var fakeChromeConfig = {
    url: 'http://www.fakeChrome/index.html',
    origin: 'http://www.fakeChrome',
    manifest: {
      chrome: { 'navigation': true }
    }
  };

  var fakeChromeConfigWithoutNavigation = {
    url: 'http://www.fakeChrome2/index.html',
    origin: 'http://www.fakeChrome2',
    manifest: {
      chrome: { 'navigation': false }
    }
  };

  test('App created with instanceID', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var app2 = new AppWindow(fakeAppConfig2);
    assert.isTrue(app1.instanceID !== app2.instanceID);
  });

  test('Automatically enable navigation for a brower window.', function() {
    var app1 = new AppWindow(fakeWrapperConfig);
    assert.equal(app1.config.chrome.navigation, true);
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
      assert.equal(app1.height, layoutManager.height);
    });

    test('Resize if we are not fullscreen', function() {
      var stubIsFullScreen = this.sinon.stub(app1, 'isFullScreen');
      stubIsFullScreen.returns(true);
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(true);
      app1.resize();
      assert.equal(app1.height, layoutManager.height);
    });

    test('Send message to appChrome: w/o keyboard', function() {
      layoutManager.keyboardEnabled = false;
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      var stubbroadcast = this.sinon.stub(app1, 'broadcast');
      stubIsActive.returns(true);
      app1.resize();
      assert.isTrue(stubbroadcast.calledWith('withoutkeyboard'));
    });

    test('Send message to appChrome: w/ keyboard', function() {
      layoutManager.keyboardEnabled = true;
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      var stubbroadcast = this.sinon.stub(app1, 'broadcast');
      stubIsActive.returns(true);
      app1.resize();
      assert.isTrue(stubbroadcast.calledWith('withkeyboard'));
    });

    test('Would get the height of chrome\'s button bar', function() {
      var stubGetBarHeight =
        this.sinon.stub(AppChrome.prototype, 'getBarHeight');
      var spy = this.sinon.spy(window, 'AppChrome');
      var chromeApp = new AppWindow(fakeChromeConfig);
      var stubIsActive = this.sinon.stub(chromeApp, 'isActive');
      stubIsActive.returns(true);
      chromeApp.resize();
      assert.isTrue(stubGetBarHeight.called);
      assert.isTrue(spy.calledWithNew());
    });

    test('No navigation setting in manifest', function() {
      var spy = this.sinon.spy(window, 'AppChrome');
      new AppWindow(fakeChromeConfigWithoutNavigation); // jshint ignore:line
      assert.isFalse(spy.calledWithNew());
    });

    test('resize to bottom most and top most window', function() {
      var popups = openPopups(5);
      var stubTopResize = this.sinon.stub(popups[4], 'resize');
      var stubBottomRealResize = this.sinon.stub(popups[0], '_resize');
      var stubAppIsActive = this.sinon.stub(popups[0], 'isActive');
      stubAppIsActive.returns(true);
      popups[1].resize();
      assert.isTrue(stubTopResize.called);
      assert.isTrue(stubBottomRealResize.called);
    });
  });

  suite('Render', function() {
    var visibleSpy;

    setup(function() {
      visibleSpy = this.sinon.stub(AppWindow.prototype, 'setVisible');
    });

    test('display screenshot for apps launched in background', function() {
      new AppWindow(fakeAppConfigBackground); // jshint ignore:line
      sinon.assert.calledWith(visibleSpy, false, true);
    });

    test('homescreen is launched at background', function() {
      var renderSpy = this.sinon.stub(AppWindow.prototype, 'render');
      var app = new AppWindow(fakeAppConfig1);
      renderSpy.restore();
      app.isHomescreen = true;
      app.render();
      sinon.assert.calledWith(visibleSpy, false);
    });
  });

  suite('Orientations', function() {
    var fakeAppConfigWithPortraitOrientation = {
      url: 'app://www.fake.portrait/index.html',
      manifest: {
        orientation: 'portrait'
      },
      manifestURL: 'app://www.fake.portrait/ManifestURL',
      origin: 'app://www.fake.portrait'
    };
    var fakeAppConfigWithLandscapeOrientation = {
      url: 'app://www.fake.landscape/index.html',
      manifest: {
        orientation: 'landscape'
      },
      manifestURL: 'app://www.fake.landscape/ManifestURL',
      origin: 'app://www.fake.landscape'
    };
    var fakeAppConfigWithLandscapePrimaryOrientation = {
      url: 'app://www.fake.landscape.primary/index.html',
      manifest: {
        orientation: 'landscape-primary'
      },
      manifestURL: 'app://www.fake.landscape.primary/ManifestURL',
      origin: 'app://www.fake.landscape.primary'
    };
    var fakeAppConfigWithDefaultOrientation = {
      url: 'app://www.fake.default/index.html',
      manifest: {
        orientation: 'default'
      },
      manifestURL: 'app://www.fake.default/ManifestURL',
      origin: 'app://www.fake.default'
    };
    var fakeAppConfigWithLandscapeSecondaryOrientation = {
      url: 'app://www.fake.landscape.secondary/index.html',
      manifest: {
        orientation: 'landscape-secondary'
      },
      manifestURL: 'app://wwww.fake.landscape.secondary/ManifestURL',
      origin: 'app://www.fake.landscape.secondary'
    };

    var fakeAppConfigWithPortraitPrimaryOrientation = {
      url: 'app://www.fake.portrait.primary/index.html',
      manifest: {
        orientation: 'portrait-primary'
      },
      manifestURL: 'app://wwww.fake.portrait.primary/ManifestURL',
      origin: 'app://wwww.fake.portrait.primary'
    };

    var fakeAppConfigWithPortraitSecondaryOrientation = {
      url: 'app://www.fake.portrait.secondary/index.html',
      manifest: {
        orientation: 'portrait-secondary'
      },
      manifestURL: 'app://wwww.fake.portrait.secondary/ManifestURL',
      origin: 'app://wwww.fake.portrait.secondary'
    };

    var fakeAppConfigWithOrientationArray = {
      url: 'app://www.fake.array/index.html',
      manifest: {
        orientation: ['portrait-secondary', 'landscape']
      },
      manifestURL: 'app://wwww.fake.array/ManifestURL',
      origin: 'app://wwww.fake.array'
    };

    test('setOrientation()', function() {
      var popups = openPopups(4);
      this.sinon.stub(popups[0], 'isActive').returns(true);
      this.sinon.stub(popups[1], 'isActive').returns(true);
      this.sinon.stub(popups[2], 'isActive').returns(true);
      var stubLockOrientation1 = this.sinon.stub(popups[1], 'lockOrientation');
      var stubLockOrientation2 = this.sinon.stub(popups[2], 'lockOrientation');
      popups[0].setOrientation();
      assert.isFalse(stubLockOrientation1.called);
      assert.isTrue(stubLockOrientation2.called);
    });

    var stubScreenMozLockOrientation, stubScreenMozUnlockOrientation;
    suite('lockOrientation()', function() {
      setup(function() {
        MockOrientationManager.defaultOrientation = 'portrait-primary';
        MockOrientationManager.globalOrientation = null;
        stubScreenMozLockOrientation =
          this.sinon.stub(screen, 'mozLockOrientation');
        stubScreenMozUnlockOrientation =
          this.sinon.stub(screen, 'mozUnlockOrientation');
      });
      teardown(function() {
        stubScreenMozLockOrientation.restore();
        stubScreenMozUnlockOrientation.restore();
      });
      test('No orientation entry in manifest should unlock screen orientation.',
        function() {
          var app = new AppWindow(fakeAppConfig1);
          app.lockOrientation();
          assert.isTrue(stubScreenMozUnlockOrientation.called);
        });
      test('default orientation', function() {
        var app = new AppWindow(fakeAppConfigWithDefaultOrientation);
        app.lockOrientation();
        assert.isTrue(stubScreenMozLockOrientation
          .calledWith('default'));
      });
      test('portrait orientation', function() {
        var app = new AppWindow(fakeAppConfigWithPortraitOrientation);
        app.lockOrientation();
        assert.isTrue(stubScreenMozLockOrientation
          .calledWith('portrait'));
      });
      test('landscape orientation', function() {
        var app = new AppWindow(fakeAppConfigWithLandscapeOrientation);
        app.lockOrientation();
        assert.isTrue(stubScreenMozLockOrientation
          .calledWith('landscape'));
      });
      test('portrait-primary orientation', function() {
        var app = new AppWindow(fakeAppConfigWithPortraitPrimaryOrientation);
        app.lockOrientation();
        assert.isTrue(stubScreenMozLockOrientation
          .calledWith('portrait-primary'));
      });
      test('portrait-secondary orientation', function() {
        var app = new AppWindow(fakeAppConfigWithPortraitSecondaryOrientation);
        app.lockOrientation();
        assert.isTrue(stubScreenMozLockOrientation
          .calledWith('portrait-secondary'));
      });
      test('landscape-primary orientation', function() {
        var app = new AppWindow(fakeAppConfigWithLandscapePrimaryOrientation);
        app.lockOrientation();
        assert.isTrue(stubScreenMozLockOrientation
          .calledWith('landscape-primary'));
      });
      test('landscape-secondary orientation', function() {
        var app = new AppWindow(fakeAppConfigWithLandscapeSecondaryOrientation);
        app.lockOrientation();
        assert.isTrue(stubScreenMozLockOrientation
          .calledWith('landscape-secondary'));
      });
      test('array of orientations', function() {
        var app = new AppWindow(fakeAppConfigWithOrientationArray);
        app.lockOrientation();
        assert.isTrue(stubScreenMozLockOrientation
          .calledWith(['portrait-secondary', 'landscape']));
      });
    });

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

      stubHideFrame.reset();
      stubRequestScreenshotURL.reset();

      app1._screenshotOverlayState = 'screenshot';
      app1._showScreenshotOverlay();
      stubGetScreenshot.getCall(1).args[0]('');
      assert.isTrue(stubHideFrame.called);
      stubGetScreenshot.getCall(1).args[0]('fakeBlob');
      assert.isTrue(stubRequestScreenshotURL.called);

      stubHideFrame.reset();
      stubRequestScreenshotURL.reset();

      app1._screenshotOverlayState = 'none';
      app1._showScreenshotOverlay();
      stubGetScreenshot.yield('');
      assert.isTrue(stubHideFrame.called);
      stubGetScreenshot.yield('fakeblob');
      assert.isTrue(app1.screenshotOverlay.classList.contains('visible'));
      assert.isTrue(app1.identificationOverlay.classList.contains('visible'));
      assert.isTrue(stubRequestScreenshotURL.called);
    });

    test('hideScreenshotOverlay', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      // Inject mozBrowser API to app iframe
      injectFakeMozBrowserAPI(app1.browser.element);

      app1._screenshotOverlayState = 'none';
      app1.screenshotOverlay.classList.add('visible');
      app1.identificationOverlay.classList.add('visible');
      app1._hideScreenshotOverlay();
      assert.isFalse(app1.screenshotOverlay.classList.contains('visible'));

      assert.isTrue(app1.identificationOverlay.classList.contains('visible'));
      this.sinon.clock.tick(); // We wait for the next tick
      assert.isFalse(app1.identificationOverlay.classList.contains('visible'));
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
    var idBackground = app.identificationIcon.style.backgroundImage;
    assert.isTrue(app.splashed);
    assert.isDefined(app._splash);
    assert.equal(background, 'url("' + app._splash + '")');
    assert.equal(backgroundSize, '120px 120px');
    assert.equal(idBackground, 'url("' + app._splash + '")');
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

  test('get frame for screenshot should fetch top most window', function() {
    var popups = openPopups(5);
    assert.equal(popups[0].getFrameForScreenshot(),
                 popups[4].browser.element);
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
    setVisibleForScreenReader: function() {},
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

  test('we do not need to wait if there is screenshot layer covered',
    function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var callback = this.sinon.spy();
      var stubWaitForNextPaint = this.sinon.stub(app1, 'waitForNextPaint');
      var stubEnsureFullRepaint =
        this.sinon.stub(app1, 'tryWaitForFullRepaint');

      app1.loaded = true;
      app1._screenshotOverlayState = 'screenshot';
      app1.ready(callback);
      assert.isFalse(stubEnsureFullRepaint.called);
      assert.isFalse(stubWaitForNextPaint.called);
      this.sinon.clock.tick(0);
      assert.isTrue(callback.calledOnce);
    });

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
      var stub_showFrame = this.sinon.stub(app1,
        '_showFrame');

      app1.setVisible(true);
      assert.equal(app1._screenshotOverlayState, 'frame');
      assert.isTrue(stub_showFrame.called);
    });
    test('setVisible: false', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      app1.screenshotOverlay = document.createElement('div');
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

      app1.setVisible(false, true);
      assert.equal(app1._screenshotOverlayState, 'screenshot');
      assert.isTrue(stub_showScreenshotOverlay.called);
    });

    test('setVisible to front window', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var app2 = new AppWindow(fakeAppConfig2);
      var stubApp2SetVisible = this.sinon.stub(app2, 'setVisible');
      app1.frontWindow = app2;
      app2.rearWindow = app1;
      app1.setVisible(true);
      assert.isTrue(stubApp2SetVisible.calledWith(true));

      app1.setVisible(false);
      assert.isTrue(stubApp2SetVisible.calledWith(false));
    });
  });

  suite('setVisibleForScreenReader', function() {
    test('setVisibleForScreenReader: false', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);

      app1.setVisibleForScreenReader(false);
      assert.equal(app1.element.getAttribute('aria-hidden'), 'true');
    });
    test('setVisibleForScreenReader: true', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);

      app1.setVisibleForScreenReader(true);
      assert.equal(app1.element.getAttribute('aria-hidden'), 'false');
    });
  });

  suite('apply and unapplyStyle', function() {
    test('applyStyle', function() {
      var app = new AppWindow(fakeAppConfig1);
      app.element.style.opacity = '0.5';

      app.applyStyle({
        MozTransform: 'scale(2)',
        fontSize: 'large'
      });
      assert.equal(app.element.style.MozTransform, 'scale(2)');
      assert.equal(app.element.style.fontSize, 'large');
      // is non-destructive
      assert.equal(app.element.style.opacity, '0.5');
    });
    test('unapplyStyle', function() {
      var app = new AppWindow(fakeAppConfig1);
      app.applyStyle({
        MozTransform: 'scale(2)',
        fontSize: 'large',
        scale: '0.5'
      });
      app.unapplyStyle({ MozTransform: true, fontSize: true });
      assert.ok(!app.element.style.MozTransform);
      assert.ok(!app.element.style.fontSize);
      assert.equal(app.element.style.scale, '0.5');
    });

  });

  suite('enter/leaveTaskManager', function() {
    test('class gets added and removed', function() {
      var app = new AppWindow(fakeAppConfig1);
      assert.isFalse(app.element.classList.contains('in-task-manager'));
      app.enterTaskManager();
      assert.isTrue(app.element.classList.contains('in-task-manager'));
      app.leaveTaskManager();
      assert.isFalse(app.element.classList.contains('in-task-manager'));
    });

    test('leaveTaskManager: element.style cleanup', function() {
      var app = new AppWindow(fakeAppConfig1);
      var unapplyStyleStub = sinon.stub(app, 'unapplyStyle');
      app.applyStyle({
        fontSize: '11',
        MozTransform: 'scale(2)'
      });
      app.applyStyle({
        pointerEvents: 'none'
      });
      app.leaveTaskManager();

      // ensure unapplyStyle gets called with aggregated property list
      assert.isTrue(unapplyStyleStub.calledOnce);
      var unapplyProps = unapplyStyleStub.getCall(0).args[0];
      assert.equal(Object.keys(unapplyProps).length, 3);
      assert.ok('fontSize' in unapplyProps);
      assert.ok('MozTransform' in unapplyProps);
      assert.ok('pointerEvents' in unapplyProps);
    });
  });

  suite('transform', function(){
    test('transform composes correct string value', function(){
      var app = new AppWindow(fakeAppConfig1);
      var transformProps = {
        scale: 0.5,
        translateX: '10px',
        rotateY: '10deg'
      };
      // although order isn't important, it should come out looking like this:
      var expectedStr = 'scale(0.5) translateX(10px) rotateY(10deg)';
      app.transform(transformProps);
      assert.equal(app.element.style.MozTransform, expectedStr);
    });
  });

  suite('Event handlers', function() {
    test('ActivityDone event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var app2 = new AppWindow(fakeAppConfig2);
      var spyOpen = this.sinon.spy(app1, 'open');
      var spyClose = this.sinon.spy(app2, 'close');
      var stubIsActive = this.sinon.stub(app2, 'isActive');
      app1.setCalleeWindow(app2);
      stubIsActive.returns(true);

      assert.deepEqual(app1.calleeWindow, app2);
      assert.deepEqual(app2.callerWindow, app1);

      app2.handleEvent({
        type: 'mozbrowseractivitydone'
      });

      assert.isNull(app1.calleeWindow);
      assert.isNull(app2.callerWindow);
      assert.isTrue(spyOpen.calledWith('in-from-left'));
      assert.isTrue(spyClose.calledWith('out-to-right'));
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

    test('Destroy only the browser when app crashed and ' +
          'suspending is enabled',
      function() {
        var app1 = new AppWindow(fakeAppConfig1);
        var stubDestroyBrowser = this.sinon.stub(app1, 'destroyBrowser');
        var stubIsActive = this.sinon.stub(app1, 'isActive');
        stubIsActive.returns(false);
        AppWindow.SUSPENDING_ENABLED = true;
        app1.handleEvent({
          type: 'mozbrowsererror',
          detail: {
            type: 'fatal'
          }
        });

        assert.isTrue(stubDestroyBrowser.called);
        AppWindow.SUSPENDING_ENABLED = false;
      });

    test('Kill the app directly even suspending is enabled ' +
          'when the app is active',
      function() {
        var app1 = new AppWindow(fakeAppConfig1);
        var stubKill = this.sinon.stub(app1, 'kill');
        var stubIsActive = this.sinon.stub(app1, 'isActive');
        stubIsActive.returns(true);
        AppWindow.SUSPENDING_ENABLED = true;
        app1.handleEvent({
          type: 'mozbrowsererror',
          detail: {
            type: 'fatal'
          }
        });

        assert.isTrue(stubKill.called);
        AppWindow.SUSPENDING_ENABLED = false;
      });

    test('Close event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubKill = this.sinon.stub(app1, 'kill');

      app1.handleEvent({
        type: 'mozbrowserclose'
      });

      assert.isTrue(stubKill.called);
    });

    test('Kill a child window.', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var app1parent = new AppWindow(fakeAppConfig2);
      var app1child = new AppWindow(fakeAppConfig3);
      app1.nextWindow = app1child;
      app1child.previousWindow = app1;
      app1.previousWindow = app1parent;
      app1parent.nextWindow = app1;

      var stubIsActive = this.sinon.stub(app1, 'isActive');
      var stubKillChild = this.sinon.stub(app1child, 'kill');
      var stubOpenParent = this.sinon.stub(app1parent, 'open');
      var stubCloseSelf = this.sinon.stub(app1, 'close');
      stubIsActive.returns(true);

      app1.kill();
      assert.isTrue(stubOpenParent.calledWith('in-from-left'));
      assert.isTrue(stubCloseSelf.calledWith('out-to-right'));
      assert.isTrue(stubKillChild.called);
      assert.isNull(app1.previousWindow);
      assert.isNull(app1parent.nextWindow);
      assert.isNull(app1.nextWindow);

      var stubDestroy = this.sinon.stub(app1, 'destroy');
      /** global */
      app1.element.dispatchEvent(new CustomEvent('_closed'));
      assert.isTrue(stubDestroy.called);
    });

    test('Load event', function() {
      var app1 = new AppWindow(fakeAppConfig1);

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

    test('Scroll event', function() {
      var app4 = new AppWindow(fakeAppConfig4);
      app4.manifest = null;

      app4.handleEvent({
        type: 'mozbrowserasyncscroll',
        detail: {
          top: 7
        }
      });

      assert.equal(app4.scrollPosition, 7);
    });

    test('VisibilityChange event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
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
      var spyManifestHelper = this.sinon.stub(window, 'ManifestHelper');
      spyManifestHelper.returns({
        name: 'Mon Application'
      });
      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: '_localized'
      });

      assert.isTrue(spyManifestHelper.calledWithNew());
      assert.isTrue(spyManifestHelper.calledWithExactly(app1.manifest));
      assert.isTrue(stubPublish.calledWithExactly('namechanged'));
    assert.equal(app1.identificationTitle.textContent, 'Mon Application');
    });

    test('Swipe in event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var atc1 = {
        switchTransitionState: function() {}
      };
      var switchTransitionState =
        this.sinon.stub(atc1, 'switchTransitionState');
      var revive = this.sinon.stub(app1, 'reviveBrowser');
      app1.transitionController = atc1;

      app1.handleEvent({
        type: '_swipein'
      });

      assert.isTrue(switchTransitionState.calledWith('opened'));
      assert.isTrue(revive.called);
    });

    test('Swipe out event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var atc1 = {
        switchTransitionState: function() {}
      };
      var switchTransitionState =
        this.sinon.stub(atc1, 'switchTransitionState');
      app1.transitionController = atc1;

      app1.handleEvent({
        type: '_swipeout'
      });

      assert.isTrue(switchTransitionState.calledWith('closed'));
    });

    test('activity opened event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var spySetVisible = this.sinon.stub(app1, 'setVisible');
      var stubIsOOP = this.sinon.stub(app1, 'isOOP');
      stubIsOOP.returns(false);
      app1.handleEvent({
        type: 'activityopened'
      });
      assert.isTrue(spySetVisible.calledWith(false, true));
    });

    test('popupclosing event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var spyLockOrientation = this.sinon.spy(app1, 'lockOrientation');
      var spySetVisible = this.sinon.spy(app1, 'setVisible');
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(true);
      MockAttentionScreen.mFullyVisible = false;

      app1.handleEvent({
        type: 'popupclosing'
      });

      assert.isTrue(spyLockOrientation.called);
      assert.isTrue(spySetVisible.called);
    });

    test('activityclosing event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var spyLockOrientation = this.sinon.spy(app1, 'lockOrientation');
      var spySetVisible = this.sinon.spy(app1, 'setVisible');
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(true);
      MockAttentionScreen.mFullyVisible = false;

      app1.handleEvent({
        type: 'activityclosing'
      });

      assert.isTrue(spyLockOrientation.called);
      assert.isTrue(spySetVisible.called);
    });

    test('activityclosing event when attention screen is shown', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var spyLockOrientation = this.sinon.spy(app1, 'lockOrientation');
      var spySetVisible = this.sinon.spy(app1, 'setVisible');
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(true);
      MockAttentionScreen.mFullyVisible = true;

      app1.handleEvent({
        type: 'activityclosing'
      });

      assert.isTrue(spyLockOrientation.called);
      assert.isFalse(spySetVisible.called);
    });

    test('activityterminated event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var activity = new ActivityWindow({});
      app1.frontWindow = activity;
      app1.handleEvent({
        type: 'activityterminated'
      });

      assert.isNull(app1.frontWindow);
    });

    test('popupterminated event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var popup = new PopupWindow({});
      app1.frontWindow = popup;
      app1.handleEvent({
        type: 'popupterminated'
      });

      assert.isNull(app1.frontWindow);
    });
  });

  test('Change URL at run time', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var stubIsActive = this.sinon.stub(app1, 'isActive');
    stubIsActive.returns(true);
    app1.modifyURLatBackground('http://changed.url');
    assert.isTrue(app1.browser.element.src.indexOf('http://changed.url') < 0);

    stubIsActive.returns(false);
    app1.modifyURLatBackground('http://changed.url');
    assert.isTrue(app1.browser.element.src.indexOf('http://changed.url') >= 0);
  });

  test('Launch wrapper should have name from title config', function() {
    var app1 = new AppWindow(fakeWrapperConfig);
    this.sinon.clock.tick();
    assert.equal(app1.name, 'Fakebook');
    assert.equal(app1.identificationTitle.textContent, 'Fakebook');
  });

  test('revive browser', function() {
    var app1 = new AppWindow(fakeWrapperConfig);
    var stubPublish = this.sinon.stub(app1, 'publish');
    var stub_setVisble = this.sinon.stub(app1, '_setVisible');
    app1.browser = null;
    app1.reviveBrowser();
    assert.isNotNull(app1.browser);
    assert.isFalse(app1.suspended);
    assert.isTrue(stub_setVisble.calledWith(false));
    assert.isTrue(stubPublish.calledWith('resumed'));
  });

  test('destroy browser', function() {
    var app1 = new AppWindow(fakeWrapperConfig);
    var stubPublish = this.sinon.stub(app1, 'publish');
    app1.destroyBrowser();
    assert.isNull(app1.browser);
    assert.isTrue(app1.suspended);
    assert.isTrue(stubPublish.calledWith('suspended'));
  });

  test('set child window', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var child = new AppWindow(fakeAppConfig2);
    app1.setNextWindow(child);
    assert.deepEqual(app1.nextWindow, child);
    var childNew = new AppWindow(fakeAppConfig3);
    var stubKillOldChild = this.sinon.stub(child, 'kill');
    app1.setNextWindow(childNew);
    assert.isTrue(stubKillOldChild.called);
    assert.deepEqual(app1.nextWindow, childNew);
  });

  test('isBrowser', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var app2 = new AppWindow(fakeAppConfig4);
    assert.isFalse(app1.isBrowser());
    assert.isTrue(app2.isBrowser());
  });

  test('navigate', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var app2 = new AppWindow(fakeAppConfig4);
    var popup = new AppWindow(fakeAppConfig2);
    var url = 'http://changed.url';

    app1.navigate(url);
    assert.isTrue(app1.browser.element.src.indexOf(url) < 0);

    app2.navigate(url);
    assert.isTrue(app2.browser.element.src.indexOf(url) !== -1);

    app2.frontWindow = popup;
    app2.navigate(url);
    assert.isNull(app2.frontWindow);
  });

  test('showDefaultContextMenu', function() {
    var app = new AppWindow(fakeAppConfig1);
    // Nothing goes wrong if contextmenu is undefined
    app.showDefaultContextMenu();

    app.contextmenu = MockContextMenu;
    var stubCtx = this.sinon.stub(app.contextmenu, 'showDefaultMenu');
    app.showDefaultContextMenu();
    assert.isTrue(stubCtx.called);
  });

  function genFakeConfig(id) {
    return {
      url: 'app://www.fake' + id + '/index.html',
      manifest: {},
      manifestURL: 'app://wwww.fake' + id + '/ManifestURL',
      origin: 'app://www.fake' + id
    };
  }

  function openPopups(count) {
    var popups = [];
    for (var i = 0; i < count; i++) {
      popups.push(new AppWindow(genFakeConfig(i)));
      if (i > 0) {
        popups[i - 1].frontWindow = popups[i];
        popups[i].rearWindow = popups[i - 1];
      }
    }
    return popups;
  }

  suite('Kill embedded windows', function() {
    test('kill popup from root', function() {
      var popups = openPopups(3);
      var stubKill = this.sinon.stub(popups[2], 'kill');
      popups[0].kill();
      assert.isTrue(stubKill.called);
    });

    test('kill chain from a node', function() {
      var popups = openPopups(5);
      var stubKill = this.sinon.stub(popups[4], 'kill');
      popups[2].kill();
      assert.isTrue(stubKill.called);
    });
  });

  test('getTopMostWindow()', function() {
    var popups = openPopups(5);
    assert.deepEqual(popups[0].getTopMostWindow(), popups[4]);
    assert.deepEqual(popups[1].getTopMostWindow(), popups[4]);
    assert.deepEqual(popups[4].getTopMostWindow(), popups[4]);
  });

  test('getBottomMostWindow()', function() {
    var popups = openPopups(5);
    assert.deepEqual(popups[4].getBottomMostWindow(), popups[0]);
    assert.deepEqual(popups[3].getBottomMostWindow(), popups[0]);
    assert.deepEqual(popups[0].getBottomMostWindow(), popups[0]);
  });

  function openSheets(count) {
    var sheets = [];
    for (var i = 0; i < count; i++) {
      sheets.push(new AppWindow(genFakeConfig(i)));
      if (i > 0) {
        sheets[i - 1].nextWindow = sheets[i];
        sheets[i].previousWindow = sheets[i - 1];
      }
    }
    return sheets;
  }

  suite('Test child windows', function() {
    test('kill chain from root', function() {
      var sheets = openSheets(3);
      var stubKill = this.sinon.stub(sheets[2], 'kill');
      sheets[0].kill();
      assert.isTrue(stubKill.called);
    });

    test('kill chain from a node', function() {
      var sheets = openSheets(5);
      var stubKill = this.sinon.stub(sheets[4], 'kill');
      sheets[2].kill();
      assert.isTrue(stubKill.called);
    });

    test('get root and leaf window', function() {
      var sheets = openSheets(7);
      assert.equal(sheets[0].getLeafWindow(), sheets[6]);
      assert.equal(sheets[3].getRootWindow(), sheets[0]);
    });

    test('get active window', function() {
      var sheets = openSheets(7);
      var stubIsActive = this.sinon.stub(sheets[2], 'isActive');
      stubIsActive.returns(true);
      assert.equal(sheets[0].getActiveWindow(), sheets[2]);
    });

    test('get next window', function() {
      var sheets = openSheets(7);
      var stubIsActive = this.sinon.stub(sheets[2], 'isActive');
      stubIsActive.returns(true);
      assert.equal(sheets[0].getNext(), sheets[3]);
    });

    test('get previous window', function() {
      var sheets = openSheets(7);
      var stubIsActive = this.sinon.stub(sheets[2], 'isActive');
      stubIsActive.returns(true);
      assert.equal(sheets[0].getPrev(), sheets[1]);
    });
  });

  test('Popup is visible only when bottom and itself are both active',
    function() {
      var popups = openPopups(3);
      this.sinon.stub(popups[0], 'isActive').returns(false);
      this.sinon.stub(popups[1], 'isActive').returns(true);
      this.sinon.stub(popups[2], 'isActive').returns(true);
      assert.isFalse(popups[2].isVisible());

      var popups2 = openPopups(4);
      this.sinon.stub(popups2[0], 'isActive').returns(true);
      this.sinon.stub(popups2[1], 'isActive').returns(true);
      this.sinon.stub(popups2[2], 'isActive').returns(true);
      this.sinon.stub(popups2[3], 'isActive').returns(false);
      assert.isTrue(popups2[2].isVisible());
      assert.isFalse(popups2[3].isVisible());
    });
});
