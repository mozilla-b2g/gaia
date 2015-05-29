/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('assert');
var Music = require('./lib/music.js');
var FakeRingtones = require('./lib/fakeringtones.js');
var FakeControls = require('./lib/fakecontrols.js');
var Statusbar = require('./lib/statusbar.js');
var PlayerHelper = require('./lib/playerhelper.js');

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
      music.launch();
      music.waitForFirstTile();
      music.checkPlayerIconShown(false);
    });

    test('Check the player icon displays after play some song', function() {
      music.launch();
      music.waitForFirstTile();
      music.switchToSongsView();
      music.playFirstSong();
      music.waitForPlayerView();

      music.tapHeaderActionButton();
      music.waitForListView();
      music.checkPlayerIconShown(true);
    });
  });

  suite('Status bar', function() {

    var statusbar;
    setup(function() {
      statusbar = new Statusbar(client);
    });

    test('Check the play icon is in the status bar. moztrap:9742', function() {
      music.launch();
      music.waitForFirstTile();
      music.switchToSongsView();

      // check the status bar for the hidden play icon
      client.switchToFrame();
      assert.equal(statusbar.playingIndicator.getAttribute('hidden'), 'true');

      music.switchToMe();
      music.playFirstSong();
      music.waitForPlayerView();

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
  });

  suite('Rating test', function() {
    test('Check Rating is saved. moztrap:2683', function() {
      music.launch();
      music.waitForFirstTile();
      music.switchToSongsView();
      music.playFirstSong();

      var stars;

      // check there is no rating.
      music.showSongInfo();
      stars = client.findElement(Music.Selector.ratingBar).
        findElements('button');
      assert.equal(stars.length, 5, 'Less than 5 stars found');
      PlayerHelper.checkEmptyRating(stars);

      var rating_value = 4;

      music.tapRating(rating_value);

      // wait that the rating bar disappear.
      client.waitFor(function() {
        return !client.findElement(Music.Selector.ratingBar).displayed();
      });

      // tap to make the rating bar reappear.
      music.showSongInfo();

      // find all the stars that are on.
      stars = client.findElements(Music.Selector.ratingStarsOn);
      assert.equal(stars.length, rating_value);

      PlayerHelper.checkRatingStarsOrder(stars);

      // switch back and forth
      music.tapHeaderActionButton();
      music.playFirstSong();

      stars = client.findElements(Music.Selector.ratingStarsOn);
      assert.equal(stars.length, rating_value);

      // close the app because we want to test things are saved.
      music.close();

      // start it over.
      music.launch();
      music.waitForFirstTile();
      music.switchToSongsView();
      music.playFirstSong();

      stars = client.findElements(Music.Selector.ratingStarsOn);
      assert.equal(stars.length, rating_value);
    });
  });

  suite('Player navigation. moztrap:2376', function() {
    test('Check that the back button works', function() {
      // the navigation test back from the tab
      function tabNavTest() {
        music.waitForSubListView();
        music.tapHeaderActionButton();
        music.waitForListView();
      }

      // the actual navigation test
      // sublist is set to true if we navigate from a sublistView.
      function navTest(sublist) {

        var title = music.header.findElement('#title-text').text();
        if (sublist) {
          music.playFirstSongSublist();
        } else {
          music.playFirstSong();
        }

        // Wait for the player view or the title is not changed yet.
        music.waitForPlayerView();

        assert.notEqual(title, music.header.findElement('#title-text').text());

        music.tapHeaderActionButton();
        // firstSong currently *wait* for the element first.
        if (sublist) {
          music.firstSongSublist;
        } else {
          music.firstSong;
        }

        assert.equal(title, music.header.findElement('#title-text').text());
      }

      music.launch();
      music.waitForFirstTile();
      music.switchToSongsView();
      navTest(false);

      music.switchToAlbumsView();
      music.selectAlbum('A Minute With Brendan');
      navTest(true);
      tabNavTest();

      music.switchToArtistsView();
      music.selectArtist('Minute With');
      navTest(true);
      tabNavTest();

      music.switchToPlaylistsView();
      music.selectPlaylist('Recently added');
      navTest(true);
      tabNavTest();
    });
  });


});
