'use strict';

mocha.globals(['Applications', 'HomescreenWindow', 'homescreenLauncher',
              'SettingsListener', 'layoutManager']);

requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/homescreen_launcher.js');

var mocksForHomescreenLauncher = new MocksHelper([
  'Applications', 'HomescreenWindow', 'TrustedUIManager',
  'FtuLauncher', 'SettingsListener', 'LayoutManager'
]).init();

suite('system/HomescreenLauncher', function() {
  var homescreen;

  suite('start', function() {
    var homescreen;
    mocksForHomescreenLauncher.attachTestHelpers();

    setup(function() {
      MockApplications.ready = true;
    });

    teardown(function() {
      if (typeof window.homescreenLauncher !== undefined) {
        window.homescreenLauncher.stop();
        window.homescreenLauncher = undefined;
      }
    });

    test('start homescreen launcher', function() {
      var ready = false;
      window.addEventListener('homescreen-ready', function homescreenReady() {
        window.removeEventListener('homescreen-ready', homescreenReady);
        ready = true;
      });
      window.homescreenLauncher = new HomescreenLauncher().start();
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = window.homescreenLauncher.getHomescreen();
      assert.isTrue(homescreen.isHomescreen);
      assert.isTrue(ready);
    });
  });

  suite('other than start', function() {
    var homescreen;
    mocksForHomescreenLauncher.attachTestHelpers();

    setup(function() {
      MockApplications.ready = true;
      window.homescreenLauncher = new HomescreenLauncher().start();
    });

    teardown(function() {
      if (typeof window.homescreenLauncher !== 'undefined') {
        window.homescreenLauncher.stop();
        window.homescreenLauncher = undefined;
      }
    });

    test('replace the homescreen', function() {
      var changed = false;
      window.addEventListener('homescreen-changed',
        function homescreenChange() {
          window.removeEventListener('homescreen-changed', homescreenChange);
          changed = true;
      });
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = window.homescreenLauncher.getHomescreen();
      var stubKill = this.sinon.stub(homescreen, 'kill');
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('second.home');
      homescreen = window.homescreenLauncher.getHomescreen();
      assert.equal(homescreen.manifestURL, 'second.home');
      assert.isTrue(changed);
      assert.isTrue(stubKill.called);
      stubKill.restore();
    });

    test('homescreen is the same', function() {
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = window.homescreenLauncher.getHomescreen();
      var stubEnsure = this.sinon.stub(homescreen, 'ensure');
      var changed = false;
      window.addEventListener('homescreen-changed',
        function homescreenChange2() {
          window.removeEventListener('homescreen-changed', homescreenChange2);
          changed = true;
      });
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = window.homescreenLauncher.getHomescreen();
      assert.isTrue(stubEnsure.called);
      assert.isFalse(changed);
      stubEnsure.restore();
    });

    test('homescreen ensure', function() {
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = window.homescreenLauncher.getHomescreen();
      var stubEnsure = this.sinon.stub(homescreen, 'ensure');
      homescreen = window.homescreenLauncher.getHomescreen();
      homescreen = window.homescreenLauncher.getHomescreen();
      assert.isTrue(stubEnsure.calledTwice);
      stubEnsure.restore();
    });

    test('trustedUI shown', function() {
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = window.homescreenLauncher.getHomescreen();
      var stubToggle = this.sinon.stub(homescreen, 'toggle');
      window.homescreenLauncher.handleEvent({
        type: 'trusteduishow'
      });
      assert.isTrue(stubToggle.calledWith(true));
      stubToggle.restore();
    });

    test('trustedUI hidden', function() {
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = window.homescreenLauncher.getHomescreen();
      var stubToggle = this.sinon.stub(homescreen, 'toggle');
      window.homescreenLauncher.handleEvent({
        type: 'trusteduihide'
      });
    });

    test('appopened', function() {
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      var hasTrustedUI = this.sinon.stub(MockTrustedUIManager, 'hasTrustedUI');
      hasTrustedUI.returns(false);
      homescreen = window.homescreenLauncher.getHomescreen();
      var stubFadeOut = this.sinon.stub(homescreen, 'fadeOut');

      window.homescreenLauncher.handleEvent({
        type: 'appopened',
        detail: {
          origin: 'fake'
        }
      });
      assert.isTrue(stubFadeOut.called);
    });

    test('keyboard showed', function() {
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = window.homescreenLauncher.getHomescreen();
      var stubFadeOut = this.sinon.stub(homescreen, 'fadeOut');
      window.homescreenLauncher.handleEvent({
        type: 'keyboardchange'
      });
      assert.isTrue(stubFadeOut.called);
      stubFadeOut.restore();
    });
  });
});
