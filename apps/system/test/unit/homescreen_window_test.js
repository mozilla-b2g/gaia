/* global MocksHelper, HomescreenWindow, MockApplications,
          HomescreenLauncher */

'use strict';

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_attention_screen.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');

var mocksForHomescreenWindow = new MocksHelper([
  'OrientationManager',
  'Applications', 'SettingsListener',
  'ManifestHelper', 'AppWindowManager',
  'HomescreenLauncher'
]).init();

suite('system/HomescreenWindow', function() {
  mocksForHomescreenWindow.attachTestHelpers();
  var homescreenWindow;
  var stubById;
  var realApplications;

  setup(function(done) {
    this.sinon.useFakeTimers();
    window.homescreenLauncher = new HomescreenLauncher().start();
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/homescreen_window.js', done);

    realApplications = window.applications;
    window.applications = MockApplications;
  });

  teardown(function() {
    window.homescreenLauncher = undefined;
    stubById.restore();
    window.applications = realApplications;
    realApplications = null;
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
      if (!('setVisible' in homescreenWindow.browser.element)) {
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
    suite('handle events', function() {
      test('mozbrowser events', function() {
        var stubRestart = this.sinon.stub(homescreenWindow, 'restart');
        var stubIsActive = this.sinon.stub(homescreenWindow, 'isActive');
        stubIsActive.returns(true);

        homescreenWindow.handleEvent({
          type: 'mozbrowserclose'
        });
        assert.isTrue(stubRestart.calledOnce);

        homescreenWindow.handleEvent({
          type: 'mozbrowsererror',
          detail: {
            type: 'fatal'
          }
        });
        assert.isTrue(stubRestart.calledTwice);
      });
      test('_localized event', function() {
        var stubPublish = this.sinon.stub(homescreenWindow, 'publish');

        homescreenWindow.handleEvent({
          type: '_localized'
        });

        assert.isTrue(stubPublish.calledOnce);
        assert.isTrue(stubPublish.calledWith('namechanged'));
      });
    });
    suite('homescreen is crashed', function() {
      var stubRender;
      var spyKill;
      setup(function() {
        stubRender = this.sinon.stub(homescreenWindow, 'render');
        spyKill = this.sinon.spy(homescreenWindow, 'kill');
      });

      teardown(function() {
        stubRender.restore();
        spyKill.restore();
      });

      test('Homescreen is crashed at foreground:' +
          'rerender right away.', function() {
        var stubIsActive = this.sinon.stub(homescreenWindow, 'isActive');
        stubIsActive.returns(true);
        homescreenWindow.restart();
        assert.isTrue(spyKill.called);
        this.sinon.clock.tick(0);
        assert.isTrue(stubRender.called);
      });

      test('Homescreen is crashed at background: killed', function() {
        var stubIsActive = this.sinon.stub(homescreenWindow, 'isActive');
        stubIsActive.returns(false);
        homescreenWindow.restart();
        assert.isTrue(spyKill.called);
      });

      test('Homescreen should hide its fade-overlay while we call the method',
      function() {
        var originalOverlay = homescreenWindow.fadeOverlay,
            domOverlay = document.createElement('div');
        homescreenWindow.fadeOverlay = domOverlay;
        homescreenWindow.hideFadeOverlay();
        assert.isTrue(homescreenWindow.fadeOverlay
          .classList.contains('hidden'));
        homescreenWindow.fadeOverlay = originalOverlay;
      });

      test('Homescreen should show its fade-overlay while we call the method',
      function() {
        var originalOverlay = homescreenWindow.fadeOverlay,
            domOverlay = document.createElement('div');
        homescreenWindow.fadeOverlay = domOverlay;
        homescreenWindow.showFadeOverlay();
        assert.isFalse(homescreenWindow.fadeOverlay
          .classList.contains('hidden'));
        homescreenWindow.fadeOverlay = originalOverlay;
      });
    });
  });
});
