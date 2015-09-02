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
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var music, system;

  setup(function() {
    music = new Music(client);
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  suite('Launch regular music with no audio files', function() {
    setup(function() {
      client.fileManager.removeAllFiles();
    });

    test.skip('Overlay should be shown when storage has no songs', function() {
      try {
        music.launch();
        music.waitFinishedScanning();
        music.waitForMessageOverlayShown(true);
      } catch(e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
    });
  });

  suite('Launch regular music with one audio file', function() {
    setup(function() {
      client.fileManager.add([
        { type: 'music', filePath: 'test_media/samples/Music/b2g.ogg' }
      ]);
    });

    test.skip('Overlay should be hidden when storage has some songs', function() {
      try {
        music.launch();
        music.waitFinishedScanning();
        music.waitForFirstTile();
        music.isMessageOverlayShown(false);
      } catch(e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
    });
  });

  suite('Launch music picker with no audio files', function() {
    var activitycaller;

    setup(function() {
      activitycaller = new FakeActivityCaller(client);
      client.fileManager.removeAllFiles();
    });

    test.skip('Overlay should be shown when storage has no songs', function() {
      try {
        activitycaller.launch();

        music.switchToMe();
        music.waitFinishedScanning();
        music.waitForMessageOverlayShown(true);
      } catch(e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
    });
  });

  suite('Launch music picker with one audio file', function() {
    var activitycaller;

    setup(function() {
      activitycaller = new FakeActivityCaller(client);

      client.fileManager.add([
        { type: 'music', filePath: 'test_media/samples/Music/b2g.ogg' }
      ]);
    });

    test.skip('Overlay should be hidden when storage has some songs',
              function() {
      try {
        activitycaller.launch();

        music.switchToMe();
        music.waitFinishedScanning();
        music.waitForMessageOverlayShown(false);
      } catch(e) {
        assert.ok(false, 'Exception ' + e.stack);
      }
    });
  });
});
