'use strict';

mocha.globals(['Applications', 'HomescreenWindow',
              'SettingsListener', 'HomescreenLauncher']);

requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForHomescreenLauncher = new MocksHelper([
  'Applications', 'HomescreenWindow', 'TrustedUIManager',
  'SettingsListener'
]).init();

suite('system/HomescreenLauncher', function() {
  mocksForHomescreenLauncher.attachTestHelpers();
  var homescreen;

  setup(function(done) {
    MockApplications.ready = true;
    requireApp('system/js/homescreen_launcher.js', done);
  });

  teardown(function() {
  });

  test('init a homescreen', function() {
    var ready = false;
    window.addEventListener('homescreen-ready', function homescreenReady() {
      window.removeEventListener('homescreen-ready', homescreenReady);
      ready = true;
    });
    HomescreenLauncher.init();
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
    homescreen = HomescreenLauncher.getHomescreen();
    assert.isTrue(homescreen.isHomescreen);
    assert.isTrue(ready);
  });

  test('replace the homescreen', function() {
    var changed = false;
    window.addEventListener('homescreen-changed', function homescreenChange() {
      window.removeEventListener('homescreen-changed', homescreenChange);
      changed = true;
    });
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
    homescreen = HomescreenLauncher.getHomescreen();
    var stubKill = this.sinon.stub(homescreen, 'kill');
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('second.home');
    homescreen = HomescreenLauncher.getHomescreen();
    assert.equal(homescreen.manifestURL, 'second.home');
    assert.isTrue(changed);
    assert.isTrue(stubKill.called);
    stubKill.restore();
  });

  test('homescreen is the same', function() {
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
    homescreen = HomescreenLauncher.getHomescreen();
    var stubEnsure = this.sinon.stub(homescreen, 'ensure');
    var changed = false;
    window.addEventListener('homescreen-changed', function homescreenChange2() {
      window.removeEventListener('homescreen-changed', homescreenChange2);
      changed = true;
    });
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
    homescreen = HomescreenLauncher.getHomescreen();
    assert.isTrue(stubEnsure.called);
    assert.isFalse(changed);
    stubEnsure.restore();
  });

  test('homescreen ensure', function() {
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
    homescreen = HomescreenLauncher.getHomescreen();
    var stubEnsure = this.sinon.stub(homescreen, 'ensure');
    homescreen = HomescreenLauncher.getHomescreen();
    homescreen = HomescreenLauncher.getHomescreen();
    assert.isTrue(stubEnsure.calledTwice);
    stubEnsure.restore();
  });

  test('trustedUI shown', function() {
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
    homescreen = HomescreenLauncher.getHomescreen();
    var stubToggle = this.sinon.stub(homescreen, 'toggle');
    HomescreenLauncher.handleEvent({
      type: 'trusteduishow'
    });
    assert.isTrue(stubToggle.calledWith(true));
    stubToggle.restore();
  });

  test('trustedUI hidden', function() {
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
    homescreen = HomescreenLauncher.getHomescreen();
    var stubToggle = this.sinon.stub(homescreen, 'toggle');
    HomescreenLauncher.handleEvent({
      type: 'trusteduihide'
    });
    assert.isTrue(stubToggle.calledWith(false));
    stubToggle.restore();
  });

  test('appopened', function() {
    var hasTrustedUI = this.sinon.stub(MockTrustedUIManager, 'hasTrustedUI');
    hasTrustedUI.returns(false);
    homescreen = HomescreenLauncher.getHomescreen();
    var stubFadeOut = this.sinon.stub(homescreen, 'fadeOut');

    HomescreenLauncher.handleEvent({
      type: 'appopened',
      detail: {
        origin: 'fake'
      }
    });

    assert.isTrue(stubFadeOut.called);
  });

  test('keyboard showed', function() {
    MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
    homescreen = HomescreenLauncher.getHomescreen();
    var stubFadeOut = this.sinon.stub(homescreen, 'fadeOut');
    HomescreenLauncher.handleEvent({
      type: 'keyboardchange'
    });
    assert.isTrue(stubFadeOut.called);
    stubFadeOut.restore();
  });
});
