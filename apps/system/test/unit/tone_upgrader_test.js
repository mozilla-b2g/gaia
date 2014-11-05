/* global requireApp, suite, test, suiteSetup, suiteTeardown, setup, teardown */
/* global assert, MockNavigatorSettings, toneUpgrader */ 
'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/js/tone_upgrader.js');

suite('system/ToneUpgrader', function() {
  var realSettings;

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
  });

  suite('Built-in ringtone', function() {
    var type, expectedInfo;

    setup(function() {
      type = 'ringtone';
      expectedInfo = {
        settingsBase: 'dialer.ringtone',
        baseURL: '/shared/resources/media/ringtones/',
        name: 'ringer_firefox',
        filename: 'ringer_firefox.opus',
        mimetype: 'audio/ogg'
      };
    });

    teardown(function() {});

    suite('ToneUpgrader.getInfo()', function() {
      test('with ringtone type', function() {
        var testInfo = toneUpgrader.getInfo(type);

        for (var property in testInfo) {
          assert.equal(testInfo[property], expectedInfo[property]);
        }
      });
    });

    suite('ToneUpgrader.setDefault()', function() {
      var toneName, toneIdKey, toneDefaultIdKey;

      setup(function() {
        toneName = expectedInfo.settingsBase + '.name';
        toneIdKey = expectedInfo.settingsBase + '.id';
        toneDefaultIdKey = expectedInfo.settingsBase + '.default.id';
      });

      teardown(function() {
        for (var property in MockNavigatorSettings.mSettings) {
          MockNavigatorSettings.mSettings[property] = '';
        }
      });

      test('with ringtone type', function(done) {
        toneUpgrader.setDefault(type).then(function() {
          var mSettings = MockNavigatorSettings.mSettings;
          var info = expectedInfo;
          var prefix = 'builtin:';
          assert.equal(mSettings[toneName].l10nID, info.name + '2');
          assert.equal(mSettings[toneIdKey], prefix + type + '/' + info.name);
          assert.equal(mSettings[toneDefaultIdKey], prefix + info.name);
        }, function() {
          assert.isTrue(false, 'Failed to set the default ringtone!');
        }).then(done, done);
      });
    });

    suite('ToneUpgrader.perform()', function() {
      var toneIdKey;

      setup(function() {
        toneIdKey = toneUpgrader.getInfo(type).settingsBase + '.id';
        MockNavigatorSettings.mSettings[toneIdKey] = 'builtin:one_of_the_tones';
      });

      teardown(function() {
        MockNavigatorSettings.mSettings[toneIdKey] = '';
      });

      test('with ringtone type', function(done) {
        toneUpgrader.perform(type).then(function() {
          assert.isTrue(true, 'Succeed to perform upgrading the ringtone!');
        }, function() {
          assert.isTrue(false, 'Failed to perform upgrading the ringtone!');
        }).then(done, done);
      });
    });
  });

  suite('Customized ringtone', function() {
    var type;
    var toneIdKey;

    setup(function() {
      type = 'ringtone';
      toneIdKey = toneUpgrader.getInfo(type).settingsBase + '.id';
      MockNavigatorSettings.mSettings[toneIdKey] = 'I_am_a_customized_tone';
    });

    teardown(function() {
      MockNavigatorSettings.mSettings[toneIdKey] = '';
    });

    test('ToneUpgrader.perform() with customized ringtone', function(done) {
      toneUpgrader.perform(type).then(function() {
        assert.isTrue(true, 'Succeed to perform upgrading the ringtone!');
      }, function() {
        assert.isTrue(false, 'Failed to perform upgrading the ringtone!');
      }).then(done, done);
    });
  });

  suite('Built-in alerttone', function() {
    var type, expectedInfo;

    setup(function() {
      type = 'alerttone';
      expectedInfo = {
        settingsBase: 'notification.ringtone',
        baseURL: '/shared/resources/media/notifications/',
        name: 'notifier_firefox',
        filename: 'notifier_firefox.opus',
        mimetype: 'audio/ogg'
      };
    });

    teardown(function() {});

    suite('ToneUpgrader.getInfo()', function() {
      test('with alerttone type', function() {
        var testInfo = toneUpgrader.getInfo(type);

        for (var property in testInfo) {
          assert.equal(testInfo[property], expectedInfo[property]);
        }
      });
    });

    suite('ToneUpgrader.setDefault()', function() {
      var toneName, toneIdKey, toneDefaultIdKey;

      setup(function() {
        toneName = expectedInfo.settingsBase + '.name';
        toneIdKey = expectedInfo.settingsBase + '.id';
        toneDefaultIdKey = expectedInfo.settingsBase + '.default.id';
      });

      teardown(function() {
        for (var property in MockNavigatorSettings.mSettings) {
          MockNavigatorSettings.mSettings[property] = '';
        }
      });

      test('with alerttone type', function(done) {
        toneUpgrader.setDefault(type).then(function() {
          var mSettings = MockNavigatorSettings.mSettings;
          var info = expectedInfo;
          var prefix = 'builtin:';
          assert.equal(mSettings[toneName].l10nID, info.name + '2');
          assert.equal(mSettings[toneIdKey], prefix + type + '/' + info.name);
          assert.equal(mSettings[toneDefaultIdKey], prefix + info.name);
        }, function() {
          assert.isTrue(false, 'Failed to set the default alerttone!');
        }).then(done, done);
      });
    });

    suite('ToneUpgrader.perform()', function() {
      var toneIdKey;

      setup(function() {
        toneIdKey = toneUpgrader.getInfo(type).settingsBase + '.id';
        MockNavigatorSettings.mSettings[toneIdKey] = 'builtin:one_of_the_tones';
      });

      teardown(function() {
        MockNavigatorSettings.mSettings[toneIdKey] = '';
      });

      test('with alerttone type', function(done) {
        toneUpgrader.perform(type).then(function() {
          assert.isTrue(true, 'Succeed to perform upgrading the alerttone!');
        }, function() {
          assert.isTrue(false, 'Failed to perform upgrading the alerttone!');
        }).then(done, done);
      });
    });
  });

  suite('Customized alerttone', function() {
    var type;
    var toneIdKey;

    setup(function() {
      type = 'alerttone';
      toneIdKey = toneUpgrader.getInfo(type).settingsBase + '.id';
      MockNavigatorSettings.mSettings[toneIdKey] = 'I_am_a_customized_tone';
    });

    teardown(function() {
      MockNavigatorSettings.mSettings[toneIdKey] = '';
    });

    test('ToneUpgrader.perform() with customized alerttone', function(done) {
      toneUpgrader.perform(type).then(function() {
        assert.isTrue(true, 'Succeed to perform upgrading the ringtone!');
      }, function() {
        assert.isTrue(false, 'Failed to perform upgrading the ringtone!');
      }).then(done, done);
    });
  });
});
