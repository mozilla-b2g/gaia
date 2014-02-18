'use strict';

mocha.globals(['Applications', 'HomescreenWindow',
              'SettingsListener', 'homescreenLauncher']);

requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/homescreen_launcher.js');

var mocksForHomescreenLauncher = new MocksHelper(['FtuLauncher']).init();

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

suite('system/HomescreenLauncher', function() {
  suite('start', function() {
    var reals = {};
    var homescreen;
    mocksForHomescreenLauncher.attachTestHelpers();

    setup(function() {
      switchProperty(window, 'Applications', MockApplications, reals);
      switchProperty(window, 'HomescreenWindow', MockHomescreenWindow, reals);
      switchProperty(window, 'SettingsListener', MockSettingsListener, reals);
      MockApplications.ready = true;
    });

    teardown(function() {
      if (typeof homescreenLauncher !== undefined) {
        homescreenLauncher.stop();
        homescreenLauncher = undefined;
      }
      MockSettingsListener.mTeardown();
      MockApplications.mTeardown();
      restoreProperty(window, 'Applications', reals);
      restoreProperty(window, 'HomescreenWindow', reals);
      restoreProperty(window, 'SettingsListener', reals);
    });

    test('start a homescreen', function() {
      var ready = false;
      window.addEventListener('homescreen-ready', function homescreenReady() {
        window.removeEventListener('homescreen-ready', homescreenReady);
        ready = true;
      });
      window.homescreenLauncher = new HomescreenLauncher().start();
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = homescreenLauncher.getHomescreen();
      assert.isTrue(homescreen.isHomescreen);
      assert.isTrue(ready);
    });
  });

  suite('other than start', function() {
    var reals = {};
    var homescreen;

    setup(function() {
      switchProperty(window, 'Applications', MockApplications, reals);
      switchProperty(window, 'HomescreenWindow', MockHomescreenWindow, reals);
      switchProperty(window, 'SettingsListener', MockSettingsListener, reals);
      MockApplications.ready = true;
      window.homescreenLauncher = new HomescreenLauncher().start();
    });

    teardown(function() {
      if (typeof homescreenLauncher !== 'undefined') {
        homescreenLauncher.stop();
        homescreenLauncher = undefined;
      }
      MockSettingsListener.mTeardown();
      MockApplications.mTeardown();
      restoreProperty(window, 'Applications', reals);
      restoreProperty(window, 'HomescreenWindow', reals);
      restoreProperty(window, 'SettingsListener', reals);
    });

    test('replace the homescreen', function() {
      var changed = false;
      window.addEventListener('homescreen-changed',
        function homescreenChange() {
          window.removeEventListener('homescreen-changed', homescreenChange);
          changed = true;
      });
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = homescreenLauncher.getHomescreen();
      var stubKill = this.sinon.stub(homescreen, 'kill');
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('second.home');
      homescreen = homescreenLauncher.getHomescreen();
      assert.equal(homescreen.manifestURL, 'second.home');
      assert.isTrue(changed);
      assert.isTrue(stubKill.called);
      stubKill.restore();
    });

    test('homescreen is the same', function() {
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = homescreenLauncher.getHomescreen();
      var stubEnsure = this.sinon.stub(homescreen, 'ensure');
      var changed = false;
      window.addEventListener('homescreen-changed',
        function homescreenChange2() {
          window.removeEventListener('homescreen-changed', homescreenChange2);
          changed = true;
      });
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = homescreenLauncher.getHomescreen();
      assert.isTrue(stubEnsure.called);
      assert.isFalse(changed);
      stubEnsure.restore();
    });

    test('homescreen ensure', function() {
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = homescreenLauncher.getHomescreen();
      var stubEnsure = this.sinon.stub(homescreen, 'ensure');
      homescreen = homescreenLauncher.getHomescreen();
      homescreen = homescreenLauncher.getHomescreen();
      assert.isTrue(stubEnsure.calledTwice);
      stubEnsure.restore();
    });

    test('trustedUI shown', function() {
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = homescreenLauncher.getHomescreen();
      var stubToggle = this.sinon.stub(homescreen, 'toggle');
      homescreenLauncher.handleEvent({
        type: 'trusteduishow'
      });
      assert.isTrue(stubToggle.calledWith(true));
      stubToggle.restore();
    });


    test('trustedUI hidden', function() {
      MockSettingsListener.mCallbacks['homescreen.manifestURL']('first.home');
      homescreen = homescreenLauncher.getHomescreen();
      var stubToggle = this.sinon.stub(homescreen, 'toggle');
      homescreenLauncher.handleEvent({
        type: 'trusteduihide'
      });
      assert.isTrue(stubToggle.calledWith(false));
      stubToggle.restore();
    });
  });
});
