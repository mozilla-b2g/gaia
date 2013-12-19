'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('system/shared/js/voice_privacy_settings_helper.js');

suite('VoicePrivacySettingsHelper', function() {
  var VOICE_PRIVACY_KEY = 'ril.voicePrivacy.enabled';
  var realMozSettings, realMozMobileConnections;

  // A helper function
  var assertAndDone = function(expectedValue, done, value) {
    assert.equal(value, expectedValue);
    done();
  };

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    navigator.mozMobileConnections = realMozMobileConnections;
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    MockNavigatorMozMobileConnections.mTeardown();
  });

  suite('Should be initialized correctly without mozSettings', function() {
    // All settings should be false when 'ril.voicePrivacy.enabled' is null.
    test('one mobile connection', function(done) {
      var voicePrivacyHelper = VoicePrivacySettingsHelper();
      voicePrivacyHelper.getEnabled(0, assertAndDone.bind(null, false, done));
    });

    test('two mobile connections', function(done) {
      MockNavigatorMozMobileConnections.mAddMobileConnection();
      var voicePrivacyHelper = VoicePrivacySettingsHelper();

      var returnCount = 0;
      var checkDone = function() {
        returnCount++;
        if (returnCount == MockNavigatorMozMobileConnections.length) {
          done();
        }
      };

      voicePrivacyHelper.getEnabled(0,
        assertAndDone.bind(null, false, checkDone));

      voicePrivacyHelper.getEnabled(1,
        assertAndDone.bind(null, false, checkDone));
    });
  });

  suite('Should be initialized correctly with mozSettings', function() {
    setup(function() {
      MockNavigatorSettings.mSettings[VOICE_PRIVACY_KEY] = [false, true];
    });

    test('index 0', function(done) {
      var voicePrivacyHelper = VoicePrivacySettingsHelper();
      voicePrivacyHelper.getEnabled(0, assertAndDone.bind(null, false, done));
    });

    test('index 1', function(done) {
      var voicePrivacyHelper = VoicePrivacySettingsHelper();
      voicePrivacyHelper.getEnabled(1, assertAndDone.bind(null, true, done));
    });
  });

  suite('Should set to mozSettings with correct value', function() {
    test('Set enabled to true', function(done) {
      var voicePrivacyHelper = VoicePrivacySettingsHelper();
      voicePrivacyHelper.setEnabled(0, true, function() {
        var settings = MockNavigatorSettings.mSettings[VOICE_PRIVACY_KEY];

        assert.equal(settings[0], true);
        voicePrivacyHelper.getEnabled(0, assertAndDone.bind(null, true, done));
      });
    });

    test('Set enabled to false', function(done) {
      var voicePrivacyHelper = VoicePrivacySettingsHelper();
      voicePrivacyHelper.setEnabled(0, false, function() {
        var settings = MockNavigatorSettings.mSettings[VOICE_PRIVACY_KEY];

        assert.equal(settings[0], false);
        voicePrivacyHelper.getEnabled(0, assertAndDone.bind(null, false, done));
      });
    });
  });

  suite('Shoule reflect mozSettings changes', function() {
    test('Set enabled to true', function(done) {
      var voicePrivacyHelper = VoicePrivacySettingsHelper();
      voicePrivacyHelper.getEnabled(0, function(enabled) {
        // Default false
        assert.equal(enabled, false);

        var obj = {};
        obj[VOICE_PRIVACY_KEY] = [true];
        var req = MockNavigatorSettings.createLock().set(obj);
        req.onsuccess = function() {
          voicePrivacyHelper.getEnabled(0,
            assertAndDone.bind(null, true, done));
        };
      });
    });

    test('Set enabled to false', function(done) {
      MockNavigatorSettings.mSettings[VOICE_PRIVACY_KEY] = [true];
      var voicePrivacyHelper = VoicePrivacySettingsHelper();
      voicePrivacyHelper.getEnabled(0, function(enabled) {
        // Default false
        assert.equal(enabled, true);

        var obj = {};
        obj[VOICE_PRIVACY_KEY] = [false];
        var req = MockNavigatorSettings.createLock().set(obj);
        req.onsuccess = function() {
          voicePrivacyHelper.getEnabled(0,
            assertAndDone.bind(null, false, done));
        };
      });
    });
  });
});
