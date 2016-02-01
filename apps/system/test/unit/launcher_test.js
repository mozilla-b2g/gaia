/* global MocksHelper, BaseModule, MockNavigatorSettings, asyncStorage,
          Service, Deferred */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/test/unit/mock_asyncStorage.js');
requireApp('system/test/unit/deferred.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/settings_core.js');
requireApp('system/js/launcher.js');

var mocksForLauncher = new MocksHelper([
  'NavigatorSettings', 'asyncStorage', 'LazyLoader'
]).init();

suite('system/launcher', function() {
  var subject, settingsCore;
  var realMozSettings;
  mocksForLauncher.attachTestHelpers();
  var fakeFtuLauncher, fakeHomescreenLauncher, fakeLockscreenLauncher;
  var fakeWallpaperManager, fakeCoverScreen;
  var fakeLockScreen;
  var deferreds = {};

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    deferreds.setPassCodeEnabled = new Deferred();
    deferreds.onPasscodeEnabledChanged = new Deferred();
    deferreds['FtuLauncher:launch'] = new Deferred();
    deferreds['FtuLauncher:skip'] = new Deferred();
    deferreds['FtuLauncher:stepReady'] = new Deferred();
    deferreds['HomescreenLauncher:launch'] = new Deferred();
    deferreds['LockScreenLauncher:launch'] = new Deferred();
    deferreds['LockScreenLauncher:standby'] = new Deferred();
    deferreds['WallpaperManager:initializeWallpaper'] = new Deferred();
    deferreds['CoverScreen:animatePoweronLogo'] = new Deferred();
    settingsCore = BaseModule.instantiate('SettingsCore');
    settingsCore.start();
    fakeFtuLauncher = {
      name: 'FtuLauncher',
      launch: sinon.spy(function() {
        return deferreds['FtuLauncher:launch'].promise;
      }),
      skip: sinon.spy(function() {
        return deferreds['FtuLauncher:skip'].promise;
      }),
      stepReady: sinon.spy(function() {
        return deferreds['FtuLauncher:stepReady'].promise;
      })
    };
    fakeHomescreenLauncher = {
      name: 'HomescreenLauncher',
      launch: sinon.spy(function() {
        return deferreds['HomescreenLauncher:launch'].promise;
      })
    };
    fakeLockscreenLauncher = {
      name: 'LockScreenLauncher',
      launch: sinon.spy(function() {
        return deferreds['LockScreenLauncher:launch'].promise;
      }),
      standby: sinon.spy(function() {
        return deferreds['LockScreenLauncher:standby'].promise;
      })
    };
    fakeWallpaperManager = {
      name: 'WallpaperManager',
      initializeWallpaper: sinon.spy(function() {
        return deferreds['WallpaperManager:initializeWallpaper'].promise;
      })
    };
    fakeCoverScreen = {
      name: 'CoverScreen',
      animatePoweronLogo: sinon.spy(function() {
        return deferreds['CoverScreen:animatePoweronLogo'].promise;
      })
    };
    fakeLockScreen = {
      name: 'LockScreen',
      setPassCodeEnabled: sinon.spy(function() {
        return deferreds.setPassCodeEnabled.promise;
      }),
      onPasscodeEnabledChanged: sinon.spy(function() {
        return deferreds.onPasscodeEnabledChanged.promise;
      })
    };
    Service.register('launch', fakeFtuLauncher);
    Service.register('stepReady', fakeFtuLauncher);
    Service.register('skip', fakeFtuLauncher);

    Service.register('launch', fakeHomescreenLauncher);

    Service.register('initializeWallpaper', fakeWallpaperManager);

    Service.register('launch', fakeLockscreenLauncher);
    Service.register('standby', fakeLockscreenLauncher);
    Service.register('animatePoweronLogo', fakeCoverScreen);
    Service.register('setPassCodeEnabled', fakeLockScreen);
    Service.register('onPasscodeEnabledChanged', fakeLockScreen);
    subject = BaseModule.instantiate('Launcher');
  });

  teardown(function() {
    settingsCore.stop();
    subject.stop();
  });

  function setLaunchConfig(shouldFtu, ftuManifest,
    osVersion, preOsVersion, homeManifest, enableLockscreen,
    wallpaper, valid, bPasscode) {
    asyncStorage.mItems['ftu.enabled'] = shouldFtu;
    MockNavigatorSettings.mSettings['lockscreen.enabled'] = enableLockscreen;
    MockNavigatorSettings.mSettings['ftu.manifestURL'] = ftuManifest;
    MockNavigatorSettings.mSettings['homescreen.manifestURL'] = homeManifest;
    MockNavigatorSettings.mSettings['deviceinfo.os'] = osVersion;
    MockNavigatorSettings.mSettings['deviceinfo.previous_os'] = preOsVersion;
    MockNavigatorSettings.mSettings['wallpaper.image'] = wallpaper;
    MockNavigatorSettings.mSettings['wallpaper.image.valid'] = valid;
    MockNavigatorSettings.mSettings['lockscreen.passcode-lock.enabled'] =
      bPasscode;
  }

  test('Should launch homescreen after ftu is launched', function(done) {
    subject.scheduler = {
      release: this.sinon.spy()
    };
    subject.launchFtuThenHomescreen('ftu', 'home').then(function() {
      assert.isTrue(subject.scheduler.release.called);
      done();
    });
    deferreds['FtuLauncher:launch'].resolve();
    deferreds['WallpaperManager:initializeWallpaper'].resolve();
    deferreds['HomescreenLauncher:launch'].resolve();
    deferreds['CoverScreen:animatePoweronLogo'].resolve();
    deferreds['FtuLauncher:stepReady'].resolve();
    deferreds['LockScreenLauncher:standby'].resolve();
  });

  test('LaunchLockscreenThenHomescreen', function(done) {
    subject.scheduler = {
      release: this.sinon.spy()
    };
    subject.launchLockscreenThenHomescreen('home').then(function() {
      assert.isTrue(subject.scheduler.release.called);
      done();
    });
    deferreds['FtuLauncher:skip'].resolve();
    deferreds['WallpaperManager:initializeWallpaper'].resolve();
    deferreds['LockScreenLauncher:launch'].resolve();
    deferreds.onPasscodeEnabledChanged.resolve();
    deferreds.setPassCodeEnabled.resolve();
    deferreds['CoverScreen:animatePoweronLogo'].resolve();
    deferreds['HomescreenLauncher:launch'].resolve();
  });

  test('launchHomescreenAndStandbyLockscreen', function(done) {
    subject.scheduler = {
      release: this.sinon.spy()
    };
    subject.launchHomescreenAndStandbyLockscreen('home').then(function() {
      assert.isTrue(subject.scheduler.release.called);
      done();
    });
    deferreds['FtuLauncher:skip'].resolve();
    deferreds['WallpaperManager:initializeWallpaper'].resolve();
    deferreds['LockScreenLauncher:standby'].resolve();
    deferreds['HomescreenLauncher:launch'].resolve();
    deferreds['CoverScreen:animatePoweronLogo'].resolve();
  });

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
        setLaunchConfig(false, 'ftu',
                        '3.0.0-release', '2.2.0-release', 'home', true);
        this.sinon.spy(subject, 'checkUpgrading');
        subject.start().then(function() {
          assert.isTrue(subject.checkUpgrading.calledOnce);
          assert.ok(subject.checkUpgrading.firstCall.returnValue);
          assert.isTrue(
            subject.service.request.calledWith('FtuLauncher:launch', 'ftu'));
          assert.isTrue(subject.justUpgraded());
        }).then(done, function(ex) { done(ex); });
      });
  });

  suite('checkUpgrading', function() {
    test('no previous version', function() {
      var isUpgrading = subject.checkUpgrading('3.0.0-release', null);
      assert.isFalse(isUpgrading);
    });
    test('sub-point upgrade', function() {
      var isUpgrading = subject.checkUpgrading(
        '3.0.1-release', '3.0.0-release');
      assert.isFalse(isUpgrading);
    });
    test('point upgrade', function() {
      var isUpgrading = subject.checkUpgrading(
        '3.1.1-release', '3.0.0-release');
      assert.isTrue(isUpgrading);
    });
    test('major version upgrade', function() {
      var isUpgrading = subject.checkUpgrading(
        '3.1.1-release', '2.2.0-release');
      assert.isTrue(isUpgrading);
    });
  });
});
