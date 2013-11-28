/*global MockNavigatorSettings, MockAudio, MockVibrate, SettingsURL, Notify,
         MocksHelper, mocha */

'use strict';

mocha.globals(['Notify']);

requireApp('sms/shared/test/unit/mocks/mock_settings_url.js');
requireApp('sms/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('sms/test/unit/mock_audio.js');
requireApp('sms/test/unit/mock_navigator_vibrate.js');

var mocksHelperNotifications = new MocksHelper(['SettingsURL']).init();

suite('check the ringtone and vibrate function', function() {
  var realAudio;
  var realMozSettings;
  var realVibrate;

  mocksHelperNotifications.attachTestHelpers();

  suiteSetup(function(done) {

    // Stash references to the original objects
    realAudio = Audio;
    realMozSettings = navigator.mozSettings;
    realVibrate = navigator.vibrate;

    // Reassign with mocks
    window.Audio = MockAudio;
    navigator.mozSettings = MockNavigatorSettings;
    navigator.vibrate = MockVibrate;

    requireApp('sms/js/notify.js', done);
  });

  suiteTeardown(function() {
    // Restore all the original objects
    window.Audio = realAudio;
    navigator.mozSettings = realMozSettings;
    navigator.vibrate = realVibrate;
  });

  setup(function() {
    // Spy on the mocks
    this.sinon.spy(Audio.prototype, 'play');
    this.sinon.spy(navigator, 'vibrate');
    this.sinon.spy(window, 'Audio');
    this.sinon.useFakeTimers();

    this.sinon.stub(SettingsURL.prototype, 'get', function() {
      return 'ringtone';
    });

    this.sinon.stub(SettingsURL.prototype, 'set', function(value) {
      return value;
    });
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

      Notify.ringtone();
      Notify.vibrate();

      assert.ok(Audio.prototype.play.called);

      // As document is not shown in the test, we launch the
      // event of visibility
      var visibilityEvent = new CustomEvent(
        'visibilitychange',
        {
          bubbles: true
        }
      );

      window.dispatchEvent(visibilityEvent);
      assert.ok(navigator.vibrate.called);

      assert.ok(Audio.called);
      assert.deepEqual(navigator.vibrate.args[0][0], [200, 200, 200, 200]);
      assert.deepEqual(MockAudio.instances[0], {
        src: 'ringtone', mozAudioChannelType: 'notification'
      });
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

      Notify.ringtone();
      Notify.vibrate();

      assert.ok(Audio.prototype.play.called);
      assert.ok(!navigator.vibrate.called);

      assert.ok(Audio.called);
      assert.equal(navigator.vibrate.args.length, 0);
      assert.deepEqual(MockAudio.instances[0], {
        src: 'ringtone', mozAudioChannelType: 'notification'
      });
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

      Notify.ringtone();
      Notify.vibrate();

      // As document is not shown in the test, we launch the
      // event of visibility
      var visibilityEvent = new CustomEvent(
        'visibilitychange',
        {
          bubbles: true
        }
      );

      window.dispatchEvent(visibilityEvent);

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

      Notify.ringtone();
      Notify.vibrate();

      assert.ok(!Audio.prototype.play.called);
      assert.ok(!navigator.vibrate.called);

      assert.ok(!Audio.called);
      assert.equal(navigator.vibrate.args.length, 0);
    });
  });
});
