'use strict';

marionette('media playback tests', function() {
  var MediaPlaybackActions, actions;
  var MediaPlaybackChecks, check;
  var FakeMusic = require('./lib/media_playback_fake_music.js');
  var fakeMusicInfo = new FakeMusic();
  var apps = {};
  apps[fakeMusicInfo.origin] = fakeMusicInfo.path;
  var client = marionette.client({
    apps: apps
  });

  setup(function() {
    MediaPlaybackActions = require('./lib/media_playback_actions');
    MediaPlaybackChecks = require('./lib/media_playback_checks');
    actions = (new MediaPlaybackActions()).start(client);
    check = (new MediaPlaybackChecks()).start(client);
  });

  test('could pull the tray', function() {
    actions
      .pullDownTray()
      .pullUpTray();
  });

  test('should show now playing info', function() {
    actions
      .openMusicApp()
      .playAlbumOne()
      .pullDownTray();
    check
      .containerShown(true)
      .nowPlayingText('Some Artist', 'Some Song');
  });

  test('should hide now playing info by stopping', function() {
    actions
      .openMusicApp()
      .playAlbumOne()
      .stopPlay()
      .pullDownTray();
    check
      .containerShown(false);
  });

  test('should hide now playing info by exiting', function() {
    actions
      .openMusicApp()
      .playAlbumOne()
      .pullDownTray();
    check
      .containerShown(true);
    actions
      .killMusicApp();
    check
      .containerShown(false);
  });

  test('should update play/pause icon correctly', function() {
    actions
      .openMusicApp()
      .playAlbumOne()
      .pullDownTray();
    check
      .containerShown(true)
      .isPlaying(true);
    actions
      .pullUpTray()
      .switchToMusicApp()
      .togglePausePlay()
      .pullDownTray();
    check
      .isPlaying(false);
    actions
      .pullUpTray()
      .switchToMusicApp()
      .togglePausePlay()
      .pullDownTray();
    check
      .isPlaying(true);
  });

  test('should hide controls when interrupted', function() {
    actions
      .openMusicApp()
      .playAlbumOne()
      .pullDownTray();
    check
      .containerShown(true)
      .isPlaying(true);
    actions
      .pullUpTray()
      .switchToMusicApp()
      .interruptMusic()
      .pullDownTray();
    check
      .containerShown(false);
    actions
      .pullUpTray()
      .switchToMusicApp()
      .interruptMusic()
      .pullDownTray();
    check
      .containerShown(true);
  });
});
