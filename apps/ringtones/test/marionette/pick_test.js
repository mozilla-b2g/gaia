/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var Ringtones = require('./lib/ringtones.js'),
    Statusbar = require('./lib/statusbar.js');

var FAKEMUSIC_ORIGIN = 'fakemusic.gaiamobile.org';
var RINGTONES_ORIGIN = 'ringtones.gaiamobile.org';

marionette('ringtones tests', function() {
  var apps = {};
  apps[FAKEMUSIC_ORIGIN] = __dirname + '/fakemusic';

  var client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    },

    settings: {
      'lockscreen.locked': false,
      'ftu.manifestURL': null
    },

    apps: apps
  });

  var statusbar, ringtones;

  setup(function() {
    statusbar = new Statusbar(client);
    ringtones = new Ringtones(client, 'app://' + RINGTONES_ORIGIN);

    client.executeScript(function() {
      window.wrappedJSObject.lockScreen.unlock();
    });

    client.fileManager.removeAllFiles();

    client.fileManager.add([
      { type: 'music', filePath: 'media-samples/Music/b2g.ogg' }
    ]);
  });

  suite('Ringtones app pick activity', function() {
    test('Interrupt and resume the background music', function() {
      client.apps.launch('app://' + FAKEMUSIC_ORIGIN);

      statusbar.waitForPlayingIndicatorShown(true);

      ringtones.launchInForeground();
      ringtones.waitForPanel();
      ringtones.preview();

      statusbar.waitForPlayingIndicatorShown(false);

      ringtones.switchToMe();
      ringtones.leavePanel();

      statusbar.waitForPlayingIndicatorShown(true);
    });
  });
});
