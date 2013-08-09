'use strict';

requireApp('sms/shared/test/unit/mocks/mock_settings_url.js');
requireApp('sms/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('sms/test/unit/mock_audio.js');
requireApp('sms/test/unit/mock_navigator_vibrate.js');

suite('check the ringtone and vibrate function', function() {
  var realAudio;
  var realMozSettings;
  var realVibrate;

  var mocksHelper = new MocksHelper(['SettingsURL']).init();
  mocksHelper.attachTestHelpers();

  suiteSetup(function(done) {

    // Stash references to the original objects
    realAudio = Audio;
    realMozSettings = navigator.mozSettings;
    realVibrate = navigator.vibrate;

    // Reassign with mocks
    Audio = MockAudio;
    navigator.mozSettings = MockNavigatorSettings;
    navigator.vibrate = MockVibrate;

    requireApp('sms/js/notification.js', done);
  });

  suiteTeardown(function() {
    // Restore all the original objects
    Audio = realAudio;
    navigator.mozSettings = realMozSettings;
    navigator.vibrate = realVibrate;
    mocksHelper.suiteTeardown;
  });

  setup(function() {
    // Spy on the mocks
    this.sinon.spy(Audio.prototype, 'play');
    this.sinon.spy(navigator, 'vibrate');
    this.sinon.spy(window, 'Audio');
  });

  teardown(function() {
    Audio.prototype.play.restore();
    navigator.vibrate.restore();
    window.Audio.restore();
  });

  function triggerObservers(settings) {
    for (var key in settings) {
      navigator.mozSettings.mTriggerObservers(key, {
        settingName: key,
        settingValue: settings[key]
      });
    }
  }

  suite('volume is 1 and vibration is enabled', function() {
    test('play ringtone and vibrate', function() {
      var settings = {
        'audio.volume.notification': 1,
        'notification.ringtone': 'ringtone',
        'vibration.enabled': true
      };
      navigator.mozSettings.createLock().set(settings);
      triggerObservers(settings);

      Notification.ringtone();
      Notification.vibrate();

      assert.ok(Audio.prototype.play.called);
      assert.ok(navigator.vibrate.called);

      assert.ok(Audio.called);
      assert.deepEqual(navigator.vibrate.args[0][0], [200, 200, 200, 200]);
    });
  });

  suite('volume is 1 and vibration is disabled', function() {
    test('play ringtone and do not vibrate', function() {
      var settings = {
        'audio.volume.notification': 1,
        'notification.ringtone': 'ringtone',
        'vibration.enabled': false
      };
      navigator.mozSettings.createLock().set(settings);
      triggerObservers(settings);

      Notification.ringtone();
      Notification.vibrate();

      assert.ok(Audio.prototype.play.called);
      assert.ok(!navigator.vibrate.called);

      assert.ok(Audio.called);
      assert.equal(navigator.vibrate.args.length, 0);
    });
  });

  suite('volume is 0 and vibration is enabled', function() {
    test('do not play ringtone and vibrate', function() {
      var settings = {
        'audio.volume.notification': 0,
        'notification.ringtone': 'ringtone',
        'vibration.enabled': true
      };
      navigator.mozSettings.createLock().set(settings);
      triggerObservers(settings);

      Notification.ringtone();
      Notification.vibrate();

      assert.ok(!Audio.prototype.play.called);
      assert.ok(navigator.vibrate.called);

      assert.ok(!Audio.called);
      assert.deepEqual(navigator.vibrate.args[0][0], [200, 200, 200, 200]);
    });
  });

  suite('volume is 0 and vibration is disabled', function() {
    test('play ringtone and do not vibrate', function() {
      var settings = {
        'audio.volume.notification': 0,
        'notification.ringtone': 'ringtone',
        'vibration.enabled': false
      };
      navigator.mozSettings.createLock().set(settings);
      triggerObservers(settings);

      Notification.ringtone();
      Notification.vibrate();

      assert.ok(!Audio.prototype.play.called);
      assert.ok(!navigator.vibrate.called);

      assert.ok(!Audio.called);
      assert.equal(navigator.vibrate.args.length, 0);
    });
  });
});
