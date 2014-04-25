suite('AudioPlayer', function() {
  'use strict';

  var AudioPlayer;
  var navigator_mozSettings = navigator.mozSettings;

  suiteSetup(function(done) {
    require(['mocks/mock_navigator_mozsettings'], function(mockSettings) {
      navigator.mozSettings = mockSettings;
      require(['audio_player'], function(audio_player) {
        AudioPlayer = audio_player;
        done();
      });
    });
  });

  suiteTeardown(function() {
    navigator.mozSettings = navigator_mozSettings;
  });

  setup(function() {
    this.player = new AudioPlayer();
  });

  test('AudioPlayer loads sound with correct settings', function() {
    this.player.playRingtone('some_ringtone.opus');
    assert.equal(this.player.audio.loop, true);
    assert.ok(this.player.audio.src.indexOf(
      'shared/resources/media/alarms/some_ringtone.opus') !== -1);
    assert.equal(this.player.audio.volume * AudioPlayer.SYSTEM_VOLUME_MAX | 0,
                 AudioPlayer.getSystemAlarmVolume());
  });

  test('Volume can be set and read from storage', function(done) {
    // use a callback to check asynchronously
    AudioPlayer.setSystemAlarmVolume(10, function() {
      assert.equal(AudioPlayer.getSystemAlarmVolume(), 10);
      done();
    });
    // Ensure it was updated synchronously.
    assert.equal(AudioPlayer.getSystemAlarmVolume(), 10);
  });

  test('Setting global alarm volume changes AudioPlayer', function() {
    AudioPlayer.setSystemAlarmVolume(0);
    this.player.playRingtone('some_ringtone.opus');
    assert.equal(this.player.audio.volume, 0);
  });
});
