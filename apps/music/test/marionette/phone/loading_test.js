/* global require, marionette, setup, suite, test */
'use strict';

var assert = require('assert');
var Music = require('../lib/music.js');

marionette('Music files loading', function() {
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

  suite('Detection of movies.', function () {
    setup(function() {
      client.fileManager.removeAllFiles();
      client.fileManager.add([
        {
          // Regular Ogg Vorbis.
          type: 'music',
          filePath: 'apps/music/test-data/playlists/a.ogg'
        },
        {
          // AAC file.
          type: 'music',
          filePath: 'apps/music/test-data/aac-tags.mp4'
        },
        {
          // MPEG4 video file. Shouldn't load.
          type: 'music',
          filePath: 'test_media/Movies/gizmo2.mp4'
        }
      ]);
    });

    test('Check the mp4 video isn\'t loaded. moztrap:8456', function() {

      music.launch();
      music.waitForFirstTile();
      music.waitFinishedScanning();

      music.switchToSongsView();

      music.waitForListEnumerate();

      var songs = music.listItems;
      assert.equal(songs.length, 2, 'Wrong number of songs');

      var songNames = client.executeScript(function() {
        var w = window.wrappedJSObject;
        return w.ListView.dataSource.map(function(record) {
          return record.name;
        }).sort();
      });

      assert.equal(songNames.length, 2,
                   'Data source have wrong number of songs');

      assert.equal(songNames[0], 'music/a.ogg');
      assert.equal(songNames[1], 'music/aac-tags.mp4');
    });

  });
});
