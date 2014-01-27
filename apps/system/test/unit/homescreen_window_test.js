'use strict';

mocha.globals(['SettingsListener', 'removeEventListener', 'addEventListener',
      'dispatchEvent', 'WindowManager', 'Applications', 'ManifestHelper',
      'HomescreenWindow', 'KeyboardManager', 'StatusBar',
      'SoftwareButtonManager', 'AttentionScreen', 'OrientationManager',
      'AppWindow', 'TrustedUIManager', 'FtuLauncher']);

requireApp('system/js/browser_config_helper.js');
requireApp('system/js/browser_frame.js');
requireApp('system/js/orientation_manager.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/test/unit/mock_software_button_manager.js');
requireApp('system/test/unit/mock_keyboard_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_window_manager.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_attention_screen.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');
requireApp('system/test/unit/mock_ftu_launcher.js');

function switchProperty(originObject, prop, stub, reals, useDefineProperty) {
  if (!useDefineProperty) {
    reals[prop] = originObject[prop];
    originObject[prop] = stub;
  } else {
    Object.defineProperty(originObject, prop, {
      configurable: true,
      get: function() { return stub; }
    });
  }
}

function restoreProperty(originObject, prop, reals, useDefineProperty) {
  if (!useDefineProperty) {
    originObject[prop] = reals[prop];
  } else {
    Object.defineProperty(originObject, prop, {
      configurable: true,
      get: function() { return reals[prop]; }
    });
  }
}

suite('system/HomescreenWindow', function() {
  var reals = {};
  var homescreenWindow;
  var clock, stubById;

  setup(function(done) {
    switchProperty(window, 'OrientationManager', MockOrientationManager, reals);
    switchProperty(window, 'WindowManager', MockWindowManager, reals);
    switchProperty(window, 'Applications', MockApplications, reals);
    switchProperty(window, 'ManifestHelper', MockManifestHelper, reals);
    switchProperty(window, 'KeyboardManager', MockKeyboardManager, reals);
    switchProperty(window, 'StatusBar', MockStatusBar, reals);
    switchProperty(window, 'TrustedUIManager', MockTrustedUIManager, reals);
    switchProperty(window, 'FtuLauncher', MockFtuLauncher, reals);
    switchProperty(window, 'SoftwareButtonManager',
        MockSoftwareButtonManager, reals);
    switchProperty(window, 'AttentionScreen', MockAttentionScreen, reals);
    clock = sinon.useFakeTimers();
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/window.js');
    requireApp('system/js/homescreen_window.js', done);
  });

  teardown(function() {
    MockWindowManager.mTeardown();
    MockApplications.mTeardown();
    MockKeyboardManager.mTeardown();
    MockStatusBar.mTeardown();
    MockSoftwareButtonManager.mTeardown();
    MockAttentionScreen.mTeardown();
    MockTrustedUIManager.mTeardown();
    clock.restore();
    stubById.restore();

    restoreProperty(window, 'AttentionScreen', reals);
    restoreProperty(window, 'SoftwareButtonManager', reals);
    restoreProperty(window, 'StatusBar', reals);
    restoreProperty(window, 'KeyboardManager', reals);
    restoreProperty(window, 'WindowManager', reals);
    restoreProperty(window, 'Applications', reals);
    restoreProperty(window, 'ManifestHelper', reals);
    restoreProperty(window, 'OrientationManager', reals);
  });

  suite('homescreen window instance.', function() {
    setup(function() {
      MockApplications.mRegisterMockApp({
        manifestURL: 'fakeManifestURL',
        origin: 'fakeOrigin',
        manifest: {

        }
      });

      homescreenWindow = new HomescreenWindow('fakeManifestURL');
      if (!'setVisible' in homescreenWindow.browser.element) {
        homescreenWindow.browser.element.setVisible = function() {};
      }
    });
    teardown(function() {
    });
    test('Homescreen browser frame', function() {
      assert.equal(homescreenWindow.browser.element.name, 'main');
      assert.equal(
        homescreenWindow.browser.element.getAttribute('mozapptype'),
        'homescreen');
    });
    test('homescree is created', function() {
      assert.isTrue(homescreenWindow.isHomescreen);
    });
    suite('transition test', function() {
      setup(function() {});
      teardown(function() {});

      test('close', function() {
        homescreenWindow._transitionState = 'opened';
        homescreenWindow.close();
        clock.tick(homescreenWindow._transitionTimeout * 1.3);
        assert.isFalse(
          homescreenWindow.element.classList.contains('active'));
      });

      test('open', function() {
        homescreenWindow._transitionState = 'closed';
        homescreenWindow.open();
        clock.tick(homescreenWindow._transitionTimeout * 1.3);
        assert.isTrue(
          homescreenWindow.element.classList.contains('active'));
      });

      test('open twice', function() {
        homescreenWindow._transitionState = 'closed';
        homescreenWindow.open();
        homescreenWindow.open();
        clock.tick(homescreenWindow._transitionTimeout * 1.3);
        assert.isTrue(
          homescreenWindow.element.classList.contains('active'));
      });


      test('close twice', function() {
        homescreenWindow._transitionState = 'opened';
        homescreenWindow.close();
        homescreenWindow.close();
        clock.tick(homescreenWindow._transitionTimeout * 1.3);
        assert.isFalse(
          homescreenWindow.element.classList.contains('active'));
      });

      test('open than close', function() {
        homescreenWindow._transitionState = 'closed';
        homescreenWindow.open();
        homescreenWindow.close();
        clock.tick(homescreenWindow._transitionTimeout * 1.3);
        assert.isTrue(
          homescreenWindow.element.classList.contains('active'));
      });

      test('close than open', function() {
        homescreenWindow._transitionState = 'opened';
        homescreenWindow.close();
        homescreenWindow.open();
        clock.tick(homescreenWindow._transitionTimeout * 1.3);
        assert.isTrue(
          homescreenWindow.element.classList.contains('active'));
      });
    });
    suite('homescreen is crashed', function() {
      var stubRender;
      var stubKill;
      setup(function() {
        stubRender = this.sinon.stub(homescreenWindow, 'render');
        stubKill = this.sinon.stub(homescreenWindow, 'kill');
      });

      teardown(function() {
        stubRender.restore();
        stubKill.restore();
      });

      test('Homescreen is crashed at foreground:' +
          'rerender right away.', function() {
        homescreenWindow._visibilityState = 'foreground';
        homescreenWindow.restart();
        assert.isTrue(stubKill.called);
        clock.tick(1);
        assert.isTrue(stubRender.called);
      });

      test('Homescreen is crashed at background: killed', function() {
        homescreenWindow._visibilityState = 'background';
        homescreenWindow.restart();
        assert.isTrue(stubKill.called);
      });
    });
  });
});
