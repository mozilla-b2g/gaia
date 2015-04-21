/* global MocksHelper, BaseModule, MockNavigatorSettings, asyncStorage */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_asyncStorage.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/settings_core.js');
requireApp('system/js/launcher.js');

var mocksForLauncher = new MocksHelper([
  'NavigatorSettings', 'asyncStorage' 
]).init();

suite('system/launcher', function() {
  var subject, settingsCore;
  var realMozSettings;
  mocksForLauncher.attachTestHelpers();

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    settingsCore = BaseModule.instantiate('SettingsCore');
    settingsCore.start();
    subject = BaseModule.instantiate('Launcher');
  });

  teardown(function() {
    settingsCore.stop();
    subject.stop();
  });

  function setLaunchConfig(shouldFtu, ftuManifest,
    osVersion, preOsVersion, homeManifest, enableLockscreen,
    wallpaper, valid) {
    asyncStorage.mItems['ftu.enabled'] = shouldFtu;
    MockNavigatorSettings.mSettings['lockscreen.enabled'] = enableLockscreen;
    MockNavigatorSettings.mSettings['ftu.manifestURL'] = ftuManifest;
    MockNavigatorSettings.mSettings['homescreen.manifestURL'] = homeManifest;
    MockNavigatorSettings.mSettings['deviceinfo.os'] = osVersion;
    MockNavigatorSettings.mSettings['deviceinfo.previous_os'] = preOsVersion;
    MockNavigatorSettings.mSettings['wallpaper.image'] = wallpaper;
    MockNavigatorSettings.mSettings['wallpaper.image.valid'] = valid;
  }

  test('should read settings', function(done) {
    setLaunchConfig();
    subject.start().then(function() {
      done();
    });
  });

  suite('launch config', function() {
    test('Should launch ftu if ftu is enabled and ftu manifestURL found',
      function(done) {
        this.sinon.spy(subject.service, 'request');
        setLaunchConfig(true, 'ftu');
        subject.start().then(function() {
          assert.isTrue(
            subject.service.request.calledWith('FtuLauncher:launch', 'ftu'));
          assert.isTrue(
            subject.service.request.calledWith('stepReady', 'done'));
          // Not able to test the promise chain here.
          done();
        });
      });

    test('Should launch homescreen if lockscreen is disabled',
      function(done) {
        this.sinon.spy(subject.service, 'request');
        setLaunchConfig(false, 'ftu', null, null, 'home', false);
        subject.start().then(function() {
          assert.isTrue(
            subject.service.request.calledWith('FtuLauncher:skip'));
          assert.isTrue(
            subject.service.request.calledWith(
              'HomescreenLauncher:launch', 'home'));
          assert.isTrue(
            subject.service.request.calledWith('LockScreenLauncher:standby'));
          done();
        });
      });

    test('Should launch lockscreen if lockscreen is enabled',
      function(done) {
        this.sinon.spy(subject.service, 'request');
        setLaunchConfig(false, 'ftu', null, null, 'home', true);
        subject.start().then(function() {
          assert.isTrue(
            subject.service.request.calledWith(
              'WallpaperManager:initializeWallpaper'));
          // Not able to test the promise chain here.
          done();
        });
      });

    test('Should trigger Ftu if we are upgrading now',
      function(done) {
        this.sinon.spy(subject.service, 'request');
        setLaunchConfig(false, 'ftu', {
          major: 3,
          minor: 0
        }, {
          major: 2,
          minor: 2
        }, 'home', true);
        subject.start().then(function() {
          assert.isTrue(
            subject.service.request.calledWith('FtuLauncher:launch', 'ftu'));
          assert.isTrue(subject.justUpgraded());
          done();
        });
      });
  });
});