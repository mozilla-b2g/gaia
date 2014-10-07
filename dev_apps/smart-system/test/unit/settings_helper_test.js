'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/js/settings_helper.js');

suite('SettingsHelper', function() {
  var realMozSettings;
  var SETTINGS_KEY = 'settings.key';

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
  });

  test('Should be initialized correctly without mozSettings', function(done) {
    // All settings should be the same as the specified default value
    // when 'settings.key' is null.
    var defaultValue = 'default_value';
    var settingsHepler = SettingsHelper(SETTINGS_KEY, defaultValue);

    settingsHepler.get(function(value) {
      assert.equal(value, defaultValue);
      done();
    });
  });

  test('Should be initialized correctly with mozSettings', function(done) {
    var defaultValue = 'default_value';
    MockNavigatorSettings.mSettings[SETTINGS_KEY] = defaultValue;

    var settingsHepler = SettingsHelper(SETTINGS_KEY);
    settingsHepler.get(function(value) {
      assert.equal(value, defaultValue);
      done();
    });
  });

  test('Should set to mozSettings with correct value', function(done) {
    var setValue = 'set_value';
    var settingsHepler = SettingsHelper(SETTINGS_KEY);

    settingsHepler.set(setValue, function() {
      assert.equal(MockNavigatorSettings.mSettings[SETTINGS_KEY], setValue);
      done();
    });
  });

  test('Shoule reflect mozSettings changes', function(done) {
    var settingsHepler = SettingsHelper(SETTINGS_KEY, false);

    settingsHepler.get(function(value) {
      // Default false
      assert.equal(value, false);

      var obj = {};
      obj[SETTINGS_KEY] = true;
      var req = MockNavigatorSettings.createLock().set(obj);
      req.onsuccess = function() {
        settingsHepler.get(function(value) {
          assert.equal(value, true);
          done();
        });
      };
    });
  });
});
