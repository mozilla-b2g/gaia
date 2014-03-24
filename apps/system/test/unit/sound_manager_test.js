'use strict';

/* global MocksHelper, MockL10n, SoundManager, MockSettingsListener, MockLock,
          MockScreenManager, MockNavigatorSettings, MockasyncStorage,
          MockCustomDialog */

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_asyncStorage.js');
requireApp('system/test/unit/mock_bluetooth.js');
requireApp('system/test/unit/mock_custom_dialog.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_navigator_moz_telephony.js');
requireApp('system/test/unit/mock_screen_manager.js');
requireApp('system/js/async_semaphore.js');
requireApp('system/js/sound_manager.js');

mocha.globals([
  'SettingsListener',
  'Bluetooth',
  'CustomDialog',
  'FtuLauncher',
  'ScreenManager',
  'SoundManager'
]);

var mocksForSoundManager = new MocksHelper([
  'asyncStorage',
  'Bluetooth',
  'CustomDialog',
  'FtuLauncher',
  'ScreenManager',
  'SettingsListener'
]).init();

suite('system/sound manager', function() {
  var realL10n;
  var realMozSettings;
  var soundManager;

  mocksForSoundManager.attachTestHelpers();

  function sendChromeEvent(detail) {
    var evt = new CustomEvent('mozChromeEvent', { detail: detail });
    window.dispatchEvent(evt);
  }

  function checkVolume(data) {
    for (var name in data) {
      assert.equal(data[name], soundManager.currentVolume[name]);
    }
  }

  suiteSetup(function() {
    loadBodyHTML('/index.html');
    realL10n = navigator.mozL10n;
    realMozSettings = navigator.mozSettings;
    navigator.mozL10n = MockL10n;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozSettings = realMozSettings;
    document.body.innerHTML = '';
  });

  suite('stop test', function() {
    setup(function() {
      soundManager = new SoundManager();
      soundManager.start();
    });

    test('stop listening event listener', function() {
      sendChromeEvent({'type': 'default-volume-channel-changed',
                       'channel': 'normal'});
      assert.equal('normal', soundManager.defaultVolumeControlChannel);
      soundManager.stop();
      sendChromeEvent({'type': 'default-volume-channel-changed',
                       'channel': 'none'});
      assert.equal('normal', soundManager.defaultVolumeControlChannel);
    });
  });

  suite('auto start/stop', function() {
    setup(function() {
      soundManager = new SoundManager();
      soundManager.start();
    });

    teardown(function() {
      soundManager.stop();
    });

    suite('change channel', function() {
      test('default volume channel changed', function() {
        sendChromeEvent({'type': 'default-volume-channel-changed',
                         'channel': 'normal'});

        assert.equal('normal', soundManager.defaultVolumeControlChannel);
      });

      test('audio channel changed', function() {
        sendChromeEvent({'type': 'audio-channel-changed',
                         'channel': 'alarm'});

        assert.equal('alarm', soundManager.currentChannel);
      });
    });

    suite('read volume from settings', function() {
      setup(function() {
        MockSettingsListener.mTriggerCallback('audio.volume.alarm', 1);
        MockSettingsListener.mTriggerCallback('audio.volume.bt_sco', 2);
        MockSettingsListener.mTriggerCallback('audio.volume.content', 3);
        MockSettingsListener.mTriggerCallback('audio.volume.notification', 4);
        MockSettingsListener.mTriggerCallback('audio.volume.telephony', 5);
      });

      test('volume for each channel changed', function() {
        assert.equal(1, soundManager.currentVolume.alarm);
        assert.equal(2, soundManager.currentVolume.bt_sco);
        assert.equal(3, soundManager.currentVolume.content);
        assert.equal(4, soundManager.currentVolume.notification);
        assert.equal(5, soundManager.currentVolume.telephony);
      });
    });

    suite('settings changed', function() {
      test('key: audio.volume.cemaxvol', function() {
        MockSettingsListener.mTriggerCallback('audio.volume.cemaxvol', 6);
        assert.equal(6, soundManager.CEWarningVol);
      });

      test('key: vibration.enabled', function() {
        MockSettingsListener.mTriggerCallback('vibration.enabled', true);
        assert.equal(true, soundManager.vibrationEnabled);
        MockSettingsListener.mTriggerCallback('vibration.enabled', false);
        assert.equal(false, soundManager.vibrationEnabled);
      });
    });

    suite('volume change', function() {
      setup(function() {
        // reset the all volume to 5
        soundManager.currentVolume.alarm = 5;
        soundManager.currentVolume.bt_sco = 5;
        soundManager.currentVolume.content = 5;
        soundManager.currentVolume.notification = 5;
        soundManager.currentVolume.telephony = 5;
        soundManager.currentChannel = 'normal';
      });

      test('volume up event', function() {
        window.dispatchEvent(new CustomEvent('volumeup'));
        checkVolume({
          'alarm': 5,
          'bt_sco': 5,
          'content': 6,
          'notification': 5,
          'telephony': 5
        });
      });

      test('volume down event', function() {
        window.dispatchEvent(new CustomEvent('volumedown'));
        checkVolume({
          'alarm': 5,
          'bt_sco': 5,
          'content': 4,
          'notification': 5,
          'telephony': 5
        });
      });

      test('volume down to vibrate', function() {
        soundManager.currentChannel = 'notification';
        soundManager.currentVolume.notification = 1;
        soundManager.vibrationEnabled = false;
        window.dispatchEvent(new CustomEvent('volumedown'));
        checkVolume({
          'alarm': 5,
          'bt_sco': 5,
          'content': 5,
          'notification': 0,
          'telephony': 5
        });
        assert.equal('MUTE', soundManager.muteState);
        assert.isTrue(soundManager.vibrationEnabled);
        assert.isTrue(MockNavigatorSettings.mSettings['vibration.enabled']);
        var vibrationClassList = document.getElementById('volume').classList;
        assert.isTrue(vibrationClassList.contains('vibration'));
      });

      test('volume down to silent', function() {
        soundManager.currentChannel = 'notification';
        soundManager.currentVolume.notification = 0;
        window.dispatchEvent(new CustomEvent('volumedown'));
        // we cannot check content channel here, because it is driven by
        // SettingsListener's event.
        checkVolume({
          'alarm': 5,
          'bt_sco': 5,
          'notification': 0,
          'telephony': 5
        });
        assert.equal('MUTE', soundManager.muteState);
        assert.isFalse(soundManager.vibrationEnabled);
        assert.isFalse(MockNavigatorSettings.mSettings['vibration.enabled']);
        // The content channel should be mute too.
        assert.equal(0,
                     MockNavigatorSettings.mSettings['audio.volume.content']);
        var vibrationClassList = document.getElementById('volume').classList;
        assert.isFalse(vibrationClassList.contains('vibration'));
      });

      test('handleVolumeKey: screen-off and channel none', function() {
        MockScreenManager.screenEnabled = false;
        soundManager.currentChannel = 'none';
        window.dispatchEvent(new CustomEvent('volumeup'));
        checkVolume({
          'alarm': 5,
          'bt_sco': 5,
          'content': 5,
          'notification': 5,
          'telephony': 5
        });
        MockScreenManager.screenEnabled = true;
      });

      test('handleVolumeKey: headset connected and channel-none', function() {
        soundManager.isHeadsetConnected = true;
        soundManager.currentChannel = 'none';
        soundManager.homescreenVisible = true;
        window.dispatchEvent(new CustomEvent('volumeup'));
        checkVolume({
          'alarm': 5,
          'bt_sco': 5,
          'content': 5,
          'notification': 6,
          'telephony': 5
        });
      });

      test('handleVolumeKey: not at homescreen', function() {
        soundManager.currentChannel = 'none';
        soundManager.homescreenVisible = false;
        window.dispatchEvent(new CustomEvent('volumeup'));
        checkVolume({
          'alarm': 5,
          'bt_sco': 5,
          'content': 6,
          'notification': 5,
          'telephony': 5
        });
      });

      test('over volume up', function() {
        soundManager.changeVolume(20);
        checkVolume({
          'alarm': 5,
          'bt_sco': 5,
          'content': 15,
          'notification': 5,
          'telephony': 5
        });
      });

      test('enter slient mode', function() {
        soundManager.currentVolume.content = 15;
        soundManager.enterSilentMode('content');
        assert.equal(0,
                     MockNavigatorSettings.mSettings['audio.volume.content']);
        MockLock.mCallbacks.onsuccess();
        assert.equal(15, MockasyncStorage.mItems['content.volume']);
      });

      test('leave slient mode', function() {
        soundManager.currentVolume.content = 15;
        soundManager.enterSilentMode('content');
        soundManager.leaveSilentMode('content');
        assert.equal(15,
                     MockNavigatorSettings.mSettings['audio.volume.content']);
      });

      test('mute it', function() {
        window.dispatchEvent(new CustomEvent('mute'));
        assert.equal(0,
                  MockNavigatorSettings.mSettings['audio.volume.notification']);
      });

      test('umute it', function() {
        window.dispatchEvent(new CustomEvent('mute'));
        window.dispatchEvent(new CustomEvent('unmute'));
        assert.equal(5,
                  MockNavigatorSettings.mSettings['audio.volume.notification']);
      });

      test('mute notification and unmute notification/content', function() {
        soundManager.enterSilentMode('content');
        assert.equal(0,
                     MockNavigatorSettings.mSettings['audio.volume.content']);

        window.dispatchEvent(new CustomEvent('mute'));
        window.dispatchEvent(new CustomEvent('unmute'));

        assert.isTrue(
                  MockNavigatorSettings.mSettings['audio.volume.content'] > 0);
      });
    });

    suite('CE accumulator', function() {
      setup(function() {
        SoundManager.TIME_ONE_MINUTE = 10;
        SoundManager.CE_RESET_TIME = 50;
        soundManager.currentVolume.content = 15;
        sendChromeEvent({'type': 'headphones-status-changed',
                         'state': 'on' });
        sendChromeEvent({'type': 'audio-channel-changed',
                         'channel': 'content'});
      });

      test('CE check', function() {
        assert.equal(10,
                     MockNavigatorSettings.mSettings['audio.volume.content']);
        MockLock.mCallbacks.onsuccess();
        assert.isTrue(MockCustomDialog.mShown);
        MockCustomDialog.mShowedCancel.callback();
        assert.isTrue(soundManager.CEAccumulatorID > 0);
        assert.isTrue(soundManager.CEAccumulatorTime > 0);
      });

      test('CE times out and reset to original state', function(done) {
        // trigger timer
        MockLock.mCallbacks.onsuccess();
        function checkResult() {
          assert.equal(0, soundManager.CEAccumulatorTime);
          assert.equal(0, soundManager.CETimestamp);
          done();
        }
        window.setTimeout(checkResult, 55);
      });
    });
  });
});
