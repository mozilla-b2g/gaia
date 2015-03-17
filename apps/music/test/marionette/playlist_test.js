/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('assert');
var Music = require('./lib/music.js');
var FakeRingtones = require('./lib/fakeringtones.js');
var FakeControls = require('./lib/fakecontrols.js');
var PlaylistHelper = require('./lib/playlisthelper.js');
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

      assert.equal(PlaylistHelper.songIndex(songs[0]), '1');
      assert.equal(PlaylistHelper.songTitle(songs[0]),
                   'Australian citizen is a US traitor');

      assert.equal(PlaylistHelper.songIndex(songs[1]), '4');
      assert.equal(PlaylistHelper.songTitle(songs[1]),
                   'Ich bin ein Berliner');

      assert.equal(PlaylistHelper.songIndex(songs[2]), '8');
      assert.equal(PlaylistHelper.songTitle(songs[2]),
                   'The Ecuadorian Embassy');
    });

    test('Check the playlist indexes', function() {
      // this test will check that the index value of each song is the index
      // and not the track number.
      // See bug 1129708
      music.launch();
      music.waitForFirstTile();
      music.switchToPlaylistsView();

      music.selectPlaylist('Recently added');

      music.waitForSongs(function(songs) {
        return songs.length >= 3;
      });

      var songs = music.songs;

      assert.equal(songs.length, 3);
      assert.equal(PlaylistHelper.songIndex(songs[0]), '1');
      assert.equal(PlaylistHelper.songIndex(songs[1]), '2');
      assert.equal(PlaylistHelper.songIndex(songs[2]), '3');
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

      assert.equal(PlaylistHelper.songIndex(songs[0]), '1.01');
      assert.equal(PlaylistHelper.songTitle(songs[0]), 'Yield to thread');

      assert.equal(PlaylistHelper.songIndex(songs[2]), '1.03');
      assert.equal(PlaylistHelper.songTitle(songs[2]), 'Windows BSOD');

      assert.equal(PlaylistHelper.songIndex(songs[3]), '2.01');
      assert.equal(PlaylistHelper.songTitle(songs[3]), 'Crash');
    });
  });

  suite('Default playlists', function() {
    setup(function() {
      client.fileManager.removeAllFiles();
      client.fileManager.add([
        {
          // Track 1.01 "Yield to Thread"
          type: 'music',
          filePath: 'apps/music/test-data/playlists/y.ogg'
        },
        {
          // Track 1.02 "XOXO"
          type: 'music',
          filePath: 'apps/music/test-data/playlists/x.ogg'
        },
        {
          // Track 1.03 "Windows BSOD"
          type: 'music',
          filePath: 'apps/music/test-data/playlists/w.ogg'
        },
        {
          // Track 2.01 "Crash"
          type: 'music',
          filePath: 'apps/music/test-data/playlists/c.ogg'
        },
        {
          // Track 2.02 "Break"
          type: 'music',
          filePath: 'apps/music/test-data/playlists/b.ogg'
        },
        {
          // Track 2.03 "Abort"
          type: 'music',
          filePath: 'apps/music/test-data/playlists/a.ogg'
        },
      ]);
    });

    test('Highest rated playlist sort order', function() {
      music.launch();
      music.waitForFirstTile();

      music.switchToAlbumsView();

      music.selectAlbum('We crash computers');

      music.waitForSongs(function(songs) {
        return songs.length >= 6;
      });

      var songs = music.songs;
      assert.equal(songs.length, 6);

      client.executeScript(function() {
        var w = window.wrappedJSObject;
        var songData = w.SubListView.dataSource[3];
        songData.metadata.rated = 4;
        w.musicdb.updateMetadata(songData.name, songData.metadata);

        songData = w.SubListView.dataSource[1];
        songData.metadata.rated = 5;
        w.musicdb.updateMetadata(songData.name, songData.metadata);
      });

      music.switchToPlaylistsView();

      music.selectPlaylist('Highest rated');

      music.waitForSongs(function(songs) {
        return songs.length >= 6;
      });
      songs = music.songs;

      assert.equal(PlaylistHelper.songIndex(songs[0]), '1');
      assert.equal(PlaylistHelper.songTitle(songs[0]), 'XOXO');

      assert.equal(PlaylistHelper.songIndex(songs[1]), '2');
      assert.equal(PlaylistHelper.songTitle(songs[1]), 'Crash');
    });

    test('Recently added playlist sort order', function() {
      // start the app so the music files are added to the database.
      music.launch();
      music.waitForFirstTile();
      music.waitFinishedScanning();

      // close the app
      music.close();

      // add more files.
      client.fileManager.add([
        {
          // This song has the title 'The Ecuadorian Embassy'
          // And the index '1'
          type: 'music',
          filePath: 'apps/music/test-data/playlists/01.ogg'
        }
      ]);

      // start it over. It will add the file above.
      music.launch();
      music.waitForFirstTile();
      music.waitFinishedScanning();
      music.switchToPlaylistsView();

      music.selectPlaylist('Recently added');

      music.waitForSongs(function(songs) {
        return songs.length >= 6;
      });
      var songs = music.songs;

      assert.equal(PlaylistHelper.songIndex(songs[0]), '1');
      assert.equal(PlaylistHelper.songTitle(songs[0]),
                   'The Ecuadorian Embassy');
    });
  });
});
