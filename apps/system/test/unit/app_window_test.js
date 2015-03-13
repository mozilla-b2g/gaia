/* global AppWindow, ScreenLayout, MockService,
      MocksHelper, BaseModule, MockContextMenu,
      MockAppTransitionController, MockPermissionSettings, DocumentFragment,
      MockAudioChannelController, AppChrome */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_context_menu.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_app_chrome.js');
requireApp('system/test/unit/mock_screen_layout.js');
requireApp('system/test/unit/mock_app_transition_controller.js');
requireApp('system/test/unit/mock_audio_channel_controller.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/shared/test/unit/mocks/mock_permission_settings.js');

var mocksForAppWindow = new MocksHelper([
  'Applications', 'SettingsListener',
  'ManifestHelper', 'ScreenLayout', 'AppChrome',
  'AppTransitionController', 'Service'
]).init();

suite('system/AppWindow', function() {
  var realPermissionSettings;
  mocksForAppWindow.attachTestHelpers();

  var fakeDOMRequest = {
    onsuccess: function() {},
    onerror: function() {},
    then: function(success, error) {
      this.onsuccess = function(evt) {
        success(evt.target.result);
      };
      this.onerror = function() {
        error();
      };
    }
  };

  setup(function(done) {
    this.sinon.useFakeTimers();

    window.Service = MockService;

    realPermissionSettings = navigator.mozPermissionSettings;
    navigator.mozPermissionSettings = MockPermissionSettings;
    MockPermissionSettings.mSetup();

    this.sinon.stub(document, 'getElementById', function() {
      return document.createElement('div');
    });
    this.sinon.stub(DocumentFragment.prototype, 'getElementById', function() {
      return document.createElement('div');
    });

    this.sinon.stub(HTMLElement.prototype, 'querySelector',
    function() {
      return document.createElement('div');
    });
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/base_module.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js', function() {
      this.sinon.stub(BaseModule, 'instantiate', function(name) {
        if (name === 'BrowserContextMenu') {
          return MockContextMenu;
        }
      });
      done();
    }.bind(this));
  });

  teardown(function() {
    navigator.mozPermissionSettings = realPermissionSettings;
    delete window.Service;
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

  var fakePrivateConfig = {
    url: 'http://www.private/index.html',
    manifest: null,
    origin: 'http://www.private',
    isPrivate: true
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

  var fakeSearchAppConfig = {
    url: 'app://search.gaiamobile.org/newtab.html',
    manifest: {
      role: 'search'
    },
    manifestURL: 'app://search.gaiamobile.org/ManifestURL',
    origin: 'app://search.gaiamobile.org'
  };

  var fakeWrapperConfig = {
    url: 'http://www.fake5/index.html',
    origin: 'http://www.fake5',
    title: 'Fakebook'
  };

  var fakeChromeConfigWithoutNavigation = {
    url: 'http://www.fakeChrome2/index.html',
    origin: 'http://www.fakeChrome2',
    manifest: {
      chrome: { 'navigation': false }
    }
  };

  var fakeChromeConfigWithNavigationBar = {
    url: 'http://www.fakeChrome2/index.html',
    origin: 'http://www.fakeChrome2',
    manifest: {
      chrome: { 'navigation': false, 'bar': true }
    }
  };

  var fakeAppConfigCertified = {
    url: 'app://www.fakecertified/index.html',
    manifest: {
      type: 'certified'
    },
    origin: 'app://www.fake4'
  };

  var fakeInputAppConfig = {
    url: 'app://www.fakeinput/index.html',
    manifest: {},
    manifestURL: 'app://www.fakeinput/ManifestURL',
    origin: 'app://www.fakeinput',
    isInputMethod: true
  };

  test('Sanity check instances dont share .element', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var app2 = new AppWindow(fakeAppConfig2);
    assert.isFalse(app1.element === app2.element);
  });

  test('App created with instanceID', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var app2 = new AppWindow(fakeAppConfig2);
    assert.isTrue(app1.instanceID !== app2.instanceID);
  });

  test('Automatically enable navigation for a brower window.', function() {
    var app1 = new AppWindow(fakeWrapperConfig);
    assert.equal(app1.config.chrome.scrollable, true);
  });

  test('setActive', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var app2 = new AppWindow(fakeAppConfig2);
    this.sinon.stub(app2, '_setActive');
    this.sinon.stub(app1, 'getTopMostWindow').returns(app2);
    app1.setActive(true);
    assert.isTrue(app2._setActive.calledWith(true));
  });

  suite('Resize', function() {
    var app1;
    setup(function() {
      app1 = new AppWindow(fakeAppConfig1);
      // Inject mozBrowser API to app iframe
      injectFakeMozBrowserAPI(app1.browser.element);
      this.sinon.stub(app1.browser.element, 'addNextPaintListener');
    });
    teardown(function() {});

    test('Resize in foreground', function(done) {
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      this.sinon.stub(app1, 'reviveBrowser');
      stubIsActive.returns(true);
      var p = app1.resize();
      assert.isTrue(app1.resized);
      assert.isTrue(app1.reviveBrowser.called);

      assert.isTrue(app1.browser.element.addNextPaintListener.calledOnce);
      app1.browser.element.addNextPaintListener.firstCall.args[0]();
      p.catch((e) => { throw e || 'Should not reject'; }).then(done, done);
    });

    test('Resize in background', function() {
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(false);
      app1.resize();
      assert.isUndefined(app1.resized);

      assert.isFalse(app1.browser.element.addNextPaintListener.calledOnce);
    });

    test('Resize if we are fullscreen', function(done) {
      MockService.mockQueryWith('getHeightFor', 480);
      var stubIsFullScreen = this.sinon.stub(app1, 'isFullScreen');
      stubIsFullScreen.returns(true);
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(true);
      var p = app1.resize();
      assert.equal(app1.height, MockService.mockQueryWith('getHeightFor'));

      assert.isTrue(app1.browser.element.addNextPaintListener.calledOnce);
      app1.browser.element.addNextPaintListener.firstCall.args[0]();
      p.catch((e) => { throw e || 'Should not reject'; }).then(done, done);
    });

    test('Resize if we are not fullscreen', function(done) {
      MockService.mockQueryWith('getHeightFor', 430);
      var stubIsFullScreen = this.sinon.stub(app1, 'isFullScreen');
      stubIsFullScreen.returns(false);
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(true);
      var p = app1.resize();
      assert.equal(app1.height, MockService.mockQueryWith('getHeightFor'));

      assert.isTrue(app1.browser.element.addNextPaintListener.calledOnce);
      app1.browser.element.addNextPaintListener.firstCall.args[0]();
      p.catch((e) => { throw e || 'Should not reject'; }).then(done, done);
    });

    test('Send message to appChrome: w/o keyboard', function(done) {
      MockService.mockQueryWith('keyboardEnabled', false);
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      var stubbroadcast = this.sinon.stub(app1, 'broadcast');
      stubIsActive.returns(true);
      var p = app1.resize();
      assert.isTrue(stubbroadcast.calledWith('withoutkeyboard'));

      assert.isTrue(app1.browser.element.addNextPaintListener.calledOnce);
      app1.browser.element.addNextPaintListener.firstCall.args[0]();
      p.catch((e) => { throw e || 'Should not reject'; }).then(done, done);
    });

    test('Send message to appChrome: w/ keyboard', function(done) {
      MockService.mockQueryWith('keyboardEnabled', true);
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      var stubbroadcast = this.sinon.stub(app1, 'broadcast');
      stubIsActive.returns(true);
      var p = app1.resize();
      assert.isTrue(stubbroadcast.calledWith('withkeyboard'));

      app1.browser.element.addNextPaintListener.firstCall.args[0]();
      p.catch((e) => { throw e || 'Should not reject'; }).then(done, done);
    });

    test('Reset the screenshot overlay visibilty', function(done) {
      app1.screenshotOverlay.style.visibility = 'hidden';
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      stubIsActive.returns(true);
      var p = app1.resize();
      assert.equal(app1.screenshotOverlay.style.visibility, '');

      assert.isTrue(app1.browser.element.addNextPaintListener.calledOnce);
      app1.browser.element.addNextPaintListener.firstCall.args[0]();
      p.catch((e) => { throw e || 'Should not reject'; }).then(done, done);
    });

    test('No navigation setting in manifest', function() {
      var spy = this.sinon.spy(window, 'AppChrome');
      new AppWindow(fakeChromeConfigWithoutNavigation); // jshint ignore:line
      assert.isFalse(spy.calledWithNew());
    });

    test('No navigation setting in manifest - app - appChrome', function() {
      var spy = this.sinon.spy(window, 'AppChrome');
      var aw = new AppWindow(fakeChromeConfigWithoutNavigation);
      assert.isFalse(spy.calledWithNew());
      aw.element.dispatchEvent(new CustomEvent('_opened'));
      assert.isTrue(spy.calledWithNew());
    });

    test('No navigation setting in manifest - wrapper - appChrome', function() {
      var spy = this.sinon.spy(window, 'AppChrome');
      new AppWindow(fakeWrapperConfig); // jshint ignore:line
      assert.isTrue(spy.calledWithNew());
    });

    test('Navigation bar in manifest - appChrome', function() {
      var spy = this.sinon.spy(window, 'AppChrome');
      var aw = new AppWindow(fakeChromeConfigWithNavigationBar);
      aw.element.dispatchEvent(new CustomEvent('_opened'));
      assert.isTrue(spy.calledWithNew());
    });

    test('resize to bottom window thru top most window', function(done) {
      var popups = openPopups(5);
      injectFakeMozBrowserAPI(popups[0].browser.element);
      this.sinon.stub(popups[0].browser.element, 'addNextPaintListener');
      injectFakeMozBrowserAPI(popups[1].browser.element);
      this.sinon.stub(popups[1].browser.element, 'addNextPaintListener');
      injectFakeMozBrowserAPI(popups[2].browser.element);
      this.sinon.stub(popups[2].browser.element, 'addNextPaintListener');
      injectFakeMozBrowserAPI(popups[3].browser.element);
      this.sinon.stub(popups[3].browser.element, 'addNextPaintListener');
      injectFakeMozBrowserAPI(popups[4].browser.element);
      this.sinon.stub(popups[4].browser.element, 'addNextPaintListener');
      var stubAppIsActive = this.sinon.stub(popups[0], 'isActive');
      stubAppIsActive.returns(true);
      var p = popups[0].resize();

      assert.isTrue(popups[0].browser.element.addNextPaintListener.calledOnce);
      popups[0].browser.element.addNextPaintListener.firstCall.args[0]();
      assert.isTrue(popups[1].browser.element.addNextPaintListener.calledOnce);
      popups[1].browser.element.addNextPaintListener.firstCall.args[0]();
      assert.isTrue(popups[2].browser.element.addNextPaintListener.calledOnce);
      popups[2].browser.element.addNextPaintListener.firstCall.args[0]();
      assert.isTrue(popups[3].browser.element.addNextPaintListener.calledOnce);
      popups[3].browser.element.addNextPaintListener.firstCall.args[0]();
      assert.isTrue(popups[4].browser.element.addNextPaintListener.calledOnce);
      popups[4].browser.element.addNextPaintListener.firstCall.args[0]();

      p.then(() => undefined, (e) => { throw e || 'Should not reject'; })
        .then(done, done);
    });
  });

  suite('Render', function() {
    var visibleSpy;

    setup(function() {
      visibleSpy = this.sinon.stub(AppWindow.prototype, 'setVisible');
    });

    test('apps with background flag launched in background', function() {
      new AppWindow(fakeAppConfigBackground); // jshint ignore:line
      sinon.assert.calledWith(visibleSpy, false);
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
        MockService.mockQueryWith('defaultOrientation', 'portrait-primary');
        MockService.mockQueryWith('globalOrientation', null);
        stubScreenMozLockOrientation =
          this.sinon.stub(screen, 'mozLockOrientation');
        stubScreenMozUnlockOrientation =
          this.sinon.stub(screen, 'mozUnlockOrientation');
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
      MockService.mockQueryWith('defaultOrientation', 'portrait-primary');
      MockService.mockQueryWith('isDefaultPortrait', true);
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
      MockService.mockQueryWith('defaultOrientation', 'landscape-primary');
      MockService.mockQueryWith('isDefaultPortrait', false);
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
      MockService.mockQueryWith('defaultOrientation', 'portrait-primary');
      MockService.mockQueryWith('fetchCurrentOrientation', 'portrait-primary');
      MockService.mockQueryWith('isDefaultPortrait', true);
      var app1 = new AppWindow(fakeAppConfig1);
      var angle1 = app1.determineClosingRotationDegree();
      assert.equal(angle1, 0);

      MockService.mockQueryWith('fetchCurrentOrientation',
        'portrait-secondary');
      var angle2 = app1.determineClosingRotationDegree();
      assert.equal(angle2, 180);

      MockService.mockQueryWith('fetchCurrentOrientation', 'landscape-primary');
      var angle3 = app1.determineClosingRotationDegree();
      assert.equal(angle3, 270);

      MockService.mockQueryWith('fetchCurrentOrientation',
        'landscape-secondary');
      var angle4 = app1.determineClosingRotationDegree();
      assert.equal(angle4, 90);
    });

    test('closing Rotation Degree / default is landscape-primary', function() {
      MockService.mockQueryWith('defaultOrientation', 'landscape-primary');
      MockService.mockQueryWith('fetchCurrentOrientation', 'portrait-primary');
      MockService.mockQueryWith('isDefaultPortrait', false);
      var app1 = new AppWindow(fakeAppConfig1);
      var angle1 = app1.determineClosingRotationDegree();
      assert.equal(angle1, 90);

      MockService.mockQueryWith('fetchCurrentOrientation',
        'portrait-secondary');
      var angle2 = app1.determineClosingRotationDegree();
      assert.equal(angle2, 270);

      MockService.mockQueryWith('fetchCurrentOrientation', 'landscape-primary');
      var angle3 = app1.determineClosingRotationDegree();
      assert.equal(angle3, 0);

      MockService.mockQueryWith('fetchCurrentOrientation',
        'landscape-secondary');
      var angle4 = app1.determineClosingRotationDegree();
      assert.equal(angle4, 180);
    });
  });

  suite('Fullscreen, FullscreenLayout', function() {
    var fakeAppConfig1FullScreen = {
      url: 'app://www.fake/index.html',
      manifest: {
        'fullscreen': true
      },
      manifestURL: 'app://wwww.fake/ManifestURL',
      origin: 'app://www.fake'
    };

    var fakeAppConfig1FullScreenLayout = {
      url: 'app://www.fake/index.html',
      manifest: {
        'fullscreen_layout': true
      },
      manifestURL: 'app://wwww.fake/ManifestURL',
      origin: 'app://www.fake'
    };

    var fakeWrapper = {
      url: 'app://www.fake.com/index.html',
      origin: 'app://www.fake.com'
    };

    test('isFullScreen', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      assert.isFalse(app1.isFullScreen());
      assert.isFalse(app1.element.classList.contains('fullscreen-app'));

      var appW = new AppWindow(fakeWrapper);
      assert.isFalse(appW.isFullScreen());
      assert.isFalse(appW.element.classList.contains('fullscreen-app'));

      var app1f = new AppWindow(fakeAppConfig1FullScreen);
      assert.isTrue(app1f.isFullScreen());
      assert.isTrue(app1f.element.classList.contains('fullscreen-app'));

      var app1fl = new AppWindow(fakeAppConfig1FullScreenLayout);
      assert.isTrue(app1fl.isFullScreen());
      assert.isTrue(app1fl.element.classList.contains('fullscreen-app'));
    });

    test('isFullScreenLayout', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      assert.isFalse(app1.isFullScreenLayout());

      var appW = new AppWindow(fakeWrapper);
      assert.isFalse(appW.isFullScreenLayout());
      assert.isFalse(app1.element.classList.contains('fullscreen-app'));

      var app1f = new AppWindow(fakeAppConfig1FullScreenLayout);
      assert.isTrue(app1f.isFullScreenLayout());
    });
  });

  suite('Display Modes', function() {
    var fakeAppConfigDisplayMinimalUi = {
      url: 'http://www.fake/index.html',
      manifest: {
        'display': 'minimal-ui'
      },
      manifestURL: 'app://wwww.fake/ManifestURL',
      origin: 'app://www.fake'
    };

    var fakeAppConfigDisplayStandalone = {
      url: 'http://www.fake/index.html',
      manifest: {
        'display': 'standalone'
      },
      manifestURL: 'app://wwww.fake/ManifestURL',
      origin: 'app://www.fake'
    };

    var fakeAppConfigDisplayFullscreen = {
      url: 'http://www.fake/index.html',
      manifest: {
        'display': 'fullscreen'
      },
      manifestURL: 'app://wwww.fake/ManifestURL',
      origin: 'app://www.fake'
    };

    test('minimal-ui', function() {
      var app1 = new AppWindow(fakeAppConfigDisplayMinimalUi);
      assert.isFalse(app1.isFullScreen());
      assert.isTrue(app1.config.chrome.scrollable);
      assert.isTrue(app1.config.chrome.maximized);
    });

    test('standalone', function() {
      var app1 = new AppWindow(fakeAppConfigDisplayStandalone);
      assert.isFalse(app1.isFullScreen());
      assert.isFalse(app1.config.chrome.scrollable);
      assert.isFalse(app1.config.chrome.maximized);
    });

    test('fullscreen', function() {
      var app1 = new AppWindow(fakeAppConfigDisplayFullscreen);
      assert.isTrue(app1.isFullScreen());
      assert.isFalse(app1.config.chrome.scrollable);
      assert.isFalse(app1.config.chrome.maximized);
    });
  });

  suite('ScreenshotOverlay State Control', function() {
    var app1;
    var app2;
    setup(function() {
      app1 = new AppWindow(fakeAppConfig1);
      app2 = new AppWindow(fakeAppConfig2);
      // Inject mozBrowser API to app iframe
      injectFakeMozBrowserAPI(app1.browser.element);
    });

    test('when cards view is shown and hidden', function() {
      var fakeScreenshotBlob = 'blob:d3958f5c-0777-0845-9dcf-2cb28783acaf';
      this.sinon.stub(app1, 'requestScreenshotURL', function() {
        return fakeScreenshotBlob;
      });

      app1.element.dispatchEvent(new CustomEvent('_cardviewbeforeshow'));
      assert.isTrue(app1.screenshotOverlay.classList.contains('visible'),
                    'Overlay should be visible after beforeshow is received');
      assert.isFalse(app1.element.classList.contains('no-screenshot'),
                    'Shouldnt have no-screenshot class when there is one');

      app1.element.dispatchEvent(new CustomEvent('_cardviewclosed'));
      assert.isFalse(app1.screenshotOverlay.classList.contains('visible'),
                     'Overlay should be hidden after closed is received');
    });

    test('when cards view is shown and theres no screenshot', function() {
      this.sinon.stub(app1, 'requestScreenshotURL', function() {
        return null;
      });
      app1.element.dispatchEvent(new CustomEvent('_cardviewbeforeshow'));
      assert.isTrue(app1.element.classList.contains('no-screenshot'),
                    'has no-screenshot class ' +
                    'when requestScreenshotURL returns falsey');

      app1.element.dispatchEvent(new CustomEvent('_cardviewshown'));
      app1.element.dispatchEvent(new CustomEvent('_cardviewclosed'));
      assert.isFalse(app1.element.classList.contains('no-screenshot'),
                    'removes no-screenshot class');
    });

    test('show overlay when revealed by an edge swipe', function() {
      app1.screenshotOverlay.classList.remove('visible');
      app1.element.dispatchEvent(new CustomEvent('_sheetdisplayed'));
      assert.isTrue(app1.screenshotOverlay.classList.contains('visible'),
                    'Overlay should be visible after sheetdisplayed');
    });

    test('hide overlay when a sheet gesture ends', function() {
      app1.screenshotOverlay.classList.add('visible');
      app1.element.dispatchEvent(new CustomEvent('_sheetsgestureend'));
      assert.isFalse(app1.screenshotOverlay.classList.contains('visible'));
      assert.isFalse(app1.element.classList.contains('overlay'));
    });

    test('hide overlay when a sheet gesture ends even if the app is active',
    function() {
      this.sinon.stub(app1, 'isActive').returns(true);
      app1.screenshotOverlay.classList.add('visible');
      app1.element.dispatchEvent(new CustomEvent('_sheetsgestureend'));
      assert.isFalse(app1.screenshotOverlay.classList.contains('visible'));
      assert.isFalse(app1.element.classList.contains('overlay'));
    });

    test('showScreenshotOverlay', function() {
      var stubRequestScreenshotURL =
        this.sinon.stub(app1, 'requestScreenshotURL');
      app1._showScreenshotOverlay();
      assert.isTrue(stubRequestScreenshotURL.called);
      assert.isTrue(app1.screenshotOverlay.classList.contains('visible'));
    });

    test('show the frontest app ScreenshotOverlay', function() {
      app1.frontWindow = app2;
      this.sinon.stub(app2, 'isActive').returns(true);
      var stubRequestScreenshotURL =
        this.sinon.stub(app2, 'requestScreenshotURL');
      app1._showScreenshotOverlay();
      assert.isTrue(stubRequestScreenshotURL.called);
      assert.isTrue(app2.screenshotOverlay.classList.contains('visible'));
    });

    test('should not show the frontest app ScreenshotOverlay if it is ' +
         'not active', function() {
      app1.frontWindow = app2;
      this.sinon.stub(app2, 'isActive').returns(false);
      app1._showScreenshotOverlay();
      assert.isFalse(app2.screenshotOverlay.classList.contains('visible'));
    });

    test('should return promise and resolve directly if the frontest app is' +
         ' active and its screenshot is visible', function(done) {
      app1.frontWindow = app2;
      this.sinon.stub(app2, 'isActive').returns(true);
      app2.screenshotOverlay.classList.add('visible');
      app1._showScreenshotOverlay().then(() => {
        done();
      });
    });

    test('hideScreenshotOverlay', function() {
      app1.screenshotOverlay.classList.add('visible');
      app1.element.classList.add('overlay');
      app1._hideScreenshotOverlay();
      assert.isFalse(app1.screenshotOverlay.classList.contains('visible'));

      assert.isTrue(app1.element.classList.contains('overlay'));
      this.sinon.clock.tick(); // We wait for the next tick
      assert.isFalse(app1.element.classList.contains('overlay'));
    });

    test('hideScreenshotOverlay and its front window', function() {
      app1.frontWindow = app2;
      this.sinon.stub(app2, 'isActive').returns(true);
      app2.screenshotOverlay.classList.add('visible');
      app1.screenshotOverlay.classList.add('visible');
      app2.element.classList.add('overlay');
      app1.element.classList.add('overlay');
      app1._hideScreenshotOverlay();
      assert.isFalse(app1.screenshotOverlay.classList.contains('visible'));
      assert.isFalse(app2.screenshotOverlay.classList.contains('visible'));
      assert.isTrue(app1.element.classList.contains('overlay'));
      assert.isTrue(app2.element.classList.contains('overlay'));
      this.sinon.clock.tick(); // We wait for the next tick
      assert.isFalse(app1.element.classList.contains('overlay'));
      assert.isFalse(app2.element.classList.contains('overlay'));
    });

    test('hideScreenshotOverlay noop when the screenshot is not displayed',
    function() {
      app1._screenshotOverlayState = 'none';
      app1.screenshotOverlay.classList.remove('visible');
      app1.element.classList.add('overlay');
      app1._hideScreenshotOverlay();

      this.sinon.clock.tick(); // We wait for the next tick
      assert.isTrue(app1.element.classList.contains('overlay'));
    });

    test('Request screenshotURL', function() {
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

    test('Show identification overlay when showing screenshot', function() {
      app1._showScreenshotOverlay();
      assert.isTrue(app1.element.classList.contains('overlay'));
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
      var transitionController = new MockAppTransitionController();
      app1.transitionController = transitionController;
      var stubRequireOpen =
        this.sinon.stub(transitionController, 'requireOpen');
      app1.open();
      assert.isTrue(stubRequireOpen.called);
      app1.open('Orz');
      assert.isTrue(stubRequireOpen.calledWith('Orz'));
    });

    test('Close', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var transitionController = new MockAppTransitionController();
      app1.transitionController = transitionController;
      var stubRequireClose =
        this.sinon.stub(transitionController, 'requireClose');
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

  test('Focus should be delivered to front active window', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var app2 = new AppWindow(fakeAppConfig2);
    var stubFrontFocus = this.sinon.stub(app2, 'focus');
    app1.frontWindow = app2;
    this.sinon.stub(app1, 'isActive').returns(true);
    this.sinon.stub(app2, 'isActive').returns(true);
    app1.broadcast('focus');

    assert.isTrue(stubFrontFocus.called);
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

  test('get Private Browser Splash Icon', function() {
    var app = new AppWindow(fakePrivateConfig);
    assert.isTrue(app._splash.indexOf('pb_icon.png') !== -1);
  });

  var fakeMozBrowserIframe = {
    focus: function() {},
    blur: function() {},
    setVisible: function() {},
    setVisibleForScreenReader: function() {},
    goBack: function() {},
    goForward: function() {},
    reload: function() {},
    stop: function() {},
    getCanGoForward: function() {
      return fakeDOMRequest;
    },
    getCanGoBack: function() {
      return fakeDOMRequest;
    },
    getScreenshot: function() {
      return fakeDOMRequest;
    },
    addNextPaintListener: function() {},
    removeNextPaintListener: function() {},
    setActive: function() {},
    setNFCFocus: function() {}
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
      app1.screenshotOverlay.classList.add('visible');
      app1.ready(callback);
      assert.isFalse(stubEnsureFullRepaint.called);
      assert.isFalse(stubWaitForNextPaint.called);
      this.sinon.clock.tick(0);
      assert.isTrue(callback.calledOnce);
    });

  suite('ready', function() {
    var app1;
    var stubWaitForNextPaint;
    var stubEnsureFullRepaint;
    var showScreenshotOverlay;

    setup(function() {
      app1 = new AppWindow(fakeAppConfig1);
      stubWaitForNextPaint = this.sinon.stub(app1, 'waitForNextPaint');
      stubEnsureFullRepaint = this.sinon.stub(app1, 'tryWaitForFullRepaint');
      showScreenshotOverlay = this.sinon.stub(app1, '_showScreenshotOverlay');
      app1.loaded = true;
    });

    teardown(function() {
      stubWaitForNextPaint.restore();
      stubEnsureFullRepaint.restore();
      showScreenshotOverlay.restore();
    });

    test('Full repaint', function() {
      var callback = this.sinon.spy();
      app1.ready(callback);
      assert.isTrue(stubEnsureFullRepaint.called);
      assert.isTrue(stubWaitForNextPaint.called);
      stubEnsureFullRepaint.getCall(0).args[0]();
      stubWaitForNextPaint.getCall(0).args[0]();
      this.sinon.clock.tick(0);
      assert.isTrue(callback.calledOnce);
    });

    test('Call _showScreenshotOverlay', function() {
      app1._screenshotBlob = 'fakeBlob';
      app1.ready();
      assert.isTrue(showScreenshotOverlay.calledOnce);
    });

    test('Do not call _showScreenshotOverlay', function() {
      app1._screenshotBlob = null;
      app1.ready();
      assert.isFalse(showScreenshotOverlay.called);
    });
  });

  suite('Browser Mixin', function() {
    var fakeDOMRequest;

    setup(function() {
      fakeDOMRequest = {
        onsuccess: function() {},
        onerror: function() {}
      };
    });

    test('MozBrowser API: setActive', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      this.sinon.stub(app1.browser.element, 'setActive');
      MockService.mockQueryWith('getTopMostUI', { name: 'Rocketbar' });
      app1._setActive(false);
      assert.isTrue(app1.browser.element.setActive.calledWith(false));
      MockService.mockQueryWith('getTopMostUI', { name: 'AppWindowManager' });
      app1._setActive(true);
      assert.isTrue(app1.browser.element.setActive.calledWith(true));
    });

    test('MozBrowser API: simple methods', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      var stubBack = this.sinon.stub(app1.browser.element, 'goBack');
      var stubForward = this.sinon.stub(app1.browser.element, 'goForward');
      var stubReload = this.sinon.stub(app1.browser.element, 'reload');
      var stubStop = this.sinon.stub(app1.browser.element, 'stop');

      app1.back();
      assert.isTrue(stubBack.called);
      app1.forward();
      assert.isTrue(stubForward.called);
      app1.reload();
      assert.isTrue(stubReload.called);
      app1.stop();
      assert.isTrue(stubStop.called);
    });

    suite('focus/blur', function() {
      var app1;
      var stubBlur;
      var stubFocus;

      setup(function() {
        app1 = new AppWindow(fakeAppConfig1);
        stubBlur = this.sinon.stub(app1.browser.element, 'blur');
        stubFocus = this.sinon.stub(app1.browser.element, 'focus');
      });

      teardown(function() {
        stubBlur.restore();
        stubFocus.restore();
      });

      test('blur should not be called without focus', function() {
        var stub = this.sinon.stub(app1, 'getActiveElement', function() {
          return document.body;
        });
        app1.blur();
        assert.isFalse(stubBlur.called);
        stub.restore();
      });

      test('blur should be called with focus', function() {
        var stub = this.sinon.stub(app1, 'getActiveElement', function() {
          return app1.browser.element;
        });
        app1.blur();
        assert.isTrue(stubBlur.called);
        stub.restore();
      });

      test('focus should be called without focus', function() {
        var stub = this.sinon.stub(app1, 'getActiveElement', function() {
          return document.body;
        });
        app1.focus();
        assert.isTrue(stubFocus.called);
        stub.restore();
      });

      test('focus should not be called with focus', function() {
        var stub = this.sinon.stub(app1, 'getActiveElement', function() {
          return app1.browser.element;
        });
        app1.focus();
        assert.isFalse(stubFocus.called);
        stub.restore();
      });
    });

    suite('focus and context menu', function() {
      var app1;
      var stubFocus;

      setup(function() {
        app1 = new AppWindow(fakeAppConfig1);
        injectFakeMozBrowserAPI(app1.browser.element);
        stubFocus = this.sinon.stub(app1.browser.element, 'focus');
      });

      teardown(function() {
        stubFocus.restore();
        app1.contextmenu = undefined;
      });

      test('Context menu is not shown', function() {
        app1.focus();
        assert.isTrue(stubFocus.called);
      });

      test('Context menu is shown', function() {
        app1.contextmenu = {
          isShown: function() {
            return true;
          },
          focus: function() {

          }
        };

        var stubContextMenuFocus = this.sinon.stub(app1.contextmenu, 'focus');
        app1.focus();
        assert.isFalse(stubFocus.called);
        assert.isTrue(stubContextMenuFocus.called);
        stubContextMenuFocus.restore();
      });
    });

    test('MozBrowser API: getScreenshot', function() {
      MockService.mockQueryWith('LayoutManager.width', 320);
      MockService.mockQueryWith('LayoutManager.height', 480);
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      var stubScreenshot = this.sinon.stub(app1.browser.element,
        'getScreenshot').returns(fakeDOMRequest);

      stubScreenshot.returns(fakeDOMRequest);

      var callback1 = this.sinon.spy();
      app1.getScreenshot(callback1);
      sinon.assert.calledWith(stubScreenshot,
         sinon.match.number, sinon.match.number, 'image/jpeg');
      fakeDOMRequest.onsuccess({ target: { result: 'fakeBlob' } });
      assert.equal(app1._screenshotBlob, 'fakeBlob');
      assert.isTrue(callback1.calledWith('fakeBlob'));

      fakeDOMRequest.onerror();
      assert.isTrue(callback1.called);
    });

    test('MozBrowser API: getScreenshot (with frontWindow active)', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var app2 = new AppWindow(fakeAppConfig2);

      injectFakeMozBrowserAPI(app1.browser.element);
      injectFakeMozBrowserAPI(app2.browser.element);
      var stubScreenshot = this.sinon.stub(app1.browser.element,
        'getScreenshot').returns(fakeDOMRequest);
      var stubScreenshot2 = this.sinon.stub(app2.browser.element,
        'getScreenshot').returns(fakeDOMRequest);

      var callback1 = this.sinon.spy();
      app1.frontWindow = app2;
      app1.getScreenshot(callback1);

      assert.isFalse(stubScreenshot.called);
      assert.isTrue(stubScreenshot2.called);
      fakeDOMRequest.onsuccess({ target: { result: 'fakeBlob' } });
      assert.equal(app2._screenshotBlob, 'fakeBlob');
      assert.isTrue(callback1.calledWith('fakeBlob'));

      fakeDOMRequest.onerror();
      assert.isTrue(callback1.called);
    });

    test('MozBrowser API: getScreenshot (ignore frontWindow)', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var app2 = new AppWindow(fakeAppConfig2);

      injectFakeMozBrowserAPI(app1.browser.element);
      injectFakeMozBrowserAPI(app2.browser.element);
      var stubScreenshot = this.sinon.stub(app1.browser.element,
        'getScreenshot').returns(fakeDOMRequest);
      var stubScreenshot2 = this.sinon.stub(app2.browser.element,
        'getScreenshot').returns(fakeDOMRequest);

      var callback1 = this.sinon.spy();
      app1.frontWindow = app2;
      app1.getScreenshot(callback1, null, null, null, true);

      assert.isTrue(stubScreenshot.called);
      assert.isFalse(stubScreenshot2.called);
      fakeDOMRequest.onsuccess({ target: { result: 'fakeBlob' } });
      assert.equal(app1._screenshotBlob, 'fakeBlob');
      assert.isTrue(callback1.calledWith('fakeBlob'));

      fakeDOMRequest.onerror();
      assert.isTrue(callback1.called);
    });

    test('MozBrowser API: getScreenshot for homescreen', function() {
      MockService.mockQueryWith('LayoutManager.width', 320);
      MockService.mockQueryWith('LayoutManager.height', 480);
      var home = new AppWindow(fakeAppConfig1);
      home.isHomescreen = true;

      injectFakeMozBrowserAPI(home.browser.element);
      var stubScreenshot = this.sinon.stub(home.browser.element,
        'getScreenshot').returns(fakeDOMRequest);

      home.getScreenshot();

      // should take screenshot blob with png fromat
      sinon.assert.calledWith(stubScreenshot,
        sinon.match.number, sinon.match.number, 'image/png');
    });

    test('MozBrowser API: getGoForward', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      var stubCanGoForward = this.sinon.stub(app1.browser.element,
        'getCanGoForward').returns(fakeDOMRequest);

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
      var stubCanGoBack = this.sinon.stub(app1.browser.element,
        'getCanGoBack').returns(fakeDOMRequest);

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

    test('MozBrowser API: NextPaint (pass callback)', function() {
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

    test('MozBrowser API: NextPaint (Promise)', function(done) {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      var stubAddNextPaintListener = this.sinon.stub(app1.browser.element,
        'addNextPaintListener');

      var p = app1.waitForNextPaint();
      assert.isTrue(stubAddNextPaintListener.called);
      stubAddNextPaintListener.getCall(0).args[0]();
      p.then(function() {
        var p2 = app1.waitForNextPaint();
        this.sinon.clock.tick(app1.NEXTPAINT_TIMEOUT);

        return p2;
      }.bind(this)).then(done, done);
    });
  });

  suite('setVisible', function() {
    test('setVisible: true should revive browser', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      app1.setVisible(false);
      this.sinon.stub(app1, 'reviveBrowser');

      app1.setVisible(true);
      assert.isTrue(app1.reviveBrowser.called);
    });

    test('setVisible: true', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      app1.setVisible(false);

      var stub_showFrame = this.sinon.stub(app1,
        '_showFrame');

      app1.setVisible(true);
      assert.isFalse(app1.screenshotOverlay.classList.contains('visible'));
      assert.isTrue(stub_showFrame.called);
    });

    test('setVisible: true, multiple times', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      app1.setVisible(false);

      var stub_showFrame = this.sinon.stub(app1,
        '_showFrame');

      app1.setVisible(true);
      this.sinon.clock.tick();
      app1.setVisible(true);
      assert.isFalse(app1.screenshotOverlay.classList.contains('visible'));
      assert.isTrue(stub_showFrame.calledOnce);
    });

    test('setVisible: false', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      var stub_hideFrame = this.sinon.stub(app1,
        '_hideFrame');

      app1.setVisible(false);
      assert.isTrue(stub_hideFrame.called);
    });

    test('setVisible: false, multiple times', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      var stub_hideFrame = this.sinon.stub(app1,
        '_hideFrame');

      app1.setVisible(false);
      this.sinon.clock.tick();
      app1.setVisible(false);
      assert.isTrue(stub_hideFrame.calledOnce);
    });

    test('setVisible to front window', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var app2 = new AppWindow(fakeAppConfig2);
      app1.setVisible(false);

      var stubApp2SetVisible = this.sinon.stub(app2, 'setVisible');
      app1.frontWindow = app2;
      this.sinon.stub(app2, 'isActive').returns(true);
      app2.rearWindow = app1;

      app1.setVisible(true);
      assert.isTrue(stubApp2SetVisible.calledWith(true));

      app1.setVisible(false);
      assert.isTrue(stubApp2SetVisible.calledWith(false));
    });

    test('doNotPropagate', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var app2 = new AppWindow(fakeAppConfig2);
      app1.setVisible(false);

      this.sinon.stub(app2, 'setVisible');
      app1.frontWindow = app2;
      this.sinon.stub(app2, 'isActive').returns(true);
      app2.rearWindow = app1;
      app1.setVisible(true, true);
      assert.isFalse(app2.setVisible.called);
    });

    test('setVisible: homescreen', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      app1.isHomescreen = true;
      app1.setVisible(true);

      var stub_hideFrame = this.sinon.stub(app1,
        '_hideFrame');

      app1.setVisible(false);
      assert.isFalse(app1.screenshotOverlay.classList.contains('visible'));
      assert.isTrue(stub_hideFrame.calledOnce);
    });

    test('setVisible: homescreen child', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var app2 = new AppWindow(fakeAppConfig2);
      app1.frontWindow = app2;
      app2.rearWindow = app1;
      app1.isHomescreen = true;

      app1.setVisible(false);
      assert.isFalse(app1.screenshotOverlay.classList.contains('visible'));
      assert.isFalse(app2.screenshotOverlay.classList.contains('visible'));
    });

    test('setVisible: called twice', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      app1.setVisible(false);
      var stubMixinSetVisible = this.sinon.stub(app1, '_setVisible');

      app1.setVisible(true);
      assert.isTrue(stubMixinSetVisible.calledOnce,
                    'should call _setVisible once!');

      app1.setVisible(true);
      assert.isTrue(stubMixinSetVisible.calledOnce,
                    'calling setVisible again should *not* call _setVisible!');
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

  suite('_setVisibleForScreenReader', function() {
    test('_setVisibleForScreenReader: false', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);

      app1._setVisibleForScreenReader(false);
      assert.equal(app1.browser.element.getAttribute('aria-hidden'), 'true');
    });
    test('_setVisibleForScreenReader: true', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);

      app1._setVisibleForScreenReader(true);
      assert.equal(app1.browser.element.getAttribute('aria-hidden'), 'false');
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
      var closeStub = this.sinon.stub(app, 'close');

      app.transitionController = new MockAppTransitionController();
      assert.isFalse(app.element.classList.contains('in-task-manager'));
      app.enterTaskManager();
      assert.isTrue(app.element.classList.contains('in-task-manager'));
      app.leaveTaskManager();
      assert.isFalse(app.element.classList.contains('in-task-manager'));
      assert.isTrue(closeStub.calledOnce, 'app.close was called');
    });

    test('leaveTaskManager: element.style cleanup', function() {
      var app = new AppWindow(fakeAppConfig1);
      app.transitionController = new MockAppTransitionController();
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
    var fakeTransitionController = {
      requireOpen: function() {},
      requireClose: function() {},
      CLOSING_TRANSITION_TIMEOUT: 350
    };

    suite('Hidewindow event', function() {
      var app1;
      var attention;
      var stubSetVisible;
      var stubIsActive;

      setup(function() {
        app1 = new AppWindow(fakeAppConfig1);
        attention = new AppWindow(fakeAppConfig2);
        stubSetVisible = this.sinon.stub(app1, 'setVisible');
        stubIsActive = this.sinon.stub(app1, 'isActive');
        stubIsActive.returns(true);
      });

      teardown(function() {
        stubSetVisible.restore();
        stubIsActive.restore();
      });

      test('Set window as invisible', function() {
        app1.handleEvent({
          type: '_hidewindow',
          detail: attention
        });
        assert.isTrue(stubSetVisible.calledWith(false));
      });

      test('Do not set the visibility ' +
           'when attention window show up on its opener', function() {
        attention.parentWindow = app1;
        app1.handleEvent({
          type: '_hidewindow',
          detail: attention
        });
        assert.isFalse(stubSetVisible.called);
      });

      test('Do not set the visibility ' +
           'when the window is not active', function() {
        stubIsActive.returns(false);
        app1.handleEvent({
          type: '_hidewindow',
          detail: attention
        });
        assert.isFalse(stubSetVisible.called);
      });
    });

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

    test('No transition when the callee is caller', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var spyOpen = this.sinon.spy(app1, 'open');
      var spyClose = this.sinon.spy(app1, 'close');
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      app1.setCalleeWindow(app1);
      stubIsActive.returns(true);

      assert.deepEqual(app1.calleeWindow, app1);
      assert.deepEqual(app1.callerWindow, app1);

      app1.handleEvent({
        type: 'mozbrowseractivitydone'
      });

      assert.isNull(app1.calleeWindow);
      assert.isNull(app1.callerWindow);
      assert.isFalse(spyOpen.calledWith('in-from-left'));
      assert.isFalse(spyClose.calledWith('out-to-right'));
    });

    test('We should open the base window if we are not', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var app1Base = new AppWindow(fakeAppConfig2);
      var app2 = new AppWindow(fakeAppConfig2);
      var spyOpen = this.sinon.spy(app1Base, 'open');
      var spyClose = this.sinon.spy(app2, 'close');
      app1.CLASS_NAME = 'ActivityWindow';

      var stubIsActive = this.sinon.stub(app2, 'isActive');
      app1Base.calleeWindow = app2;
      app2.callerWindow = app1Base;
      stubIsActive.returns(true);

      app2.handleEvent({
        type: 'mozbrowseractivitydone'
      });

      assert.isTrue(spyOpen.calledWith('in-from-left'));
      assert.isTrue(spyClose.calledWith('out-to-right'));
    });

    test('Destroy should clear rearWindow.', function() {
      var popups = openPopups(2);
      popups[1].destroy();
      assert.isNull(popups[0].frontWindow);
      assert.isNull(popups[1].rearWindow);
    });

    test('Destroy should clear previousWindow.', function() {
      var sheets = openSheets(2);
      sheets[1].destroy();
      assert.isNull(sheets[0].nextWindow);
      assert.isNull(sheets[1].previousWindow);
    });

    test('App crashed and suspending is disabled', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubKill = this.sinon.stub(app1, 'kill');
      var stubPublish = this.sinon.stub(app1, 'publish');
      MockService.mockQueryWith('suspendingAppWindow', false);
      app1.handleEvent({
        type: 'mozbrowsererror',
        detail: {
          type: 'fatal'
        }
      });
      assert.isTrue(app1.isCrashed);
      assert.isTrue(stubKill.called);
      assert.isTrue(stubPublish.calledWith('crashed'));
    });

    test('App crashed and suspending is enabled' +
          'when app is inactive',
      function() {
        var apps = openPopups(2);
        var app1 = apps[0];
        var popup1 = apps[1];
        var stubKill = this.sinon.stub(popup1, 'kill');
        var stubDestroyBrowser = this.sinon.stub(app1, 'destroyBrowser');
        var stubIsActive = this.sinon.stub(app1, 'isActive');

        stubIsActive.returns(false);
        MockService.mockQueryWith('suspendingAppWindow', true);
        AppWindow.SUSPENDING_ENABLED = true;
        app1.handleEvent({
          type: 'mozbrowsererror',
          detail: {
            type: 'fatal'
          }
        });
        assert.isFalse(app1.isCrashed);
        assert.isTrue(stubDestroyBrowser.called);
        assert.isTrue(stubKill.called);
        AppWindow.SUSPENDING_ENABLED = false;
      });

    test('App crashed and suspending is enabled ' +
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
        assert.isTrue(app1.isCrashed);
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

    test('Closed while system is busy and homescreen at bottom', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      app1.isHomescreen = true;
      var app2 = new AppWindow(fakeAppConfig2);

      MockService.mockQueryWith('isBusyLoading', true);
      injectFakeMozBrowserAPI(app1.browser.element);
      injectFakeMozBrowserAPI(app2.browser.element);
      var stubScreenshot = this.sinon.stub(app1.browser.element,
        'getScreenshot');
      var stubScreenshot2 = this.sinon.stub(app2.browser.element,
        'getScreenshot');

      app2.rearWindow = app1;
      app2.handleEvent({
        type: '_closed'
      });

      assert.isFalse(stubScreenshot.called,
                     'should never take screenshot on _closed when homescreen');
      assert.isFalse(stubScreenshot2.called,
                     'should never take screenshot on _closed when homescreen');
    });

    test('Kill a child window.', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);

      var app1parent = new AppWindow(fakeAppConfig2);
      injectFakeMozBrowserAPI(app1parent.browser.element);

      var app1child = new AppWindow(fakeAppConfig3);
      injectFakeMozBrowserAPI(app1child.browser.element);

      app1.nextWindow = app1child;
      app1child.previousWindow = app1;
      app1.previousWindow = app1parent;
      app1parent.nextWindow = app1;

      var stubIsActive = this.sinon.stub(app1, 'isActive');
      var stubKillChild = this.sinon.stub(app1child, 'kill');
      var stubOpenParent = this.sinon.stub(app1parent, 'open');
      var stubCloseSelf = this.sinon.stub(app1, 'close');
      stubIsActive.returns(true);

      app1.transitionController = fakeTransitionController;
      app1.kill();
      assert.isTrue(stubOpenParent.calledWith('in-from-left'));
      assert.isTrue(stubCloseSelf.calledWith('out-to-right'));
      assert.isTrue(stubKillChild.called);
      assert.isNull(app1.nextWindow);

      var stubDestroy = this.sinon.stub(app1, 'destroy');

      /** global */
      app1.element.dispatchEvent(new CustomEvent('_closed'));

      assert.isTrue(stubDestroy.called);
    });

    test('kill guards against missed transitions', function() {
      var app = new AppWindow(fakeAppConfig1);

      // Ensure that the closed event does not trigger the destroy method.
      this.sinon.stub(app.element, 'addEventListener');

      this.sinon.stub(app, 'isActive').returns(true);
      this.sinon.stub(app, 'close');

      app.transitionController = fakeTransitionController;
      app.kill();
      assert.ok(app.close.notCalled);

      this.sinon.clock.tick(
        fakeTransitionController.CLOSING_TRANSITION_TIMEOUT);
      assert.ok(app.close.calledOnce);
      assert.ok(app.close.calledWith('immediate'));
    });

    test('Destroy active window directly when the bottom app is not Active',
      function() {
        var app = new AppWindow(fakeAppConfig1);

        // Ensure that the closed event does not trigger the destroy method.
        this.sinon.stub(app, 'getBottomMostWindow').returns({
          isActive: function() {
            return false;
          }
        });

        var destroyStub = this.sinon.stub(app, 'destroy');

        app.kill();
        assert.ok(destroyStub.calledOnce);
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

    test('Load event before _opened', function() {
      var spy = this.sinon.spy(window, 'AppChrome');
      var app1 = new AppWindow(fakeChromeConfigWithNavigationBar);
      app1.handleEvent({
        type: 'mozbrowserloadstart'
      });
      assert.isFalse(spy.calledWithNew());

      var chromeEventSpy = this.sinon.stub(AppChrome.prototype, 'handleEvent');

      app1.inError = true;
      app1.element.dispatchEvent(new CustomEvent('_opened'));

      sinon.assert.calledWith(chromeEventSpy, {type: 'mozbrowsererror'});
      sinon.assert.calledWith(chromeEventSpy, {type: 'mozbrowserloadstart'});
      sinon.assert.calledWith(chromeEventSpy, {type: '_loading'});
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

    test('Locationchange event resets favicons', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var url = app1.config.url;

      app1.handleEvent({
        type: 'mozbrowserlocationchange',
        detail: 'http://fakeURL.changed'
      });

      app1.handleEvent({
        type: 'mozbrowsericonchange',
        detail: {
          href: 'http://fakeURL.favicon',
          sizes: 60
        }
      });
      assert.equal(Object.keys(app1.favicons).length, 1);

      app1.handleEvent({
        type: 'mozbrowserlocationchange',
        detail: 'http://fakeURL.changed2'
      });
      assert.equal(Object.keys(app1.favicons).length, 0);
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
        name: 'Mon Application',
        displayName: 'Bref',
        short_name: 'Bref'
      });
      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: '_localized'
      });

      assert.isTrue(spyManifestHelper.calledWithNew());
      assert.isTrue(spyManifestHelper.calledWithExactly(app1.manifest));
      assert.isTrue(stubPublish.calledWithExactly('namechanged'));
      assert.equal(app1.identificationTitle.textContent, 'Bref');
      assert.equal(app1.name, 'Bref');
    });

    test('focus event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubFocus = this.sinon.stub(app1, 'focus');

      app1.handleEvent({
        type: '_focus'
      });

      assert.isTrue(stubFocus.calledOnce);
    });

    test('blur event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubBlur = this.sinon.stub(app1, 'blur');

      app1.handleEvent({
        type: '_blur'
      });

      assert.isTrue(stubBlur.calledOnce);
    });

    test('titlechange event', function() {
      var app1 = new AppWindow(fakeWrapperConfig);
      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: 'mozbrowsertitlechange',
        detail: 'newtitile'
      });

      assert.isTrue(stubPublish.calledWithExactly('titlechange'));
      assert.equal(
        app1.identificationTitle.textContent, 'newtitile',
        'title should be changed since it is not an app'
      );

      var app2 = new AppWindow(fakeAppConfig1);
      app2.handleEvent({
        type: 'mozbrowsertitlechange',
        detail: 'newtitile'
      });
      assert.equal(
        app2.identificationTitle.textContent, '',
        'title should not be changed since it is an app'
      );
    });

    test('titlechange event > private browser', function() {
      var defaultPbTitle = 'Private Browser Splash';
      var privateApp = new AppWindow(fakePrivateConfig);
      privateApp.identificationTitle.textContent = defaultPbTitle;
      privateApp.handleEvent({
        type: 'mozbrowsertitlechange',
        detail: 'new title - does not update overlay'
      });
      assert.equal(privateApp.identificationTitle.textContent, defaultPbTitle);
    });

    test('iconchange event', function() {
      var app1 = new AppWindow(fakeWrapperConfig);
      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: 'mozbrowsericonchange',
        detail: {
          sizes: '32x32',
          href: 'favicon.ico'
        }
      });

      assert.isTrue(stubPublish.calledWithExactly('iconchange'));
      assert.deepEqual(app1.favicons, {'favicon.ico': {sizes: ['32x32']}});

      app1.handleEvent({
        type: 'mozbrowsericonchange',
        detail: {
          sizes: '32x32',
          href: 'another.ico'
        }
      });

      assert.isTrue(stubPublish.calledWithExactly('iconchange'));
      assert.deepEqual(app1.favicons, {
        'favicon.ico': {sizes: ['32x32']},
        'another.ico': {sizes: ['32x32']}
      });

      app1.handleEvent({
        type: 'mozbrowsericonchange',
        detail: {
          sizes: '16x16',
          href: 'favicon.ico'
        }
      });

      assert.isTrue(stubPublish.calledWithExactly('iconchange'));
      assert.deepEqual(app1.favicons, {
        'favicon.ico': {sizes: ['32x32', '16x16']},
        'another.ico': {sizes: ['32x32']}
      });
    });

    test('Orientation change event on app', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      this.sinon.stub(app1, 'isActive').returns(false);
      app1.width = 320;
      app1.height = 460;
      MockService.mockQueryWith('keyboardEnabled', false);
      MockService.mockQueryWith('LayoutManager.width', 480);
      MockService.mockQueryWith('getHeightFor', 300);

      app1.handleEvent({
        type: '_orientationchange'
      });

      assert.equal(app1.element.style.width, '480px');
      assert.equal(app1.element.style.height, '300px');

      assert.equal(app1.screenshotOverlay.style.visibility, 'hidden');
    });

    test('Orientation change event on app with match orientation', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      this.sinon.stub(app1, 'isActive').returns(false);
      app1.width = 320;
      app1.height = 460;
      MockService.mockQueryWith('LayoutManager.width', 320);
      MockService.mockQueryWith('getHeightFor', 460);

      app1.screenshotOverlay.style.visibility = 'hidden';

      app1.handleEvent({
        type: '_orientationchange'
      });

      assert.equal(app1.screenshotOverlay.style.visibility, '');
    });

    test('Orientation change event on active app', function() {
      MockService.mockQueryWith('LayoutManager.width', 320);
      MockService.mockQueryWith('getHeightFor', 480);
      var app1 = new AppWindow(fakeAppConfig1);
      var app2 = new AppWindow(fakeAppConfig2);
      // Inject mozBrowser API to app iframe
      injectFakeMozBrowserAPI(app1.browser.element);
      injectFakeMozBrowserAPI(app2.browser.element);

      app1.frontWindow = app2;
      this.sinon.stub(app1, 'isActive').returns(true);
      this.sinon.stub(app2, 'broadcast');

      MockService.mockQueryWith('getHeightFor', 380);
      app1.handleEvent({
        type: '_orientationchange'
      });

      assert.isTrue(app2.broadcast.calledWith('orientationchange'));
      assert.equal(app1.element.style.width,
        MockService.mQueries['LayoutManager.width'] + 'px');
      assert.equal(app1.element.style.height, '380px');
    });

    test('Orientation change event on active but not top most app', function() {
      MockService.mockQueryWith('LayoutManager.width', 480);
      MockService.mockQueryWith('getHeightFor', 320);
      var app1 = new AppWindow(fakeAppConfig1);
      // Inject mozBrowser API to app iframe
      injectFakeMozBrowserAPI(app1.browser.element);

      this.sinon.stub(app1, 'isActive').returns(true);

      MockService.mockQueryWith('keyboardHeight', 100);
      app1.handleEvent({
        type: '_orientationchange',
        detail: true
      });

      assert.equal(app1.element.style.width,
        MockService.mQueries['LayoutManager.width'] + 'px');
      assert.equal(app1.element.style.height,
        MockService.mQueries.getHeightFor + 'px');
    });

    test('Orientation change event on active homescreen app', function() {
      MockService.mockQueryWith('LayoutManager.width', 480);
      MockService.mockQueryWith('getHeightFor', 320);
      var app1 = new AppWindow(fakeAppConfig1);
      var stubLockOrientation = this.sinon.stub(app1, 'lockOrientation');
      this.sinon.stub(app1, 'isActive').returns(true);
      app1.isHomescreen = true;
      app1.width = 320;
      app1.height = 460;

      MockService.mockQueryWith('LayoutManager.width', 460);
      MockService.mockQueryWith('LayoutManager.height', 320);
      MockService.mockQueryWith('getTopMostWindow', app1);

      app1.handleEvent({
        type: '_orientationchange'
      });

      assert.isTrue(stubLockOrientation.calledOnce,
        'when active app is homescreen, we should call lockOrientation to' +
        'prevent it is modified by other background app');
      assert.equal(app1.element.style.width, '460px');
      assert.equal(app1.element.style.height, '320px');
      MockService.mockQueryWith('getTopMostWindow', null);
    });

    test('Orientation change event on fullscreen app', function() {
      MockService.mockQueryWith('LayoutManager.width', 480);
      MockService.mockQueryWith('getHeightFor', 320);
      var app1 = new AppWindow(fakeAppConfig1);
      this.sinon.stub(app1, 'isActive').returns(false);
      this.sinon.stub(app1, 'isFullScreen').returns(true);
      app1.width = 320;
      app1.height = 480;
      MockService.mockQueryWith('LayoutManager.width', 480);
      MockService.mockQueryWith('LayoutManager.height', 320);

      app1.handleEvent({
        type: '_orientationchange'
      });

      assert.equal(app1.element.style.width, '480px');
      assert.equal(app1.element.style.height, '320px');

      assert.equal(app1.screenshotOverlay.style.visibility, 'hidden');
    });

    test('Swipe in event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var atc1 = {
        switchTransitionState: function() {}
      };
      var publishStub = this.sinon.stub(app1, 'publish');
      var switchTransitionState =
        this.sinon.stub(atc1, 'switchTransitionState');
      var revive = this.sinon.stub(app1, 'reviveBrowser');
      app1.transitionController = atc1;

      app1.handleEvent({
        type: '_swipein'
      });

      assert.isTrue(switchTransitionState.calledWith('opened'));
      assert.isTrue(revive.called);
      sinon.assert.calledTwice(publishStub);
      sinon.assert.calledWith(publishStub, 'opening');
      sinon.assert.calledWith(publishStub, 'opened');
    });

    test('Swipe in event while app is being crashed', function(){
      var app1 = new AppWindow(fakeAppConfig1);
      var transitionController = new MockAppTransitionController();
      app1.transitionController = transitionController;
      var stubClearTransitionClasses =
        this.sinon.stub(transitionController, 'clearTransitionClasses');
      app1.isCrashed = true;

      app1.handleEvent({
        type: '_swipein'
      });

      assert.isTrue(stubClearTransitionClasses.called);
    });

    test('Swipe out event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      injectFakeMozBrowserAPI(app1.browser.element);
      var atc1 = {
        switchTransitionState: function() {}
      };
      var publishStub = this.sinon.stub(app1, 'publish');
      var switchTransitionState =
        this.sinon.stub(atc1, 'switchTransitionState');
      app1.transitionController = atc1;

      app1.handleEvent({
        type: '_swipeout'
      });

      assert.isTrue(switchTransitionState.calledWith('closed'));
      sinon.assert.calledWith(publishStub, 'closing');
      sinon.assert.calledWith(publishStub, 'closed');
    });

    test('Shrinking start event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubGetScreenshot = this.sinon.stub(app1,'getScreenshot',
        // We want to check if callback provided as getScreenshot argument
        // calls all the necessary methods
        (callback) => { callback(); }
      );
      this.sinon.stub(app1, '_showScreenshotOverlay')
        .returns(new Promise(function(resolve) {
          resolve();
          assert.isTrue(stubSetVisible.calledWith(false),
            'setVisble in callback');
        }));
      var stubSetVisible = this.sinon.stub(app1, 'setVisible');
      var stubBroadcast = this.sinon.stub(app1, 'broadcast');

      app1.handleEvent({
        type: '_shrinkingstart'
      });

      assert.isTrue(stubBroadcast.calledWith('blur'));
      assert.isTrue(stubGetScreenshot.calledOnce, 'getScreenshot');
    });

    test('Shrinking stop event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubSetVisible = this.sinon.stub(app1, 'setVisible');
      var stubBroadcast = this.sinon.stub(app1, 'broadcast');

      app1.handleEvent({
        type: '_shrinkingstop'
      });

      assert.isTrue(stubSetVisible.calledWith(true), 'setVisible');
      assert.isTrue(stubBroadcast.calledWith('focus'));
    });

    test('browsersecuritychange event', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      // expect indeterminate state before first event
      var publishStub = this.sinon.stub(app1, 'publish');
      assert.equal(app1.getSSLState(), '',
                  'SSL state is empty before the first security change');


      ['broken', 'secure', 'insecure'].forEach(function(state, i) {
        app1.handleEvent({
          type: 'mozbrowsersecuritychange',
          detail: {
            'state': state
          }
        });
        assert.equal(app1.getSSLState(), state);
        assert.equal(publishStub.getCall(i).args[0], 'securitychange');
        assert.equal(publishStub.getCall(i).args[1], state);
      });
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
    assert.isFalse(app1.isCrashed);
    assert.isFalse(app1.suspended);
    assert.isTrue(stub_setVisble.calledWith(false));
    assert.isTrue(stubPublish.calledWith('resumed'));
    assert.isTrue(app1.browser.element.classList.contains('hidden'));
  });

  test('destroy browser', function() {
    var app1 = new AppWindow(fakeWrapperConfig);
    var stubPublish = this.sinon.stub(app1, 'publish');
    app1.destroyBrowser();
    assert.isNull(app1.browser);
    assert.isNull(app1.iframe);
    assert.isTrue(app1.suspended);
    assert.isTrue(stubPublish.calledWith('suspended'));
    assert.equal(app1._sslState, '');
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

  suite('isActive', function() {
    var testApp;
    setup(function() {
      testApp = new AppWindow(fakeAppConfig1);
    });

    test('dom is removed', function() {
      testApp.element = null;
      assert.isFalse(testApp.isActive());
    });

    test('app is in queue to show', function() {
      testApp.element.classList.add('will-become-active');
      assert.isTrue(testApp.isActive());
    });

    test('app is in queue to hide', function() {
      testApp.transitionController = {
        '_transitionState': 'opened'
      };
      testApp.element.classList.add('will-become-inactive');
      assert.isFalse(testApp.isActive());
    });

    test('app doesnot have transitionController', function() {
      testApp.transitionController = null;
      assert.isFalse(testApp.isActive());
    });

    test('app doesnot is in opened state', function() {
      testApp.transitionController = {
        '_transitionState': 'opened'
      };
      assert.isTrue(testApp.isActive());
    });

    test('app doesnot is in opening state', function() {
      testApp.transitionController = {
        '_transitionState': 'opening'
      };
      assert.isTrue(testApp.isActive());
    });

    test('app doesnot is in closing state', function() {
      testApp.transitionController = {
        '_transitionState': 'closing'
      };
      assert.isFalse(testApp.isActive());
    });
  });

  suite('shouldResize', function() {
    var testApp;
    setup(function() {
      testApp = new AppWindow(fakeAppConfig1);
    });

    test('app is in queue to hide', function() {
      testApp.element.classList.add('will-become-inactive');
      assert.isTrue(testApp.shouldResize());
    });

    test('app is active', function() {
      this.sinon.stub(testApp, 'isActive').returns(true);
      assert.isTrue(testApp.shouldResize());
    });

    test('app is inactive', function() {
      this.sinon.stub(testApp, 'isActive').returns(false);
      assert.isFalse(testApp.shouldResize());
    });
  });

  test('isSheetTransitioning', function() {
    var testApp = new AppWindow(fakeAppConfig1);
    testApp.element.classList.add('inside-edges');
    assert.isTrue(testApp.isSheetTransitioning());
  });

  suite('isTransitioning', function() {
    var testApp;
    setup(function() {
      testApp = new AppWindow(fakeAppConfig1);
    });

    test('app is opening', function() {
      testApp.transitionController = null;
      testApp.element.classList.add('transition-opening');
      assert.isTrue(testApp.isTransitioning());

      testApp.transitionController = {
        _transitionState: undefined
      };
      assert.isFalse(testApp.isTransitioning());

      testApp.transitionController._transitionState = 'opening';
      assert.isTrue(testApp.isTransitioning());

    });

    test('app is closing', function() {
      testApp.transitionController = null;
      testApp.element.classList.add('transition-closing');
      assert.isTrue(testApp.isTransitioning());

      testApp.transitionController = {
        _transitionState: undefined
      };
      assert.isFalse(testApp.isTransitioning());

      testApp.transitionController._transitionState = 'closing';
      assert.isTrue(testApp.isTransitioning());
    });

  });

  test('isBrowser', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var app2 = new AppWindow(fakeAppConfig4);
    assert.isFalse(app1.isBrowser());
    assert.isTrue(app2.isBrowser());
    assert.isTrue(app2.element.classList.contains('browser'));
  });

  test('isPrivateBrowser', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var app2 = new AppWindow(fakePrivateConfig);
    assert.isFalse(app1.isPrivateBrowser());
    assert.isTrue(app2.isPrivateBrowser());
    assert.isTrue(app2.element.classList.contains('private'));
  });

  test('isCertified', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var app2 = new AppWindow(fakeAppConfigCertified);
    assert.isFalse(app1.isCertified());
    assert.isTrue(app2.isCertified());
  });

  test('navigate', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var app2 = new AppWindow(fakeAppConfig4);
    var popup = new AppWindow(fakeAppConfig2);
    var url = 'http://changed.url';

    this.sinon.stub(app1, 'reConfig');
    app1.navigate(url);
    assert.isTrue(app1.browser.element.src.indexOf(url) < 0);
    assert.isTrue(app1.reConfig.notCalled);

    app2.navigate(url);
    assert.isTrue(app2.browser.element.src.indexOf(url) !== -1);

    app2.frontWindow = popup;
    app2.navigate(url);
    assert.isNull(app2.frontWindow);
  });

  test('navigate app -> browser', function() {
    var app1 = new AppWindow(fakeSearchAppConfig);
    var url = 'http://changed.url';

    this.sinon.stub(app1, 'reConfig');
    app1.navigate(url);

    assert.ok(app1.reConfig.calledOnce);
    assert.ok(app1.element.classList.contains('browser'));
  });

  suite('Sub component', function() {
    var app;
    setup(function() {
      window.AudioChannelController = MockAudioChannelController;
      app = new AppWindow(fakeAppConfig1);
      app.browser.element.allowedAudioChannels = [
        { name: 'normal' }, { name: 'content' }
      ];
      app.installSubComponents();
    });

    teardown(function() {
      delete window.AudioChannelController;
    });

    test('installSubComponents', function() {
      assert.equal(app.audioChannels.size, 2);
      assert.equal(app.audioChannels.get('normal').name, 'normal');
      assert.equal(app.audioChannels.get('content').name, 'content');
    });

    test('uninstallSubComponents', function() {
      var normalChannel = app.audioChannels.get('normal');
      var contentChannel = app.audioChannels.get('content');
      this.sinon.spy(normalChannel, 'destroy');
      this.sinon.spy(contentChannel, 'destroy');
      app.uninstallSubComponents();
      assert.ok(normalChannel.destroy.calledOnce);
      assert.ok(contentChannel.destroy.calledOnce);
      assert.deepEqual(app.audioChannels, null);
    });
  });

  suite('fadeOut', function() {
    var app1;
    setup(function() {
      app1 = new AppWindow(fakeAppConfig1);
    });

    test('app is active', function() {
      this.sinon.stub(app1, 'isActive', function() {return true;});
      app1.fadeOut();
      assert.isFalse(app1.element.classList.contains('fadeout'));
    });

    test('app not active', function() {
      this.sinon.stub(app1, 'isActive', function() {return false;});
      app1.fadeOut();
      assert.isTrue(app1.element.classList.contains('fadeout'));
    });
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

  test('hideContextMenu', function() {
    var app = new AppWindow(fakeAppConfig1);
    // Nothing goes wrong if contextmenu is undefined
    app.showDefaultContextMenu();

    app.contextmenu = MockContextMenu;
    var stubCtxShow = this.sinon.stub(app.contextmenu, 'showDefaultMenu');
    app.showDefaultContextMenu();
    assert.isTrue(stubCtxShow.called);

    var stubCtxHide = this.sinon.stub(app.contextmenu, 'hide');
    app.hideContextMenu();
    assert.isTrue(stubCtxHide.called);
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

  test('front window should dispatch events on its element',
    function() {
      var popups = openPopups(2);
      var caught = false;
      var caughtOnParent = false;
      popups[1].element.addEventListener('appfake', function() {
        caught = true;
      });
      popups[0].element.addEventListener('appfake', function() {
        caughtOnParent = true;
      });
      popups[1].publish('fake');
      assert.isTrue(caught);
      assert.isFalse(caughtOnParent);
    });

  suite('Theme Color', function() {
    test('(No type)', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: 'mozbrowsermetachange',
        detail: {
          name: 'theme-color',
          content: 'transparent'
        }
      });

      assert.isFalse(!!app1.themeColor);
      assert.isFalse(stubPublish.calledOnce);
    });

    test('Added', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: 'mozbrowsermetachange',
        detail: {
          name: 'theme-color',
          content: 'transparent',
          type: 'added'
        }
      });

      assert.equal(app1.themeColor, 'transparent');
      assert.isTrue(stubPublish.calledOnce);
    });

    test('Changed', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: 'mozbrowsermetachange',
        detail: {
          name: 'theme-color',
          content: 'pink',
          type: 'changed'
        }
      });

      assert.equal(app1.themeColor, 'pink');
      assert.isTrue(stubPublish.calledOnce);
    });

    test('Removed', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: 'mozbrowsermetachange',
        detail: {
          name: 'theme-color',
          content: 'pink',
          type: 'removed'
        }
      });

      assert.equal(app1.themeColor, '');
      assert.isTrue(stubPublish.calledOnce);
    });
  });

  suite('Theme Group', function() {
    test('Added', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: 'mozbrowsermetachange',
        detail: {
          name: 'theme-group',
          content: 'theme-media',
          type: 'added'
        }
      });

      assert.isTrue(app1.element.classList.contains('theme-media'));
      assert.isTrue(stubPublish.calledOnce);
    });

    test('Sanitazation', function() {
      var app1 = new AppWindow(fakeAppConfig1);

      app1.handleEvent({
        type: 'mozbrowsermetachange',
        detail: {
          name: 'theme-group',
          content: 'hidden',
          type: 'added'
        }
      });

      assert.isFalse(app1.element.classList.contains('hidden'));
    });

    test('Changed', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: 'mozbrowsermetachange',
        detail: {
          name: 'theme-group',
          content: 'theme-settings',
          type: 'changed'
        }
      });

      assert.isTrue(app1.element.classList.contains('theme-settings'));
      assert.isTrue(stubPublish.calledOnce);
    });

    test('Removed', function() {
      var app1 = new AppWindow(fakeAppConfig1);

      app1.handleEvent({
        type: 'mozbrowsermetachange',
        detail: {
          name: 'theme-group',
          content: 'theme-media',
          type: 'added'
        }
      });

      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: 'mozbrowsermetachange',
        detail: {
          name: 'theme-group',
          content: 'theme-media',
          type: 'removed'
        }
      });

      assert.isFalse(app1.element.classList.contains('theme-media'));
      assert.isTrue(stubPublish.calledOnce);
    });
  });

  suite('application-name', function() {
    test('application-name for browser window', function() {
      var browser1 = new AppWindow(fakeWrapperConfig);
      var stubPublish = this.sinon.stub(browser1, 'publish');

      browser1.handleEvent({
        type: 'mozbrowsermetachange',
        detail: {
          name: 'application-name',
          content: 'title1'
        }
      });

      assert.equal(browser1.name, 'title1');
      assert.isTrue(stubPublish.calledOnce);
      stubPublish.restore();
    });


    test('application-name for app window', function() {
      var app1 = new AppWindow(fakeAppConfig1);
      var stubPublish = this.sinon.stub(app1, 'publish');

      app1.handleEvent({
        type: 'mozbrowsermetachange',
        detail: {
          name: 'application-name',
          content: 'title1'
        }
      });

      assert.isFalse(app1.name == 'title1');
      assert.isFalse(stubPublish.calledOnce);
      stubPublish.restore();
    });
  });

  test('Should not be killable if it has an attention window', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var attention = new AppWindow(fakeAppConfig1);
    app1.attentionWindow = attention;
    assert.isFalse(app1.killable());
  });

  test('Should not be killable if we are homescreen window', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    app1.isHomescreen = true;
    assert.isFalse(app1.killable());
  });

  test('Has attention permission', function() {
    MockPermissionSettings.permissions.attention = 'deny';
    var app1 = new AppWindow(fakeAppConfig1);
    assert.isFalse(app1.hasPermission('attention'));

    MockPermissionSettings.permissions.attention = 'allow';
    var app2 = new AppWindow(fakeAppConfig2);
    assert.isTrue(app2.hasPermission('attention'));
  });

  test('Show()', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    app1.hide();
    assert.isTrue(app1.element.classList.contains('hidden'));

    app1.show();
    assert.isFalse(app1.element.classList.contains('hidden'));
  });

  test('Sub-component destruction', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var stub = this.sinon.stub(app1.transitionController, 'destroy');
    app1.destroy();
    assert.ok(stub.calledOnce);
  });

  test('No AppChrome for InputMethod AppWindows', function() {
    var appInput = new AppWindow(fakeInputAppConfig);
    appInput.element.dispatchEvent(new CustomEvent('_opened'));
    assert.equal(appInput.appChrome, undefined);
  });

  test('Should bypass touch event to statusbar submodule', function() {
    var app = new AppWindow(fakeAppConfig1);
    app.statusbar = {
      handleStatusbarTouch: this.sinon.spy()
    };
    var fakeTouchEvt = new CustomEvent('touchstart');
    app.handleStatusbarTouch(fakeTouchEvt, 24);
    assert.isTrue(app.statusbar.handleStatusbarTouch.calledWith(
      fakeTouchEvt, 24));
  });
});
