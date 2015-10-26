/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('assert');
var Music = require('./lib/music.js');
var FakeRingtones = require('./lib/fakeringtones.js');
var FakeControls = require('./lib/fakecontrols.js');
var Statusbar = require('./lib/statusbar.js');

marionette('Music player tests', function() {
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

    client.fileManager.removeAllFiles();
    client.fileManager.add([
      // Album = 'A Minute With Brendan'
      // Artist = 'Minute With'
      // Title = 'Boot To Gecko (B2G)'
      { type: 'music', filePath: 'test_media/samples/Music/b2g.ogg' }
    ]);
  });

  suite('Audio channels tests', function() {
    var ringtones, statusbar;
    setup(function() {
      ringtones = new FakeRingtones(client);
      statusbar = new Statusbar(client);
    });

    // This test is skipped for not failing tpbl, please see bug 997360.
    test.skip('Interrupted by a higher priority channel', function() {
      // Launch Music app and wait for the first tile to come out. Switch to
      // the all songs view then tap on the first song to play, also make sure
      // the playing icon in the status bar shows up.
      music.launch();
      music.waitForFirstTile();
      music.switchToSongsView();
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

  suite('Playback tests', function() {
    var controls;
    setup(function() {
      controls = new FakeControls(client);
    });

    // Disabled See bug 1032037.
    test.skip('Check that progress bar updates when re-shown', function() {
      music.launch();
      music.waitForFirstTile();
      music.switchToSongsView();
      music.playFirstSong();

      var dt = 5.0;

      // We want to wait a few seconds while the music app is in the background.
      controls.launch();
      client.helper.wait(dt * 1000); // Convert to ms
      controls.playPause();
      controls.close();

      // Try to get the songProgress when the music is still in the background
      music.switchToMe({background: true});
      var t0 = music.songProgress;

      // Make sure the progress bar got updated when the music app is brought to
      // the foreground.
      music.launch();
      var t1 = music.songProgress;
      assert(t1 - t0 > 0, 'Progress bar not updated!');
    });
  });

  suite('Player icon tests', function() {
    test('Check the player icon hides before play some song', function() {
      try {
        music.launch();
        music.waitForFirstTile();
        music.checkPlayerIconShown(false);
      } catch(e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
    });

    test('Check the player icon displays after play some song', function() {
      try {
        music.launch();
        music.waitForFirstTile();
        music.switchToSongsView();
        music.playFirstSong();
        music.waitForPlayerView();

        var frame = music.playerViewFrame;
        assert.ok(frame);
        client.switchToFrame(frame);

        // Wait for cover overlay to hide to prevent intermittent fail
        client.waitFor(function() {
          var cover = client.findElement(Music.Selector.playerCover);
          assert.ok(cover);
          client.switchToShadowRoot(cover);
          var container = client.findElement('#container');
          assert.ok(container);
          var isHidden = (container.getAttribute('class').split(' ').
                          indexOf('show-overlay') === -1);
          client.switchToShadowRoot();
          return isHidden;
        }.bind(this));

        music.switchToMe();

        music.tapHeaderActionButton();
        music.waitForSongsView();
        music.checkPlayerIconShown(true);
      } catch(e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
    });
  });

  suite('Status bar', function() {

    var statusbar;
    setup(function() {
      statusbar = new Statusbar(client);
      music.launch();
      music.waitForFirstTile();
      music.switchToSongsView();

      // check the status bar for the hidden play icon
      client.switchToFrame();
      assert.equal(statusbar.playingIndicator.getAttribute('hidden'), 'true');

      music.switchToMe();
      music.playFirstSong();
      music.waitForPlayerView();
    });

    test('Check the play icon is in the status bar. moztrap:9742', function() {
      // check the status bar
      client.switchToFrame();
      assert.equal(statusbar.playingIndicator.getAttribute('hidden'), 'false');

      // switch to the homescreen
      var system = client.loader.getAppClass('system');
      system.goHome();
      client.waitFor(function() {
        return client.findElement(system.Selector.activeHomescreenFrame)
          .displayed();
      });

      // check the status bar again
      assert.equal(statusbar.playingIndicator.getAttribute('hidden'), 'false');
    });

    test('Check the play icon is hidden after close Music app', function() {
      music.close();
      client.switchToFrame();
      assert.equal(statusbar.playingIndicator.getAttribute('hidden'), 'true');
    });
  });

  suite('Rating test', function() {
    test('Check Rating is saved. moztrap:2683', function() {
      try {
        music.launch();
        music.waitForFirstTile();
        music.switchToSongsView();
        music.playFirstSong();

        // check there is no rating.
        music.showSongInfo();

        var rating = music.getStarRating();
        assert.equal(rating, 0);

        var rating_value = 4;
        music.tapRating(rating_value);

        // wait that the rating bar disappear.
        music.waitForRatingOverlayHidden();

        // tap to make the rating bar reappear.
        music.showSongInfo();

        rating = music.getStarRating();
        assert.equal(rating, rating_value, 'Check rating is shown.');

        // switch back and forth
        music.tapHeaderActionButton();
        music.playFirstSong();

        rating = music.getStarRating();
        assert.equal(rating, rating_value,
                    'Incorrect rating after switching song.');

        // close the app because we want to test things are saved.
        music.close();

        // start it over.
        music.launch();
        music.waitForFirstTile();
        music.switchToSongsView();
        music.playFirstSong();

        rating = music.getStarRating();
        assert.equal(rating, rating_value,
                     'Incorrect rating after restarting.');
      } catch(e) {
        assert.ok(false, 'Exception: ' + e.stack);
      }
    });
  });

  suite('Player navigation. moztrap:2376', function() {
    test('Check that the back button works', function() {
      var title;

      try {
        music.launch();
        music.waitForFirstTile();
        music.switchToSongsView();
        title = music.header.findElement('#header-title').text();
        music.playFirstSong();
        music.waitForPlayerView();
        assert.notEqual(title,
          music.header.findElement('#header-title').text());
        music.tapHeaderActionButton();
        music.waitForSongsView();
        client.switchToFrame(music.songsViewFrame);
        music.firstSong;
        music.switchToMe();
        assert.equal(title,
          music.header.findElement('#header-title').text());

        music.switchToAlbumsView();
        music.selectAlbum('A Minute With Brendan');
        title = music.header.findElement('#header-title').text();
        music.playFirstSongByAlbum();
        music.waitForPlayerView();
        assert.notEqual(title,
          music.header.findElement('#header-title').text());
        music.tapHeaderActionButton();
        music.waitForAlbumDetailView();
        client.switchToFrame(music.albumDetailViewFrame);
        music.firstSong;
        music.switchToMe();
        assert.equal(title,
          music.header.findElement('#header-title').text());

        music.switchToArtistsView();
        music.selectArtist('Minute With');
        title = music.header.findElement('#header-title').text();
        music.playFirstSongByArtist();
        music.waitForPlayerView();
        assert.notEqual(title,
          music.header.findElement('#header-title').text());
        music.tapHeaderActionButton();
        music.waitForArtistDetailView();
        client.switchToFrame(music.artistDetailViewFrame);
        music.firstSong;
        music.switchToMe();
        assert.equal(title,
          music.header.findElement('#header-title').text());

        music.switchToPlaylistsView();
        music.selectPlaylist('Recently added');
        title = music.header.findElement('#header-title').text();
        music.playFirstSongByPlaylist();
        music.waitForPlayerView();
        assert.notEqual(title,
          music.header.findElement('#header-title').text());
        music.tapHeaderActionButton();
        music.waitForPlaylistDetailView();
        client.switchToFrame(music.playlistDetailViewFrame);
        music.firstSong;
        music.switchToMe();
        assert.equal(title,
          music.header.findElement('#header-title').text());
      } catch(e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
    });
  });

});
