/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('assert');
var Music = require('./lib/music.js');
var FakeRingtones = require('./lib/fakeringtones.js');
var FakeControls = require('./lib/fakecontrols.js');
var SearchHelper = require('./lib/searchhelper.js');
/*var Statusbar = require('./lib/statusbar.js');*/

marionette('Music player search', function() {
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

      // Here we wait 1.5 seconds for the search input hides completely.
      // it will re-show after we scroll the target view.
      client.helper.wait(1500);
      music.showSearchInput(Music.Selector.tilesView);
    });

    test('Check simple search results in artists.', function() {
      music.searchTiles('the');
      // check for the results in "artists"
      var resultsList = testSearchResults(Music.Selector.searchArtists, 2);

      assert.equal(SearchHelper.singleTitle(resultsList[1]), 'The NSA');
      assert.equal(SearchHelper.highlight(resultsList[1]), 'The');

      var noResult = client.findElement(Music.Selector.searchNoResult);
      assert.ok(noResult);
      assert.ok(!noResult.displayed());
    });

    test('Check simple search results in tracks.', function() {
      music.searchTiles('the');
      // check for the results in "artists"
      var resultsList = testSearchResults(Music.Selector.searchTitles, 1);

      assert.equal(SearchHelper.mainTitle(resultsList[0]),
                   'The Ecuadorian Embassy');
      assert.equal(SearchHelper.highlight(resultsList[0]), 'The');
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
      music.waitForListView();

      music.showSearchInput(Music.Selector.listView);
      music.searchArtists('the');

      var resultsList = testSearchResults(Music.Selector.searchArtists, 2);

      assert.equal(SearchHelper.singleTitle(resultsList[1]), 'The NSA');
      assert.equal(SearchHelper.highlight(resultsList[1]), 'The');
    });

  });
});
