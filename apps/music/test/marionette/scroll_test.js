/* global require, marionette, setup, suite, test */
'use strict';

var assert = require('assert');
var Music = require('./lib/music.js');

marionette('Music player scrolling', function() {

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
    ]);
  });


  suite('Alpha Scroller', function() {

    function getOffsetTop(target) {
      return target.scriptWith(function(el) {
        return el.offsetTop;
      });
    }

    function listViewScrollTop() {
      return music.client.executeScript(function() {
        return document.getElementById('views-list').scrollTop;
      });
    }

    setup(function() {
      music.launch();
      music.waitForFirstTile();
      music.switchToSongsView();
    });

    test('No scroll', function() {
      // tap a letter with nothing. No scrolling should happen
      var target = music.client.findElement('#section-group-B');
      var oldScrollTop = listViewScrollTop();

      music.scrollToLetter('D');

      var scrollTop = listViewScrollTop();
      var offsetTop = getOffsetTop(target);

      assert.strictEqual(target.text(), 'B');
      assert.strictEqual(oldScrollTop, scrollTop);
      assert.notEqual(scrollTop, offsetTop);

    });

    test('Scroll', function() {
      // tap a letter that do exist. Scrolling should have happened.
      var target = music.client.findElement('#section-group-C');
      var oldScrollTop = listViewScrollTop();

      music.scrollToLetter('C');

      var scrollTop = listViewScrollTop();
      var offsetTop = getOffsetTop(target);

      assert.strictEqual(target.text(), 'C');
      assert.notEqual(oldScrollTop, scrollTop);
      assert.strictEqual(scrollTop, offsetTop);
    });
  });
});
