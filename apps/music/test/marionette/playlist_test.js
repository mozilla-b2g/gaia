/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('assert');
var Music = require('./lib/music.js');
var FakeRingtones = require('./lib/fakeringtones.js');
var FakeControls = require('./lib/fakecontrols.js');
/*var Statusbar = require('./lib/statusbar.js');*/

marionette('Music player playlist', function() {
  var apps = {};
  apps[FakeRingtones.DEFAULT_ORIGIN] = __dirname + '/fakeringtones';
  apps[FakeControls.DEFAULT_ORIGIN] = __dirname + '/fakecontrols';

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

  var music;

  setup(function() {
    music = new Music(client);

  });

  suite('Single disc tests', function () {
    setup(function() {
      client.fileManager.removeAllFiles();
      client.fileManager.add([
        {
          type: 'music',
          filePath: 'apps/music/test-data/playlists/01.ogg'
        },
        {
          type: 'music',
          filePath: 'apps/music/test-data/playlists/02.ogg'
        },
        {
          type: 'music',
          filePath: 'apps/music/test-data/playlists/03.ogg'
        }
      ]);
    });

    test('Check the sort order', function() {

      music.launch();
      music.waitForFirstTile();
      music.switchToAlbumsView();

      music.selectAlbum('Where is Julian Assange?');

      music.waitForSongs(function(songs) {
        return songs.length >= 3;
      });

      var songs = music.songs;

      assert.equal(songs.length, 3);

      assert.equal(songs[0].findElement('.list-song-index').text(), '1');
      assert.equal(songs[0].findElement('.list-song-title').text(),
                   'Australian citizen is a US traitor');

      assert.equal(songs[1].findElement('.list-song-index').text(), '4');
      assert.equal(songs[1].findElement('.list-song-title').text(),
                   'Ich bin ein Berliner');

      assert.equal(songs[2].findElement('.list-song-index').text(), '8');
      assert.equal(songs[2].findElement('.list-song-title').text(),
                   'The Ecuadorian Embassy');
    });

  });

  suite('Multi disc tests', function() {

    setup(function() {
      client.fileManager.removeAllFiles();
      client.fileManager.add([
        {
          type: 'music',
          filePath: 'apps/music/test-data/playlists/a.ogg'
        },
        {
          type: 'music',
          filePath: 'apps/music/test-data/playlists/b.ogg'
        },
        {
          type: 'music',
          filePath: 'apps/music/test-data/playlists/c.ogg'
        },
        {
          type: 'music',
          filePath: 'apps/music/test-data/playlists/w.ogg'
        },
        {
          type: 'music',
          filePath: 'apps/music/test-data/playlists/x.ogg'
        },
        {
          type: 'music',
          filePath: 'apps/music/test-data/playlists/y.ogg'
        },
      ]);
    });

    test('Check the sort order', function() {

      music.launch();
      music.waitForFirstTile();
      music.switchToAlbumsView();

      music.selectAlbum('We crash computers');

      music.waitForSongs(function(songs) {
        return songs.length >= 6;
      });

      var songs = music.songs;

      assert.equal(songs.length, 6);

      assert.equal(songs[0].findElement('.list-song-index').text(), '1.01');
      assert.equal(songs[0].findElement('.list-song-title').text(),
                   'Yield to thread');

      assert.equal(songs[2].findElement('.list-song-index').text(), '1.03');
      assert.equal(songs[2].findElement('.list-song-title').text(),
                   'Windows BSOD');

      assert.equal(songs[3].findElement('.list-song-index').text(), '2.01');
      assert.equal(songs[3].findElement('.list-song-title').text(), 'Crash');
    });
  });
});
