/* global testRequire */
suite('Audio Manager', function() {
  'use strict';

  var AudioManager;

  suiteSetup(function(done) {
    testRequire(['mocks/mock_navigator_mozsettings'], function(mockSettings) {
      navigator.mozSettings = mockSettings;
      testRequire(['audio_manager'], function(_AudioManager) {
        AudioManager = _AudioManager;
        done();
      });
    });
  });

  function assertVolumeEqual(actual, expected, message) {
    assert.equal(AudioManager.floatToSystemVolume(actual),
                 AudioManager.floatToSystemVolume(expected));
  }

  setup(function() {
    this.audio = AudioManager.createAudioPlayer();
  });

  teardown(function() {
    this.audio = null;
  });

  test('AudioPlayer lazy load', function() {
    assert.equal(this.audio._audio, null);
  });

  test('AudioPlayer does not throw when uninitialized', function() {
    this.audio.pause();
  });

  test('AudioPlayer loads sound with correct settings', function() {
    this.audio.playRingtone('some_ringtone.opus');
    assert.equal(this.audio._audio.mozAudioChannelType, 'alarm');
    assert.equal(this.audio._audio.loop, true);
    assert.ok(/some_ringtone.opus$/.test(this.audio._audio.src),
              'audio.src contains the ringtone');
    assertVolumeEqual(this.audio._audio.volume, AudioManager.getAlarmVolume());
  });

  test('Volume can be set and read from storage', function(done) {
    // use a callback to check asynchronously
    AudioManager.setAlarmVolume(0.5, function() {
      assertVolumeEqual(AudioManager.getAlarmVolume(), 0.5);
      done();
    });
    // also check synchronously
    assertVolumeEqual(AudioManager.getAlarmVolume(), 0.5);
  });

  test('Setting global alarm volume changes AudioPlayer', function() {
    AudioManager.setAlarmVolume(0.2);
    this.audio.playRingtone('some_ringtone.opus');
    assertVolumeEqual(this.audio._audio.volume, 0.2);
  });
});
