/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var Music = require('./lib/music.js');
var Keyboard = require('./lib/keyboard.js');
var System = require('./lib/system.js');
var FakeActivityCaller = require('./lib/fakeactivitycaller.js');

marionette('Music ui tests', function() {
  var apps = {};
  apps[FakeActivityCaller.DEFAULT_ORIGIN] = __dirname + '/fakeactivitycaller';

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
  var keyboard;
  var system;

  setup(function() {
    music = new Music(client);
    keyboard = new Keyboard(client);
    system = new System(client);
  });

  suite('Launch regular music with no audio files', function() {
    setup(function() {
      client.fileManager.removeAllFiles();
    });

    test('Overlay should be shown when storage has no songs', function() {
      music.launch();
      music.waitForMessageOverlayShown(true);
    });
  });

  suite('Launch regular music with one audio file', function() {
    setup(function() {
      client.fileManager.add([
        { type: 'music', filePath: 'test_media/samples/Music/b2g.ogg' }
      ]);
    });

    test('Overlay should be hidden when storage has some songs', function() {
      music.launch();
      music.waitForMessageOverlayShown(false);
      music.waitForFirstTile();
    });
  });

  suite('Launch music picker with no audio files', function() {
    var activitycaller;

    setup(function() {
      activitycaller = new FakeActivityCaller(client);
      client.fileManager.removeAllFiles();
    });

    test('Overlay should be shown when storage has no songs', function() {
      activitycaller.launch();

      music.switchToMe();
      music.waitForMessageOverlayShown(true);
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

    test('Overlay should be hidden when storage has some songs', function() {
      activitycaller.launch();

      music.switchToMe();
      music.waitForMessageOverlayShown(false);
    });
  });

  suite('Search music', function() {
    setup(function() {
      client.fileManager.add([
        { type: 'music', filePath: 'test_media/samples/Music/b2g.ogg' }
      ]);
    });

    test('Keyboard should dismiss when click return key', function() {
      music.launch();
      music.scrollAndTapSearchBox();

      // Wait for the keyboard pop up and switch to it
      system.waitForKeyboardFrameDisplayed();
      system.switchToActiveKeyboardFrame();

      keyboard.tapReturnKey();
      system.waitForKeyboardFrameHidden();

      music.switchToMe();
      music.waitForTileSearchBoxShown();
    });
  });
});
