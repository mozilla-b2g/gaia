var assert = require('assert'),
    MediaPlaybackTest = require('./lib/media_playback'),
    FakeMusic = require('./lib/fake_music');

var FAKE_MUSIC_ORIGIN = 'fakemusic.gaiamobile.org';

marionette('media playback tests', function() {
  var apps = {};
  apps[FAKE_MUSIC_ORIGIN] = __dirname + '/fakemusic';

  var playback, music, client = marionette.client({
    prefs: {
      // This is true on Gonk, but false on desktop, so override.
      'dom.inter-app-communication-api.enabled': true
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    },
    apps: apps
  });

  setup(function() {
    playback = new MediaPlaybackTest(client);
    music = new FakeMusic(client, 'app://' + FAKE_MUSIC_ORIGIN);
    music.launchInBackground();
  });

  test('show now playing info', function() {
    music.runInApp(function() {
      music.albumOneElement.click();
    });

    playback.openUtilityTray(function() {
      playback.waitForContainerShown(true);
      playback.waitForNowPlayingText('Some Artist', 'Some Song');
    });

    music.runInApp(function() {
      music.nextTrackElement.click();
    });

    playback.openUtilityTray(function() {
      playback.waitForNowPlayingText('Another Artist', 'Another Song');
    });
  });

  test('hide now playing info by stopping', function() {
    music.runInApp(function() {
      music.albumOneElement.click();
    });

    playback.openUtilityTray(function() {
      playback.waitForContainerShown(true);
    });

    music.runInApp(function() {
      music.stopElement.click();
    });

    playback.openUtilityTray(function() {
      playback.waitForContainerShown(false);
    });
  });

  test('hide now playing info by exiting', function() {
    music.runInApp(function() {
      music.albumOneElement.click();
    });

    playback.openUtilityTray(function() {
      playback.waitForContainerShown(true);
    });

    music.close();

    playback.openUtilityTray(function() {
      playback.waitForContainerShown(false);
    });
  });
});
