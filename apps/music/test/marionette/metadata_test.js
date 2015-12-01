/* global require, marionette, setup, suite, test */
'use strict';

var assert = require('assert');
var Music = require('./lib/music.js');

function assertStartsWith(start, actual) {
  assert.equal(actual.indexOf(start), 0,
               '"' + actual + '" does not start with "' + start + '"');
}

marionette('Music player metadata', function() {
  var apps = {};

  var client = marionette.client({
    profile: {
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
    }
  });

  var music;

  setup(function() {
    music = new Music(client);

  });

  suite('Album art display', function () {
    setup(function() {
      client.fileManager.removeAllFiles();
      client.fileManager.add([
        // if the metadata changes in any of this files
        // the test might break. Artist, Title, Album, Art.
        {
          // blue art.
          type: 'music',
          filePath: 'apps/music/test-data/playlists/a.ogg'
        },
        {
          // red art
          type: 'music',
          filePath: 'apps/music/test-data/playlists/01.ogg'
        },
        {
          // no art
          type: 'music',
          filePath: 'test_media/samples/Music/b2g.ogg'
        },
      ]);
    });

    test('Check album art is displayed. moztrap:8749', function() {
      try {

        music.launch();
        music.waitForFirstTile();

        music.switchToArtistsView();

        music.waitForArtistsView();

        var bg, placeholder, blue, red;

        // We test the album art url.
        // an "app:" URL is the default placeholder.
        // a "blob:" URL is a blob. Produced from the metadata.

        var listItemsData = music.artistsListItemsData;

        placeholder = listItemsData[0].img;

        assertStartsWith('app:', placeholder);

        blue = listItemsData[1].img;
        assertStartsWith('blob:', blue);

        red = listItemsData[2].img;
        assertStartsWith('blob:', red);

        assert.notEqual(placeholder, blue,
                        'Placeholder and Blue should be different');
        assert.notEqual(placeholder, red,
                        'Placeholder and Red should be different');
        assert.notEqual(blue, red, 'Red and Blue should be different');

        //

        music.switchToAlbumsView();

        listItemsData = music.albumsListItemsData;

        bg = listItemsData[0].img;
        assert.equal(bg, placeholder, 'Is not the placeholder art');

        bg = listItemsData[1].img;
        assert.equal(bg, blue, 'Is not the blue art');

        bg = listItemsData[2].img;
        assert.equal(bg, red, 'Is not the red art');

        //

        music.switchToSongsView();

        listItemsData = music.songsListItemsData;

        bg = listItemsData[0].img;
        assert.equal(bg, blue, 'Is not the blue art');

        bg = listItemsData[1].img;
        assert.equal(bg, placeholder, 'Is not the placeholder art');

        bg = listItemsData[2].img;
        assert.equal(bg, red, 'Is not the red art');
      } catch(e) {
        assert.ok(false, e.stack);
      }
    });

  });
});
