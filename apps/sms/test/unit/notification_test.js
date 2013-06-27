'use strict';

requireApp('sms/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('sms/test/unit/mock_audio.js');
requireApp('sms/test/unit/mock_navigator_vibrate.js');

suite('check the ringtone and vibrate function', function() {
  var realMozSettings;
  var realAudio;
  var realVibrate;

  suiteSetup(function(done) {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realVibrate = navigator.vibrate;
    navigator.vibrate = MockVibrate;
    realAudio = Audio;
    Audio = MockAudio;
    requireApp('sms/js/notification.js', done);
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    Audio = realAudio;
    navigator.vibrate = realVibrate;
  });

  function triggerObservers(settings) {
    for (var key in settings) {
      MockNavigatorSettings.mTriggerObservers(key,
        {
          'settingName': key,
          'settingValue': settings[key]
        }
      );
    }
  }

  suite('volume is 1 and vibration is enabled', function() {
    suiteTeardown(function() {
      MockAudio.mTeardown();
      MockVibrate.mTeardown();
    });

    test('play ringtone and vibrate', function() {
      var settings = {
        'audio.volume.notification': 1,
        'notification.ringtone': 'ringtone',
        'vibration.enabled': true
      };
      MockNavigatorSettings.createLock().set(settings);
      triggerObservers(settings);

      Notification.ringtone();
      assert.ok(MockAudio.isPlayed);
      Notification.vibrate();
      assert.ok(MockVibrate.isVibrated);
    });
  });

  suite('volume is 1 and vibration is disabled', function() {
    suiteTeardown(function() {
      MockAudio.mTeardown();
      MockVibrate.mTeardown();
    });

    test('play ringtone and do not vibrate', function() {
      var settings = {
        'audio.volume.notification': 1,
        'notification.ringtone': 'ringtone',
        'vibration.enabled': false
      };
      MockNavigatorSettings.createLock().set(settings);
      triggerObservers(settings);

      Notification.ringtone();
      assert.ok(MockAudio.isPlayed);
      Notification.vibrate();
      assert.isFalse(MockVibrate.isVibrated);
    });
  });

  suite('volume is 0 and vibration is enabled', function() {
    suiteTeardown(function() {
      MockAudio.mTeardown();
      MockVibrate.mTeardown();
    });

    test('do not play ringtone and vibrate', function() {
      var settings = {
        'audio.volume.notification': 0,
        'notification.ringtone': 'ringtone',
        'vibration.enabled': true
      };
      MockNavigatorSettings.createLock().set(settings);
      triggerObservers(settings);

      Notification.ringtone();
      assert.isFalse(MockAudio.isPlayed);
      Notification.vibrate();
      assert.ok(MockVibrate.isVibrated);
    });
  });

  suite('volume is 0 and vibration is disabled', function() {
    suiteTeardown(function() {
      MockAudio.mTeardown();
      MockVibrate.mTeardown();
    });

    test('play ringtone and do not vibrate', function() {
      var settings = {
        'audio.volume.notification': 0,
        'notification.ringtone': 'ringtone',
        'vibration.enabled': false
      };
      MockNavigatorSettings.createLock().set(settings);
      triggerObservers(settings);

      Notification.ringtone();
      assert.isFalse(MockAudio.isPlayed);
      Notification.vibrate();
      assert.isFalse(MockVibrate.isVibrated);
    });
  });
});
