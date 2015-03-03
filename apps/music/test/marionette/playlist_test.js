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

      // close the app
      music.close();

      // add more files.
      client.fileManager.add([
        {
          type: 'music',
          filePath: 'apps/music/test-data/playlists/01.ogg'
        }
      ]);

      // start it over. It will add the file above.
      music.launch();
      music.waitForFirstTile();
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

    test('Most played playlist sort order', function() {
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
        var songData = w.SubListView.dataSource[4];
        songData.metadata.played = 2;
        w.musicdb.updateMetadata(songData.name, songData.metadata);

        songData = w.SubListView.dataSource[3];
        songData.metadata.played = 4;
        w.musicdb.updateMetadata(songData.name, songData.metadata);

        songData = w.SubListView.dataSource[2];
        songData.metadata.played = 3;
        w.musicdb.updateMetadata(songData.name, songData.metadata);

        songData = w.SubListView.dataSource[1];
        songData.metadata.played = 5;
        w.musicdb.updateMetadata(songData.name, songData.metadata);

        songData = w.SubListView.dataSource[0];
        songData.metadata.played = 1;
        w.musicdb.updateMetadata(songData.name, songData.metadata);
      });

      music.switchToPlaylistsView();

      music.selectPlaylist('Most played');

      music.waitForSongs(function(songs) {
        return songs.length >= 6;
      });
      songs = music.songs;

      assert.equal(PlaylistHelper.songIndex(songs[0]), '1');
      assert.equal(PlaylistHelper.songTitle(songs[0]), 'XOXO');

      assert.equal(PlaylistHelper.songIndex(songs[1]), '2');
      assert.equal(PlaylistHelper.songTitle(songs[1]), 'Crash');

      // Trick to go back to the playlistview.
      // Alternative is to tap the back button.
      music.switchToAlbumsView();
      music.switchToPlaylistsView();

      // Least played
      music.selectPlaylist('Least played');

      music.waitForSongs(function(songs) {
        return songs.length >= 6;
      });
      songs = music.songs;

      assert.equal(PlaylistHelper.songIndex(songs[0]), '1');
      assert.equal(PlaylistHelper.songTitle(songs[0]), 'Abort');

      assert.equal(PlaylistHelper.songIndex(songs[1]), '2');
      assert.equal(PlaylistHelper.songTitle(songs[1]), 'Yield to thread');
    });

    test('Shuffle all sort order', function() {
      music.launch();
      music.waitForFirstTile();

      music.switchToPlaylistsView();

      var notrandom = 0;
      var lastTitle = '';
      for (var i = 0; i < 10; i++) {

        music.selectPlaylist('Shuffle all');

        var title = music.title.text();
        if (title === lastTitle) {
          notrandom++;
        }
        lastTitle = title;
        // tap back
        music.tapHeaderActionButton();
      }
      assert.ok(notrandom !== 10, 'we didn\'t randomise');
    });

    test('Shuffle playlist order', function() {
      music.launch();
      music.waitForFirstTile();

      music.switchToPlaylistsView();

      music.selectPlaylist('Least played');

      var notrandom = 0;
      var lastTitle = '';
      for (var i = 0; i < 10; i++) {


        music.sublistShuffleButton.tap();

        var title = music.title.text();
        if (title === lastTitle) {
          notrandom++;
        }
        lastTitle = title;
        // tap back
        music.tapHeaderActionButton();
      }
      assert.ok(notrandom !== 10, 'we didn\'t randomise');
    });

  });
});
