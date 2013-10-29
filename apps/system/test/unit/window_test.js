'use strict';

mocha.globals(['SettingsListener', 'removeEventListener', 'addEventListener',
      'dispatchEvent', 'WindowManager', 'Applications', 'ManifestHelper',
      'KeyboardManager', 'StatusBar', 'BrowserMixin', 'TransitionMixin',
      'SoftwareButtonManager', 'AttentionScreen', 'AppWindow',
      'OrientationManager', 'SettingsListener', 'BrowserFrame',
      'BrowserConfigHelper', 'System', 'LayoutManager']);

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/test/unit/mock_software_button_manager.js');
requireApp('system/test/unit/mock_keyboard_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_attention_screen.js');
requireApp('system/test/unit/mock_layout_manager.js');

new MocksHelper([
  'OrientationManager', 'AttentionScreen',
  'Applications', 'SettingsListener', 'SoftwareButtonManager',
  'ManifestHelper', 'KeyboardManager', 'StatusBar', 'LayoutManager'
]).init().attachTestHelpers();

suite('system/AppWindow', function() {
  var clock, stubById;
  setup(function(done) {
    clock = sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/transition_mixin.js', done);
  });

  teardown(function() {
    clock.restore();
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
      var stub_publish = this.sinon.stub(app1, '_publish');
      stubIsActive.returns(true);
      app1.resize();
      assert.isTrue(stub_publish.calledWith('withoutkeyboard'));
    });

    test('Send message to appChrome: w/ keyboard', function() {
      MockLayoutManager.keyboardEnabled = true;
      var stubIsActive = this.sinon.stub(app1, 'isActive');
      var stub_publish = this.sinon.stub(app1, '_publish');
      stubIsActive.returns(true);
      app1.resize();
      assert.isTrue(stub_publish.calledWith('withkeyboard'));
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

  suite('Screenshots', function() {
    test('getScreenshot', function() {

    });
  });

  suite('Transitions', function() {
    test('open', function() {
      // Hack querySelector
      var app1 = new AppWindow(fakeAppConfig1);
      var stubQuerySelector = this.sinon.stub(app1.element, 'querySelector');
      stubQuerySelector.returns(document.createElement('div'));
      assert.equal(app1._transitionState, 'closed');
      app1.open();
      assert.equal(app1._transitionState, 'opening');
      clock.tick(500);
      assert.equal(app1._transitionState, 'opened');
      app1.close();
      assert.equal(app1._transitionState, 'closing');
      clock.tick(500);
      assert.equal(app1._transitionState, 'closed');
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
});
