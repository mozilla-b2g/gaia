/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('assert');
var Music = require('./lib/music.js');
var FakeRingtones = require('./lib/fakeringtones.js');
var Statusbar = require('./lib/statusbar.js');

var MUSIC_ORIGIN = 'music.gaiamobile.org';
var FAKERINGTONES_ORIGIN = 'fakeringtones.gaiamobile.org';

marionette('Music player tests', function() {
  var apps = {};
  apps[FAKERINGTONES_ORIGIN] = __dirname + '/fakeringtones';

  var client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    },

    settings: {
      'lockscreen.enabled': false,
      'ftu.manifestURL': null
    },

    apps: apps
  });

  var music, ringtones, statusbar;

  setup(function() {
    music = new Music(client, 'app://' + MUSIC_ORIGIN);
    ringtones = new FakeRingtones(client, 'app://' + FAKERINGTONES_ORIGIN);
    statusbar = new Statusbar(client);

    client.fileManager.removeAllFiles();
    client.fileManager.add([
      { type: 'music', filePath: 'media-samples/Music/b2g.ogg' }
    ]);
  });

  suite('Audio channels tests', function() {
    test('Interrupted by a higher priority channel', function() {
      // Launch Music app and wait for the first tile to come out. Switch to
      // the all songs view then tap on the first song to play, also make sure
      // the playing icon in the status bar shows up.
      music.launch();
      music.waitForFirstTile();
      music.swtichToSongsView();
      music.playFirstSong();
      statusbar.waitForPlayingIndicatorShown(true);

      // Launch the fake ringtones app to interrupt the music app.
      // Make sure the playing icon in the status bar disappears.
      ringtones.launch();
      statusbar.waitForPlayingIndicatorShown(false);

      // Close the fake ringtones app so that the playing icon shows up again
      // because the channel of music app is no more interrupted.
      ringtones.close();
      statusbar.waitForPlayingIndicatorShown(true);

      // Bring the music app to foreground then tap the play button, see if the
      // play button is still functioning to pause the player. Also check the
      // style of the play button is PAUSED, and the playing icon disappears.
      music.switchToMe();
      music.tapPlayButton();
      assert.equal(music.isPlaying, false);
      statusbar.waitForPlayingIndicatorShown(false);

      // Bring the music app to foreground then tap the play button, see if the
      // play button is still functioning to resume the player. Also check the
      // style of the play button is PLAYING, and the playing icon shows up.
      music.switchToMe();
      music.tapPlayButton();
      assert.equal(music.isPlaying, true);
      statusbar.waitForPlayingIndicatorShown(true);
    });
  });
});
