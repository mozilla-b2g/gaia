'use strict';

/* global MocksHelper, MockL10n, SoundManager, MockSettingsListener, MockLock,
          MockNavigatorSettings, MockasyncStorage,
          MockCustomDialog, MockLazyLoader, MockService */

requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_lazy_loader.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_custom_dialog.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/js/async_semaphore.js');
requireApp('system/test/unit/mock_asyncStorage.js');
requireApp('system/test/unit/mock_navigator_moz_telephony.js');
requireApp('system/test/unit/mock_screen_manager.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/playing_icon.js');
requireApp('system/js/headphone_icon.js');
requireApp('system/js/mute_icon.js');
requireApp('system/js/sound_manager.js');

var mocksForSoundManager = new MocksHelper([
  'asyncStorage',
  'CustomDialog',
  'SettingsListener',
  'LazyLoader',
  'Service'
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

  setup(function() {
    MockService.mockQueryWith('screenEnabled', true);
    this.sinon.stub(MockService, 'request', function(action) {
      if (action === 'showCustomDialog') {
        MockCustomDialog.show(arguments[1], arguments[2],
          arguments[3], arguments[4]);
      } else if (action === 'hideCustomDialog') {
        MockCustomDialog.hide(arguments[1], arguments[2],
          arguments[3], arguments[4]);
      } else {
        return Promise.resolve(document.createElement('div'));
      }
    });
    MockLazyLoader.mLoadRightAway = true;
    this.sinon.spy(MockLazyLoader, 'load');
    soundManager = new SoundManager();
    soundManager.start();
  });

  teardown(function() {
    soundManager.stop();
  });

  test('Default channel', function() {
    MockService.mockQueryWith('locked', false);
    soundManager.homescreenVisible = false;
    MockService.mockQueryWith('isFtuRunning', true);
    assert.equal(soundManager.getChannel(), 'notification');
    MockService.mockQueryWith('isFtuRunning', false);
    assert.equal(soundManager.getChannel(), 'content');
  });

  test('Should lazy load icons', function() {
    assert.isTrue(MockLazyLoader.load.calledWith([
      'js/headphone_icon.js',
      'js/mute_icon.js',
      'js/playing_icon.js'
    ]));
  });

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

  suite('Headset', function() {
    setup(function() {
      this.sinon.stub(soundManager.headphoneIcon, 'update');
    });
    test('Headset is connected', function() {
      sendChromeEvent({'type': 'headphones-status-changed',
                       'state': 'on' });
      assert.isTrue(soundManager.headphoneIcon.update.called);
    });

    test('Headset is disconnected', function() {
      sendChromeEvent({'type': 'headphones-status-changed',
                       'state': 'off' });
      assert.isFalse(soundManager.headphoneIcon.update.called);
    });
  });

  suite('stop test', function() {
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
      setup(function() {
        this.sinon.stub(soundManager.muteIcon, 'update');
      });

      test('key: audio.volume.cemaxvol', function() {
        MockSettingsListener.mTriggerCallback('audio.volume.cemaxvol', 6);
        assert.equal(6, soundManager.CEWarningVol);
      });

      test('key: vibration.enabled', function() {
        MockSettingsListener.mTriggerCallback('vibration.enabled', true);
        assert.equal(true, soundManager.vibrationEnabled);
        assert.isTrue(soundManager.muteIcon.update.called);
        MockSettingsListener.mTriggerCallback('vibration.enabled', false);
        assert.equal(false, soundManager.vibrationEnabled);
      });
    });

    suite('mute icon update', function() {
      setup(function() {
        this.sinon.stub(soundManager.muteIcon, 'update');
      });
      test('notification volume settings change', function() {
        MockSettingsListener.mTriggerCallback('audio.volume.notification', 0);
        assert.isTrue(soundManager.muteIcon.update.called);

        MockSettingsListener.mTriggerCallback('audio.volume.notification', 1);
        assert.isTrue(soundManager.muteIcon.update.called);
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

      test('volume up to vibrate', function() {
        var spy = this.sinon.spy(soundManager, 'notifyByVibrating');
        soundManager.currentChannel = 'notification';
        soundManager.currentVolume.notification = -1;
        soundManager.vibrationEnabled = false;
        window.dispatchEvent(new CustomEvent('volumeup'));
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
        var vibrationClassList = soundManager.element.classList;
        assert.isTrue(vibrationClassList.contains('vibration'));
        assert.isTrue(spy.calledOnce);
      });

      test('volume down to vibrate', function() {
        this.sinon.stub(soundManager.muteIcon, 'update');
        var spy = this.sinon.spy(soundManager, 'notifyByVibrating');
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
        var vibrationClassList = soundManager.element.classList;
        assert.isTrue(vibrationClassList.contains('vibration'));
        assert.isTrue(spy.calledOnce);
        assert.isTrue(soundManager.muteIcon.update.called);
      });

      test('volume down to silent', function() {
        this.sinon.stub(soundManager.muteIcon, 'update');
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
        var vibrationClassList = soundManager.element.classList;
        assert.isFalse(vibrationClassList.contains('vibration'));
        assert.isTrue(soundManager.muteIcon.update.called);
      });

      test('handleVolumeKey: screen-off and channel none', function() {
        MockService.mockQueryWith('screenEnabled', false);
        soundManager.currentChannel = 'none';
        window.dispatchEvent(new CustomEvent('volumeup'));
        checkVolume({
          'alarm': 5,
          'bt_sco': 5,
          'content': 5,
          'notification': 5,
          'telephony': 5
        });
      });

      test('handleVolumeKey: headset connected and channel-normal', function() {
        soundManager.isHeadsetConnected = true;
        soundManager.homescreenVisible = true;
        window.dispatchEvent(new CustomEvent('volumeup'));
        checkVolume({
          'alarm': 5,
          'bt_sco': 5,
          'content': 6,
          'notification': 5,
          'telephony': 5
        });
        window.dispatchEvent(new CustomEvent('volumedown'));
        checkVolume({
          'alarm': 5,
          'bt_sco': 5,
          'content': 5,
          'notification': 5,
          'telephony': 5
        });
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

    suite('homescreen showing', function() {
      test('hide dialog when homescreen is opening', function() {
        var event = new CustomEvent('homescreenopening');
        window.dispatchEvent(event);
        assert.isFalse(MockCustomDialog.mShown);
        assert.isTrue(soundManager.homescreenVisible);
      });
      test('hide dialog when homescreen is opened', function() {
        var event = new CustomEvent('homescreenopened');
        window.dispatchEvent(event);
        assert.isFalse(MockCustomDialog.mShown);
        assert.isTrue(soundManager.homescreenVisible);
      });
    });

    suite('CE accumulator', function() {
      var fakeTimer;

      setup(function() {
        fakeTimer = sinon.useFakeTimers();
        SoundManager.TIME_ONE_MINUTE = 10;
        SoundManager.CE_RESET_TIME = 50;
        soundManager.currentVolume.content = 15;
        sendChromeEvent({'type': 'headphones-status-changed',
                         'state': 'on' });
        sendChromeEvent({'type': 'audio-channel-changed',
                         'channel': 'content'});
      });

      teardown(function() {
        fakeTimer.restore();
      });

      test('CE check', function() {
        MockLock.mCallbacks.onsuccess();
        assert.isTrue(MockCustomDialog.mShown);
        MockCustomDialog.mShowedCancel.callback();
        assert.isTrue(soundManager.CEAccumulatorID > 0);
        assert.isTrue(soundManager.CEAccumulatorTime > 0);
      });

      test('CE times out and reset to original state', function() {
        // trigger timer
        MockLock.mCallbacks.onsuccess();
        fakeTimer.tick(55);
        assert.equal(0, soundManager.CEAccumulatorTime);
        assert.equal(0, soundManager.CETimestamp);
      });
    });
  });
});
