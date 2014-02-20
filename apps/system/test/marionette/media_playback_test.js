var assert = require('assert'),
    MediaPlayback = require('./lib/media_playback'),
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
      'ftu.manifestURL': null
    },
    apps: apps
  });

  setup(function() {
    playback = new MediaPlayback(client);
    music = new FakeMusic(client, 'app://' + FAKE_MUSIC_ORIGIN);
    music.launchInBackground();
    playback.unlockScreen();
  });

  // We want to run the same tests on both the utility tray and the lockscreen,
  // so we'll write the tests once and then generate a pair of suites.
  var suiteInfos = [
    { name: 'in utility tray', opener: 'inUtilityTray' },
    { name: 'in lockscreen', opener: 'inLockscreen' }
  ];

  suiteInfos.forEach(function(suiteInfo) {
    suite(suiteInfo.name, function() {

      test('should show now playing info', function() {
        music.runInApp(function() {
          music.albumOneElement.click();
        });

        playback[suiteInfo.opener](function(container) {
          container.waitForContainerShown(true);
          container.waitForNowPlayingText('Some Artist', 'Some Song');
        });
      });

      test('should hide now playing info by stopping', function() {
        music.runInApp(function() {
          music.albumOneElement.click();
        });

        playback[suiteInfo.opener](function(container) {
          container.waitForContainerShown(true);
        });

        music.runInApp(function() {
          music.stopElement.click();
        });

        playback[suiteInfo.opener](function(container) {
          container.waitForContainerShown(false);
        });
      });

      test('should hide now playing info by exiting', function() {
        music.runInApp(function() {
          music.albumOneElement.click();
        });

        playback[suiteInfo.opener](function(container) {
          container.waitForContainerShown(true);
        });

        music.close();

        playback[suiteInfo.opener](function(container) {
          container.waitForContainerShown(false);
        });
      });

      test('should update play/pause icon correctly', function() {
        music.runInApp(function() {
          music.albumOneElement.click();
        });

        playback[suiteInfo.opener](function(container) {
          container.waitForContainerShown(true);
          assert.equal(container.isPlaying, true);
        });

        music.runInApp(function() {
          music.playPauseElement.click();
        });

        playback[suiteInfo.opener](function(container) {
          client.waitFor(function() {
            return !container.isPlaying;
          });
        });

        music.runInApp(function() {
          music.playPauseElement.click();
        });

        playback[suiteInfo.opener](function(container) {
          client.waitFor(function() {
            return container.isPlaying;
          });
        });
      });

      test('should hide controls when interrupted', function() {
        music.runInApp(function() {
          music.albumOneElement.click();
        });

        playback[suiteInfo.opener](function(container) {
          container.waitForContainerShown(true);
          assert.equal(container.isPlaying, true);
        });

        music.runInApp(function() {
          // XXX: It would be better if we had the audio channel code do the
          // interrupt for us instead of just synthesizing the event, but this
          // still tests the system app side of things adequately.
          music.interruptElement.click();
        });

        playback[suiteInfo.opener](function(container) {
          container.waitForContainerShown(false);
        });

        music.runInApp(function() {
          music.interruptElement.click();
        });

        playback[suiteInfo.opener](function(container) {
          container.waitForContainerShown(true);
        });
      });

      test('should play/pause from now playing widget', function() {
        music.runInApp(function() {
          music.albumOneElement.click();
        });

        playback[suiteInfo.opener](function(container) {
          container.waitForContainerShown(true);
          container.waitForNowPlayingText('Some Artist', 'Some Song');
          music.runInApp(function() {
            assert.equal(music.isPlaying, true);
          });
          assert.equal(container.isPlaying, true);

          container.playPause();
          music.runInApp(function() {
            assert.equal(music.isPlaying, false);
          });
          assert.equal(container.isPlaying, false);

          container.playPause();
          music.runInApp(function() {
            assert.equal(music.isPlaying, true);
          });
          assert.equal(container.isPlaying, true);
        });
      });

      // XXX: Disable the test because of http://bugzil.la/942490.
      test.skip('should play/pause from now playing widget after closing and ' +
           'reopening music app', function() {
        music.close();
        music.launchInBackground();

        music.runInApp(function() {
          music.albumOneElement.click();
        });

        playback[suiteInfo.opener](function(container) {
          container.waitForContainerShown(true);
          container.playPause();
          music.runInApp(function() {
            assert.equal(music.isPlaying, false);
          });
          assert.equal(container.isPlaying, false);
        });
      });

      test('should go to next/prev track from notification area', function() {
        music.runInApp(function() {
          music.albumOneElement.click();
        });

        playback[suiteInfo.opener](function(container) {
          container.waitForContainerShown(true);
          container.waitForNowPlayingText('Some Artist', 'Some Song');

          container.nextTrack();

          container.waitForNowPlayingText('Another Artist', 'Another Song');

          container.previousTrack();

          container.waitForNowPlayingText('Some Artist', 'Some Song');

          container.nextTrack();
          container.nextTrack();

          container.waitForContainerShown(false);
        });
      });

    });
  });
});
