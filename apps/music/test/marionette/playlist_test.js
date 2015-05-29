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
    profile: {
      prefs: {
        'device.storage.enabled': true,
        'device.storage.testing': true,
        'device.storage.prompt.testing': true
      },

      apps: apps
    }
  });

  var music;

  setup(function() {
    music = new Music(client);
  });


  suite('Special names', function() {
    setup(function() {
      client.fileManager.removeAllFiles();
      client.fileManager.add([
        // Title: "dump 2>&1 < ~/® <b>&amp; Injection Vulnerablity</b>"
        {
          type: 'music',
          filePath: 'apps/music/test-data/playlists/d.ogg'
        }
      ]);
    });

    test('Check name with >, <, ~, &, markup and some Unicode. ' +
         'moztrap:2346,2347,8499,8491', function() {
      music.launch();
      music.waitForFirstTile();
      music.switchToSongsView();

      // this will wait on the first song as well.
      var song = music.firstSong;
      assert.equal(PlaylistHelper.mainTitle(song),
                   'dump 2>&1 < ~/® <b>&amp; Injection Vulnerablity</b>');
    });
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
      music.waitForListView();

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

    test('Highest rated playlist sort order. moztrap:3674', function() {
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
      music.waitForListView();

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

    test('Recently added playlist sort order. moztrap:3675', function() {
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
      music.waitForListView();

      music.selectPlaylist('Recently added');

      music.waitForSongs(function(songs) {
        return songs.length >= 6;
      });
      var songs = music.songs;

      assert.equal(PlaylistHelper.songIndex(songs[0]), '1');
      assert.equal(PlaylistHelper.songTitle(songs[0]),
                   'The Ecuadorian Embassy');
    });

    test('Most played playlist sort order. moztrap:3676,3677', function() {
      music.launch();
      music.waitForFirstTile();

      music.switchToAlbumsView();

      music.selectAlbum('We crash computers');

      music.waitForSongs(function(songs) {
        return songs.length >= 6;
      });

      var songs = music.songs;
      assert.equal(songs.length, 6);

      // we set the playcount.
      client.executeScript(function() {
        var w = window.wrappedJSObject;

        // 'XOXO'
        var songData = w.SubListView.dataSource[1];
        songData.metadata.played = 5;
        w.musicdb.updateMetadata(songData.name, songData.metadata);

        // 'Crash'
        songData = w.SubListView.dataSource[3];
        songData.metadata.played = 4;
        w.musicdb.updateMetadata(songData.name, songData.metadata);

        songData = w.SubListView.dataSource[2];
        songData.metadata.played = 3;
        w.musicdb.updateMetadata(songData.name, songData.metadata);

        songData = w.SubListView.dataSource[4];
        songData.metadata.played = 2;
        w.musicdb.updateMetadata(songData.name, songData.metadata);

        // 'Yield to Thread'
        songData = w.SubListView.dataSource[0];
        songData.metadata.played = 1;
        w.musicdb.updateMetadata(songData.name, songData.metadata);

        // 'Abort'
        // Play count is 0 for that song.
      });

      music.switchToPlaylistsView();
      music.waitForListView();

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
      music.waitForListView();

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

    test('Shuffle all sort order. moztrap:2357', function() {
      music.launch();
      music.waitForFirstTile();

      music.switchToPlaylistsView();
      music.waitForListView();

      var notrandom = 0;
      var lastTitle = '';
      var loopCount = 10;
      for (var i = 0; i < loopCount; i++) {

        // selecting the playlist will put us into the player.
        music.selectPlaylist('Shuffle all');

        // wait for the player.
        music.waitForPlayerView();

        var title = music.title.text();
        if (title === lastTitle) {
          notrandom++;
        }
        lastTitle = title;
        // tap back
        music.tapHeaderActionButton();
      }
      // the first loop will never be "notrandom".
      assert.notEqual(notrandom, loopCount - 1, 'we didn\'t randomise');
    });

    test('Shuffle playlist order. moztrap:2357', function() {
      music.launch();
      music.waitForFirstTile();

      music.switchToPlaylistsView();
      music.waitForListView();

      music.selectPlaylist('Least played');

      var notrandom = 0;
      var lastTitle = '';
      var loopCount = 10;
      for (var i = 0; i < loopCount; i++) {

        // tapping shuffle will put us into the player.
        music.sublistShuffleButton.tap();

        // wait for the player.
        music.waitForPlayerView();

        var title = music.title.text();
        if (title === lastTitle) {
          notrandom++;
        }
        lastTitle = title;
        // tap back
        music.tapHeaderActionButton();
      }
      assert.notEqual(notrandom, loopCount - 1, 'we didn\'t randomise');
    });

  });
});
