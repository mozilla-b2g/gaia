/*
  Sound Effect unit tests.
*/
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mocks_helper.js');
requireApp('/camera/test/unit/mock_audio.js');
requireApp('/camera/js/soundeffect.js');

suite('Sound Effect Unit Tests', function() {
  var SHUTTER_KEY = 'camera.shutter.enabled';
  var RECORDING_KEY = 'camera.recordingsound.enabled';
  var realMozSettings;
  var mocksHelper;

  suiteSetup(function() {
    mocksHelper = new MocksHelper([
      'Audio'
    ]).init();
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    mocksHelper.suiteTeardown();
  });

  suite('#init', function() {
    test('#init sound effect', function() {
      SoundEffect.init();
      assert.equal(MockAudio.instances.length, 0);
    });
  });

  suite('#play', function() {

    setup(function() {
      for (var i = 0; i < MockAudio.instances.length; i++) {
        MockAudio.instances[i].playing = false;
      }
    });

    function checkSoundPlaying(url) {
      var found = false;
      for (var i = 0; i < MockAudio.instances.length; i++) {
        if (MockAudio.instances[i].url === url) {
          assert.isTrue(MockAudio.instances[i].playing);
          found = true;
        } else {
          assert.isFalse(MockAudio.instances[i].playing);
        }
      }
      assert.isTrue(found);
    }

    function checkSoundNotPlaying(url) {
      var found = false;
      for (var i = 0; i < MockAudio.instances.length; i++) {
        if (MockAudio.instances[i].url === url) {
          assert.isFalse(MockAudio.instances[i].playing);
        }
      }
    }

    test('#play camera shutter with shutter enabled', function() {
      MockNavigatorSettings.mSettings[SHUTTER_KEY] = true;
      MockNavigatorSettings.mTriggerObservers(SHUTTER_KEY,
                                              {settingName: SHUTTER_KEY,
                                               settingValue: true});
      MockNavigatorSettings.mSettings[RECORDING_KEY] = false;
      MockNavigatorSettings.mTriggerObservers(RECORDING_KEY,
                                              {settingName: RECORDING_KEY,
                                               settingValue: false});

      SoundEffect.playCameraShutterSound();
      checkSoundPlaying('./resources/sounds/shutter.ogg');
    });

    test('#play camera shutter with recording sound enabled', function() {
      MockNavigatorSettings.mSettings[SHUTTER_KEY] = false;
      MockNavigatorSettings.mTriggerObservers(SHUTTER_KEY,
                                              {settingName: SHUTTER_KEY,
                                               settingValue: false});
      MockNavigatorSettings.mSettings[RECORDING_KEY] = true;
      MockNavigatorSettings.mTriggerObservers(RECORDING_KEY,
                                              {settingName: RECORDING_KEY,
                                               settingValue: true});

      SoundEffect.playCameraShutterSound();
      checkSoundNotPlaying('./resources/sounds/shutter.ogg');
    });

    test('#play camcorder start with shutter enabled', function() {
      MockNavigatorSettings.mSettings[SHUTTER_KEY] = true;
      MockNavigatorSettings.mTriggerObservers(SHUTTER_KEY,
                                              {settingName: SHUTTER_KEY,
                                               settingValue: true});
      MockNavigatorSettings.mSettings[RECORDING_KEY] = false;
      MockNavigatorSettings.mTriggerObservers(RECORDING_KEY,
                                              {settingName: RECORDING_KEY,
                                               settingValue: false});

      SoundEffect.playRecordingStartSound();
      checkSoundNotPlaying('./resources/sounds/camcorder_start.opus');
    });

    test('#play camcorder start with recording sound enabled', function() {
      MockNavigatorSettings.mSettings[SHUTTER_KEY] = false;
      MockNavigatorSettings.mTriggerObservers(SHUTTER_KEY,
                                              {settingName: SHUTTER_KEY,
                                               settingValue: false});
      MockNavigatorSettings.mSettings[RECORDING_KEY] = true;
      MockNavigatorSettings.mTriggerObservers(RECORDING_KEY,
                                              {settingName: RECORDING_KEY,
                                               settingValue: true});

      SoundEffect.playRecordingStartSound();
      checkSoundPlaying('./resources/sounds/camcorder_start.opus');
    });

    test('#play camcorder end with only shutter enabled', function() {
      MockNavigatorSettings.mSettings[SHUTTER_KEY] = true;
      MockNavigatorSettings.mTriggerObservers(SHUTTER_KEY,
                                              {settingName: SHUTTER_KEY,
                                               settingValue: true});
      MockNavigatorSettings.mSettings[RECORDING_KEY] = false;
      MockNavigatorSettings.mTriggerObservers(RECORDING_KEY,
                                              {settingName: RECORDING_KEY,
                                               settingValue: false});

      SoundEffect.playRecordingEndSound();
      checkSoundNotPlaying('./resources/sounds/camcorder_end.opus');
    });

    test('#play camcorder end with recording sound enabled', function() {
      MockNavigatorSettings.mSettings[SHUTTER_KEY] = false;
      MockNavigatorSettings.mTriggerObservers(SHUTTER_KEY,
                                              {settingName: SHUTTER_KEY,
                                               settingValue: false});
      MockNavigatorSettings.mSettings[RECORDING_KEY] = true;
      MockNavigatorSettings.mTriggerObservers(RECORDING_KEY,
                                              {settingName: RECORDING_KEY,
                                               settingValue: true});

      SoundEffect.playRecordingEndSound();
      checkSoundPlaying('./resources/sounds/camcorder_end.opus');
    });

    test('#play all sounds with shutter disabled', function() {
      MockNavigatorSettings.mSettings[SHUTTER_KEY] = false;
      MockNavigatorSettings.mTriggerObservers(SHUTTER_KEY,
                                              {settingName: SHUTTER_KEY,
                                               settingValue: false});
      MockNavigatorSettings.mSettings[RECORDING_KEY] = false;
      MockNavigatorSettings.mTriggerObservers(RECORDING_KEY,
                                              {settingName: RECORDING_KEY,
                                               settingValue: false});

      SoundEffect.playCameraShutterSound();
      SoundEffect.playRecordingStartSound();
      SoundEffect.playRecordingEndSound();

      for (var i = 0; i < MockAudio.instances.length; i++) {
        assert.isFalse(MockAudio.instances[i].playing);
      }
    });

    test('#play all sounds with shutter re-enabled', function() {
      MockNavigatorSettings.mSettings[SHUTTER_KEY] = true;
      MockNavigatorSettings.mTriggerObservers(SHUTTER_KEY,
                                              {settingName: SHUTTER_KEY,
                                               settingValue: true});
      MockNavigatorSettings.mSettings[RECORDING_KEY] = true;
      MockNavigatorSettings.mTriggerObservers(RECORDING_KEY,
                                              {settingName: RECORDING_KEY,
                                               settingValue: true});

      SoundEffect.playCameraShutterSound();
      SoundEffect.playRecordingStartSound();
      SoundEffect.playRecordingEndSound();

      for (var i = 0; i < MockAudio.instances.length; i++) {
        assert.isTrue(MockAudio.instances[i].playing);
      }
    });
  });
});
