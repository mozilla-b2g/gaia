/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('assert');
var Music = require('./lib/music.js');
var FakeRingtones = require('./lib/fakeringtones.js');
var FakeControls = require('./lib/fakecontrols.js');
/*var Statusbar = require('./lib/statusbar.js');*/

marionette('Music player search', function() {
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
      },
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
      }
    ]);
  });

  function testSearchResults(viewSelector, expectedCount) {
    var view = client.helper.waitForElement(viewSelector);
    assert.ok(view);

    // wait for the results to be displayed.
    // XXX this mostly assume we populate before showing the div.
    client.waitFor(function() {
      return view.displayed();
    });

    // since we display the count, just get it.
    var count = view.findElement('.search-result-count').text();
    var results = view.findElement('.search-results');
    assert.ok(results);

    var resultsList = results.findElements('li.list-item', 'css selector');
    assert.ok(resultsList);

    // detect inconsistency.
    assert.equal(resultsList.length, count);
    // check what we expect.
    assert.equal(count, expectedCount);

    return resultsList;
  }

  suite('Search tests', function () {

    setup(function() {
      music.launch();
      music.waitForFirstTile();

      music.searchTiles('the');
    });


    test('Check simple search results in artists.', function() {
      // check for the results in "artists"
      var resultsList = testSearchResults(Music.Selector.searchArtists, 2);

      assert.equal(resultsList[1].findElement('.list-single-title').text(),
                   'The NSA');
      assert.equal(resultsList[1].findElement('.search-highlight').text(),
                   'The');

      var noResult = client.findElement(Music.Selector.searchNoResult);
      assert.ok(noResult);
      assert.ok(!noResult.displayed());
    });

    test('Check simple search results in tracks.', function() {
      // check for the results in "artists"
      var resultsList = testSearchResults(Music.Selector.searchTitles, 1);

      assert.equal(resultsList[0].findElement('.list-main-title').text(),
                   'The Ecuadorian Embassy');
      assert.equal(resultsList[0].findElement('.search-highlight').text(),
                   'The');
      var noResult = client.findElement(Music.Selector.searchNoResult);
      assert.ok(noResult);
      assert.ok(!noResult.displayed());
    });

    test('Check empty results', function() {
      music.searchTiles('qwerty');

      var view = client.findElement(Music.Selector.searchNoResult);

      assert.ok(view);

      client.waitFor(function() {
        return view.displayed();
      });

      assert.ok(view.displayed());
    });
  });

  suite('Search context tests', function () {

    setup(function() {
      music.launch();
      music.waitForFirstTile();
    });

    // Tiles mode is already tested above.

    test('Check the context for artists', function() {
      music.switchToArtistsView();
      music.searchTiles('the');

      var resultsList = testSearchResults(Music.Selector.searchArtists, 2);

      assert.equal(resultsList[1].findElement('.list-single-title').text(),
                   'The NSA');
      assert.equal(resultsList[1].findElement('.search-highlight').text(),
                   'The');
    });

  });
});
