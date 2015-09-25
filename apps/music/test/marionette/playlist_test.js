/* global require, marionette, setup, suite, test, __dirname,
          marionetteScriptFinished */
'use strict';

var assert = require('assert');
var Music = require('./lib/music.js');
var FakeRingtones = require('./lib/fakeringtones.js');
var FakeControls = require('./lib/fakecontrols.js');

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
      try {
        music.launch();
        music.waitForFirstTile();
        music.switchToSongsView();

        // this will wait on the first song as well.
        var songs = music.songs;
        assert.equal(songs.length, 1);
        assert.equal(songs[0].title,
                     'dump 2>&1 < ~/® <b>&amp; Injection Vulnerablity</b>');
      } catch(e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
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

      assert.equal(songs[0].index, '1');
      assert.equal(songs[0].title, 'Australian citizen is a US traitor');

      assert.equal(songs[1].index, '4');
      assert.equal(songs[1].title, 'Ich bin ein Berliner');

      assert.equal(songs[2].index, '8');
      assert.equal(songs[2].title, 'The Ecuadorian Embassy');
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
      assert.equal(songs[0].index, '1');
      assert.equal(songs[1].index, '2');
      assert.equal(songs[2].index, '3');
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

      assert.equal(songs[0].index, '1.01');
      assert.equal(songs[0].title, 'Yield to thread');

      assert.equal(songs[2].index, '1.03');
      assert.equal(songs[2].title, 'Windows BSOD');

      assert.equal(songs[3].index, '2.01');
      assert.equal(songs[3].title, 'Crash');
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
      try {
        music.launch();
        music.waitForFirstTile();

        music.switchToAlbumsView();

        music.selectAlbum('We crash computers');

        music.waitForSongs(function(songs) {
          return songs.length >= 6;
        });

        var songs = music.songs;
        assert.equal(songs.length, 6);

        var title1 = songs[1].title;
        var title3 = songs[3].title;

        client.switchToFrame(music.activeViewFrame);
        client.executeScript(function(songs) {
          var w = window.wrappedJSObject;
          w.view.fetch('/api/songs/rating/4/' + songs[3].filePath).
            catch(function(error) {
              throw error;
            });
          w.view.fetch('/api/songs/rating/5/' + songs[1].filePath).
            catch(function(error) {
              throw error;
            });
        }, [songs]);
        music.switchToMe();

        music.switchToPlaylistsView();

        music.selectPlaylist('Highest rated');

        music.waitForSongs(function(songs) {
          return songs.length >= 6;
        });
        songs = music.songs;

        assert.equal(songs[0].index, '1');
        assert.equal(songs[0].title, title1);

        assert.equal(songs[1].index, '2');
        assert.equal(songs[1].title, title3);
      } catch(e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
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

      music.selectPlaylist('Recently added');

      music.waitForSongs(function(songs) {
        return songs.length >= 6;
      });
      var songs = music.songs;

      assert.equal(songs[0].index, '1');
      assert.equal(songs[0].title,
                   'The Ecuadorian Embassy');
    });

    // XXX fixme we can't set the playcount properly it seems....
    test('Most played playlist sort order. moztrap:3676,3677', function() {
      var p = [];

      function incrementPlayCount(filePath, value) {

        var result = client.executeAsyncScript(function(filePath, value) {

          var w = window.wrappedJSObject;

          w.Database.getFileInfo(filePath).
            then(function(song) {
              p = [];
              for (var i = 0; i < value; i++) {
                p.push(w.Database.incrementPlayCount(song));
              }
              Promise.all(p).
                then(function() {
                  marionetteScriptFinished(null);
                }).
                catch(function (r) {
                  marionetteScriptFinished('increment-fail ' + r);
                });
            }).catch(function (r) {
              marionetteScriptFinished('get-file-info-fail ' + r);
            });

        }, [filePath, value]);
        assert.ok(!result);
      }

      try {
        music.launch();
        music.waitForFirstTile();

        music.switchToAlbumsView();

        music.selectAlbum('We crash computers');

        var songs = music.songs;
        assert.equal(songs.length, 6);

        var playCounts = {
          'XOXO': 5,
          'Crash': 4,

          'Break': 3,
          'Windows BSOD': 2,

          'Yield to thread': 1,
          'Abort': 0
        };

        music.switchToMe();
        // we set the playcount.
        songs.forEach(function (e) {
          var c = playCounts[e.title];
          if (c) {
            p.push(incrementPlayCount(e.filePath, c));
          }
        });

        music.switchToPlaylistsView();

        // Most played
        music.selectPlaylist('Most played');
        music.waitForPlaylistDetailView();

        music.waitForSongs(function(songs) {
          return songs.length >= 6;
        });
        songs = music.songs;

        assert.equal(songs[0].index, '1');
        assert.equal(songs[0].title, 'XOXO');

        assert.equal(songs[1].index, '2');
        assert.equal(songs[1].title, 'Crash');


        music.tapHeaderActionButton();
        music.waitForPlaylistsView();

        // Least played
        music.selectPlaylist('Least played');
        music.waitForPlaylistDetailView();

        music.waitForSongs(function(songs) {
          return songs.length >= 6;
        });
        songs = music.songs;

        assert.equal(songs[0].index, '1');
        assert.equal(songs[0].title, 'Abort');

        assert.equal(songs[1].index, '2');
        assert.equal(songs[1].title, 'Yield to thread');
      } catch(e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
    });

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
