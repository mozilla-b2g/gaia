/* global require, marionette, setup, suite, test */
'use strict';

var assert = require('assert');
var Music = require('./lib/music.js');
var ListviewHelper = require('./lib/listviewhelper.js');

function assertStartsWith(start, actual) {
  assert.equal(actual.indexOf(start), 0,
               '"' + actual + '" does not start with "' + start + '"');
}

marionette('Music player metadata', function() {
  var apps = {};

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

      music.launch();
      music.waitForFirstTile();

      music.switchToArtistsView();

      var bg;
      var blue, red;

      // We test the album art url.
      // an "app:" URL is the default placeholder.
      // a "blob:" URL is a blob. Produced from the metadata.

      bg = ListviewHelper.albumArtForListItem(client, music.listItems[0]);
      assertStartsWith('url("app:', bg);

      blue = ListviewHelper.albumArtForListItem(client, music.listItems[1]);
      assertStartsWith('url("blob:', blue);

      red = ListviewHelper.albumArtForListItem(client, music.listItems[2]);
      assertStartsWith('url("blob:', red);

      assert.notEqual(blue, red, 'Red and Blue should be different');

      music.switchToAlbumsView();

      bg = ListviewHelper.albumArtForListItem(client, music.listItems[0]);
      assertStartsWith('url("app:', bg);

      bg = ListviewHelper.albumArtForListItem(client, music.listItems[1]);
      assertStartsWith('url("blob:', bg);
      assert.equal(bg, blue, 'Is not the blue art');

      bg = ListviewHelper.albumArtForListItem(client, music.listItems[2]);
      assertStartsWith('url("blob:', bg);
      assert.equal(bg, red, 'Is not the red art');

      music.switchToSongsView();

      bg = ListviewHelper.albumArtForListItem(client, music.listItems[0]);
      assertStartsWith('url("blob:', bg);
      assert.equal(bg, blue, 'Is not the blue art');

      bg = ListviewHelper.albumArtForListItem(client, music.listItems[1]);
      assertStartsWith('url("app:', bg);

      bg = ListviewHelper.albumArtForListItem(client, music.listItems[2]);
      assertStartsWith('url("blob:', bg);
      assert.equal(bg, red, 'Is not the red art');
    });

  });
});
