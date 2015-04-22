'use strict';

marionette('LockScreen media playback tests', function() {
  var LockScreenMediaPlaybackActions, actions;
  var LockScreenMediaPlaybackChecks, checks;
  var FakeMusic = require('../lib/media_playback_fake_music.js');
  var fakeMusicInfo = new FakeMusic();
  var apps = {};
  apps[fakeMusicInfo.origin] = fakeMusicInfo.path;
  var client = marionette.client({
    prefs: {
      // This is true on Gonk, but false on desktop, so override.
      'dom.inter-app-communication-api.enabled': true
    },
    apps: apps
  });

  setup(function() {
    LockScreenMediaPlaybackActions =
      require('../lib/lockscreen_media_playback_actions.js');
    LockScreenMediaPlaybackChecks =
      require('../lib/lockscreen_media_playback_checks.js');
    actions = (new LockScreenMediaPlaybackActions()).start(client);
    checks = (new LockScreenMediaPlaybackChecks()).start(client);
  });

  test('should show now playing info', function() {
    actions
      .unlockScreen()
      .openMusicApp()
      .playAlbumOne()
      .lockScreen();
    checks
      .containerShown(true)
      .nowPlayingText('Some Song', 'Some Artist');
  });

  test('should hide now playing info by stopping', function() {
    actions
      .unlockScreen()
      .openMusicApp()
      .playAlbumOne()
      .stopPlay()
      .lockScreen();
    checks
      .containerShown(false);
  });

  test('should hide now playing info by exiting', function() {
    actions
      .unlockScreen()
      .openMusicApp()
      .playAlbumOne()
      .lockScreen();
    checks
      .containerShown(true);
    actions
      .killMusicApp();
    checks
      .containerShown(false);
  });

  test('should update play/pause icon correctly', function() {
    actions
      .unlockScreen()
      .openMusicApp()
      .playAlbumOne()
      .lockScreen();
    checks
      .containerShown(true)
      .isPlaying(true);
    actions
      .unlockScreen()
      .switchToMusicApp()
      .togglePausePlay()
      .lockScreen();
    checks
      .isPlaying(false);
    actions
      .unlockScreen()
      .switchToMusicApp()
      .togglePausePlay()
      .lockScreen();
    checks
      .isPlaying(true);
  });

  test('should hide controls when interrupted', function() {
    actions
      .unlockScreen()
      .openMusicApp()
      .playAlbumOne()
      .lockScreen();
    checks
      .containerShown(true)
      .isPlaying(true);
    actions
      .unlockScreen()
      .switchToMusicApp()
      .interruptMusic()
      .lockScreen();
    checks
      .containerShown(false);
    actions
      .unlockScreen()
      .switchToMusicApp()
      .interruptMusic()
      .lockScreen();
    checks
      .containerShown(true);
  });
});
