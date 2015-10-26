/* global require, marionette, setup, suite, test */
'use strict';

var assert = require('assert');
var Music = require('./lib/music.js');

marionette('Music player shuffle', function() {
  var client = marionette.client({
    profile: {
      prefs: {
        'device.storage.enabled': true,
        'device.storage.testing': true,
        'device.storage.prompt.testing': true
      }
    }
  });

  var music;

  setup(function() {
    music = new Music(client);
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

    test('The "Shuffle all" playlist sets the "Shuffle" button in Player view',
      function() {
        try {
          music.launch();
          music.waitForFirstTile();

          music.switchToSongsView();
          music.playFirstSong();

          var shuffle = music.getShuffleSetting();
          assert.equal(shuffle, 'off');

          music.tapHeaderActionButton();

          music.switchToPlaylistsView();
          music.selectPlaylist('Shuffle all');

          music.waitForPlayerView();

          shuffle = music.getShuffleSetting();
          assert.equal(shuffle, 'on');
        } catch (e) {
          assert.ok(false, 'Exception ' + e.stack);
        }
      }
    );

    test('Shuffle all sort order. moztrap:2357', function() {
      try {
        music.launch();
        music.waitForFirstTile();

        music.switchToPlaylistsView();

        var notrandom = 0;
        var lastTitle = '';
        var loopCount = 10;
        for (var i = 0; i < loopCount; i++) {

          // selecting the playlist will put us into the player.
          music.selectPlaylist('Shuffle all');

          // wait for the player.
          // XXX figure out why this times out.
          //     still seems to work with it. but ain't liking it.
          // music.waitForPlayerView();

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
      } catch (e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
    });

    // XXX fix when bug 1204664 is fixed.
    test.skip('Shuffle playlist order. moztrap:2357', function() {
      try {
        music.launch();
        music.waitForFirstTile();

        music.switchToPlaylistsView();

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
      } catch (e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
    });

  });
});
