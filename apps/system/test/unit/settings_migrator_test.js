'use strict';
/* global MockNavigatorSettings, MockL10n, SettingsMigrator, MockLazyLoader */

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/js/migrators/settings_migrator.js');

suite('system/settings_migrator', function() {
  var realL10n, realSettings, realLazyLoader;
  var clock;
  var keyHour12 = 'locale.hour12';
  var oldPasscode = 'lockscreen.passcode-lock.code';
  var hashedPasscode = 'lockscreen.passcode-lock.digest.value';

  suiteSetup(function() {
    clock = sinon.useFakeTimers();
    realL10n = navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;
    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realSettings;
    window.navigator.mozL10n = realL10n;
    clock.restore();
  });

  suite('start', function() {
    setup(function(done) {
      MockNavigatorSettings.mSetup();
      window.settingsMigrator = new SettingsMigrator();
      this.sinon.stub(window.settingsMigrator, 'keyMigration');
      window.settingsMigrator.start();
      clock.tick(50);
      done();
    });

    test('keyMigration called', function() {
      assert.ok(window.settingsMigrator.keyMigration.called);
    });
  });

  suite('when locale.hour12 is not defined', function() {
    setup(function(done) {
      window.navigator.mozSettings.mSetup();
      this.sinon.spy(navigator.mozL10n, 'get');
      window.settingsMigrator = new SettingsMigrator();
      window.settingsMigrator.start();
      clock.tick(50);
      done();
    });

    test('key should be set by locale', function() {
      assert.ok(navigator.mozL10n.get.called);
      assert.equal(window.navigator.mozSettings.mSettings[keyHour12], false);
    });
  });

  suite('when locale.hour12 exists', function() {
    setup(function(done) {
      window.navigator.mozSettings.mSetup();
      var cset = {};
      cset[keyHour12] = true;
      window.navigator.mozSettings.mSet(cset);
      this.sinon.spy(navigator.mozL10n, 'get');
      window.settingsMigrator = new SettingsMigrator();
      window.settingsMigrator.start();
      clock.tick(50);
      done();
    });

    test('key should be remain the same', function() {
      assert.ok(!navigator.mozL10n.get.called);
      assert.equal(window.navigator.mozSettings.mSettings[keyHour12], true);
    });
  });


  suite('when old passcode is present', function() {
    setup(function(done) {
      window.navigator.mozSettings.mSetup();
      var cset = {};
      cset[oldPasscode] = '1234';
      window.navigator.mozSettings.mSet(cset);
      realLazyLoader = window.LazyLoader;
      window.LazyLoader = MockLazyLoader;
      this.sinon.spy(window.LazyLoader, 'load');
      window.PasscodeHelper = {
        set: function() {
          return Promise.resolve();
        }
      };
      this.sinon.spy(window.PasscodeHelper, 'set');

      window.settingsMigrator = new SettingsMigrator();
      window.settingsMigrator.start();
      clock.tick(50);
      done();
    });

    test('it uses passcodehelper to set new.', function() {
        assert.ok(window.LazyLoader.load.called, 'should use lazyloader');
        assert.ok(window.PasscodeHelper.set.called, 'should use' +
          ' PasscodeHelper');
    });

    teardown(function() {
      window.LazyLoader = realLazyLoader;
    });
  });

  suite('when old passcode is not present', function() {
    setup(function(done) {
      window.navigator.mozSettings.mSetup();
      var cset = {};
      cset[hashedPasscode] = '1234';
      window.navigator.mozSettings.mSet(cset);
      realLazyLoader = window.LazyLoader;
      window.LazyLoader = MockLazyLoader;
      this.sinon.spy(window.LazyLoader, 'load');
      window.settingsMigrator = new SettingsMigrator();
      window.settingsMigrator.start();
      clock.tick(50);
      done();
    });

    test('it does not load passcodehelper', function() {
      assert.ok(!window.LazyLoader.load.called, 'should not use lazyloader');
    });

    teardown(function() {
      window.LazyLoader = realLazyLoader;
    });
  });

});
