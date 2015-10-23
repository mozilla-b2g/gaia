/* global require, marionette, setup, suite, test, __dirname,
marionetteScriptFinished */
'use strict';

var assert = require('assert');
var Music = require('./lib/music.js');
var FakeRingtones = require('./lib/fakeringtones.js');
var FakeControls = require('./lib/fakecontrols.js');

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

  function testSearchResults(expectedCount) {
    client.switchToFrame(music.activeViewFrame);

    var search = client.findElement('music-search-results');
    assert.ok(search);

    client.switchToShadowRoot(search);

    var results = client.helper.waitForElement('#list');
    assert.ok(results);

    // wait for the results to be displayed.
    // XXX this mostly assume we populate before showing the div.
    client.waitFor(function() {
      return results.displayed();
    });

    // XXX fix me when this is true
    // since we display the count, just get it.
    //var count = results.findElement('.search-result-count').text();

    var resultsList = results.findElements('li');
    assert.ok(resultsList);

    // detect inconsistency.
    assert.equal(resultsList.length, expectedCount);
    // XXX when the count is back
    // check what we expect.
    //    assert.equal(count, expectedCount);

    client.switchToShadowRoot();

    var resultsData = client.executeScript(
      'var parse = ' + music.parseListItemsData.toString() + '\n' +
      'var search = document.querySelector(\'music-search-results\');\n' +
      'var list = search.shadowRoot.getElementById(\'list\');\n' +
      'var elements = list.querySelectorAll(\'a\');\n' +
      'return parse(elements);\n'
    );

    music.switchToMe();
    return resultsData;
  }

  suite('Search tests', function () {

    setup(function() {
      music.launch();
      music.waitForFirstTile();

      // Here we wait 1.5 seconds for the search input hides completely.
      // it will re-show after we scroll the target view.
      music.showSearchInput(Music.Selector.tilesView);
    });

    test('Check simple search results in artists.', function() {
      try {
        music.searchTiles('the');
        // check for the results in "artists"
        var resultsList = testSearchResults(3);

        assert.equal(resultsList[1].title, 'The NSA');
        assert.equal(resultsList[1].section, 'artists');
        // XXX fixme when we have the search highlights
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1209432
        // assert.equal(resultsList[1].highlight, 'The');
        assert.equal(resultsList[2].title, 'The Ecuadorian Embassy');
        assert.equal(resultsList[2].section, 'songs');

      } catch(e) {
        assert.ok(false, e.stack);
      }
    });

    test('Check empty results', function() {
      try {
        music.searchTiles('qwerty');

        // current implement of empty result is ONE line
        // with a string indicating nothing was found.
        var resultsList = testSearchResults(1);
        assert.equal(resultsList.length, 1);

        client.switchToFrame(music.activeViewFrame);

        var search = client.findElement('music-search-results');
        assert.ok(search);

        client.switchToShadowRoot(search);

        // ensure that we get the properly localized string.
        var noResultString = client.executeAsyncScript(function () {
          window.wrappedJSObject.document.l10n.formatValue('search-no-result').
            then(function(noResult) {
              marionetteScriptFinished(noResult);
            });
        });

        client.switchToShadowRoot();
        music.switchToMe();

        assert.equal(resultsList[0].title, noResultString);
      } catch(e) {
        assert.ok(false, e.stack);
      }
    });
  });

  suite('Search context tests', function () {

    setup(function() {
      music.launch();
      music.waitForFirstTile();
    });

    // Test contextual search
    // XXX fixme: currently make the app *crash*
    test('Check the context for artists', function() {
      try {
        music.switchToArtistsView();

        music.showSearchInput('#list');
        music.searchArtists('the');

        var resultsList = testSearchResults(2);

        assert.equal(resultsList[1].title, 'The NSA');
        // XXX fix when we have highlights
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1209432
        // assert.equal(resultsList[1].highlight, 'The');
      } catch(e) {
        assert.ok(false, e.stack);
      }
    });

  });
});
