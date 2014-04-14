var assert = require('assert'),
    MediaPlayback = require('./lib/media_playback'),
    FakeMusic = require('./lib/fake_music');

marionette('media playback tests', function() {
  var FAKE_MUSIC_ORIGIN = 'app://fakemusic.gaiamobile.org';
  var LOCKSCREEN_ORIGIN = 'app://lockscreen.gaiamobile.org';
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

  var gotoLockScreen = function() {
    client.switchToFrame();
    playback.requestLock();
    client.waitFor(function() {
      var result = client.executeScript(function() {
        return window.wrappedJSObject.System.locked;
      });
      if (!result) {
        playback.requestLock();
      }
      return result;
    });
    client.apps.switchToApp(LOCKSCREEN_ORIGIN);
  };

  var gotoFakeMusic = function() {
    client.switchToFrame();
    playback.requestUnlock();
    client.waitFor(function() {
      var result = !client.executeScript(function() {
        return window.wrappedJSObject.System.locked;
      });
      if (!result) {
        playback.requestUnlock();
      }
      return result;
    });
    client.apps.switchToApp(FAKE_MUSIC_ORIGIN);
  };

  setup(function() {
    playback = new MediaPlayback(client);
    client.apps.launch(LOCKSCREEN_ORIGIN);
    client.switchToFrame();
    music = new FakeMusic(client, FAKE_MUSIC_ORIGIN);
    music.launchInBackground();
  });

  test('can switch between music and lockscreen', function() {
    for (var i = 0; i < 30; i++) {
      gotoFakeMusic();
      gotoLockScreen();
    }
  });

  test('should show now playing info', function() {
    gotoFakeMusic();
    music.albumOneElement.click();
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      container.waitForContainerShown(true);
      container.waitForNowPlayingText('Some Artist', 'Some Song');
    });
  });

  test('should hide now playing info by stopping', function() {
    gotoFakeMusic();
    music.albumOneElement.click();
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      container.waitForContainerShown(true);
    });
    gotoFakeMusic();
    music.stopElement.click();
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      container.waitForContainerShown(false);
    });
  });

  test('should hide now playing info by exiting', function() {
    gotoFakeMusic();
    music.albumOneElement.click();
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      container.waitForContainerShown(true);
    });
    gotoFakeMusic();
    music.close();
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      container.waitForContainerShown(false);
    });
  });

  test('should update play/pause icon correctly', function() {
    gotoFakeMusic();
    music.albumOneElement.click();
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      container.waitForContainerShown(true);
      assert.equal(container.isPlaying, true);
    });
    gotoFakeMusic();
    music.playPauseElement.click();
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      client.waitFor(function() {
        return !container.isPlaying;
      });
    });
    gotoFakeMusic();
    music.playPauseElement.click();
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      client.waitFor(function() {
        return container.isPlaying;
      });
    });
  });

  test('should hide controls when interrupted', function() {
    gotoFakeMusic();
    music.albumOneElement.click();
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      container.waitForContainerShown(true);
      assert.equal(container.isPlaying, true);
    });
    gotoFakeMusic();
    // XXX: It would be better if we had the audio channel code do the
    // interrupt for us instead of just synthesizing the event, but this
    // still tests the system app side of things adequately.
    music.interruptElement.click();
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      container.waitForContainerShown(false);
    });
    gotoFakeMusic();
    music.interruptElement.click();
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      container.waitForContainerShown(true);
    });
  });

  test('should play/pause from now playing widget', function() {
    gotoFakeMusic();
    music.albumOneElement.click();
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      container.waitForContainerShown(true);
      container.waitForNowPlayingText('Some Artist', 'Some Song');
    });
    gotoFakeMusic();
    assert.equal(music.isPlaying, true);
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      assert.equal(container.isPlaying, true);
      container.playPause();
    });
    gotoFakeMusic();
    assert.equal(music.isPlaying, false);
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      assert.equal(container.isPlaying, false);
      container.playPause();
    });
    gotoFakeMusic();
    assert.equal(music.isPlaying, true);
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      assert.equal(container.isPlaying, true);
    });
  });

  // XXX: Disable the test because of http://bugzil.la/942490.
  test.skip('should play/pause from now playing widget after closing and ' +
       'reopening music app', function() {
    music.close();
    music.launchInBackground();

    gotoFakeMusic();
    music.albumOneElement.click();
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      container.waitForContainerShown(true);
      container.playPause();
    });
    gotoFakeMusic();
    assert.equal(music.isPlaying, false);
    gotoLockScreen();
    playback.inLockscreen(function(container) {
      assert.equal(container.isPlaying, false);
    });
  });
});
