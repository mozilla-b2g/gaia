/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('assert');

var Music = require('./lib/music.js');
var FakeActivityCaller = require('./lib/fakeactivitycaller.js');

marionette('Music ui tests', function() {
  var apps = {};
  apps[FakeActivityCaller.DEFAULT_ORIGIN] = __dirname + '/fakeactivitycaller';

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

  var music, system;

  setup(function() {
    music = new Music(client);
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  suite('Test overlay', function() {
    setup(function() {
      client.fileManager.removeAllFiles();
    });

    test('Overlay visible when storage has no songs', function() {
      try {
        music.launch();
        music.waitFinishedScanning();
        music.waitForMessageOverlayShown(true);
      } catch(e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
    });

    test('Overlay hidden when storage has some songs', function() {
      client.fileManager.add([
        { type: 'music', filePath: 'test_media/samples/Music/b2g.ogg' }
      ]);
      try {
        music.launch();
        music.waitFinishedScanning();
        music.waitForFirstTile();
        music.waitForMessageOverlayShown(false);
      } catch(e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
    });
  });

  suite('Test picker activity', function() {
    var activitycaller;

    function performTest(shown) {
      try {
        activitycaller.launch();
        activitycaller.tapPickButton();
        activitycaller.selectMusicApp();

        music.switchToMe();
        music.waitFinishedScanning();
        music.waitForMessageOverlayShown(shown);
      } catch(e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
    }

    setup(function() {
      activitycaller = new FakeActivityCaller(client);
      client.fileManager.removeAllFiles();
    });

    test('Overlay visible with no songs', function() {
      performTest(true);
    });

    test('Overlay hidden with some songs', function() {
      client.fileManager.add([
        { type: 'music', filePath: 'test_media/samples/Music/b2g.ogg' }
      ]);
      performTest(false);
    });
  });


  suite('Test open activity', function() {
    var activitycaller;

    function performTest() {
      try {
        activitycaller.launch();
        activitycaller.tapOpenButton();
        activitycaller.selectMusicApp();

        music.switchToMe();
        music.waitFinishedScanning();
        music.waitForPlayerView();
      } catch(e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
    }

    setup(function() {
      activitycaller = new FakeActivityCaller(client);
      client.fileManager.removeAllFiles();
    });

    test('Player shows with no song in database.', function() {
      performTest();
    });

    test('Player shows with one song in database.', function() {
      client.fileManager.add([
        { type: 'music', filePath: 'test_media/samples/Music/b2g.ogg' }
      ]);

      performTest();
    });
  });

});
