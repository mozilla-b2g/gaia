/* jshint node: true*/
/* global marionette, setup, suite, test*/
'use strict';

var assert = require('assert');
var Ringtones = require('../lib/ringtones');
var Settings = require('../../../../settings/test/marionette/app/app');
var Music = require('../../../../music/test/marionette/lib/music');

marionette('Share as ringtone', function() {

  var client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    }
  });
  var app;

  setup(function() {
    app = new Ringtones(client);

    client.fileManager.removeAllFiles();
    client.fileManager.add([
      { type: 'music', filePath: 'test_media/samples/Music/b2g.ogg' }
    ]);
  });

  suite('Share activity', function() {

    test('Create new ringtone', function() {
      var musicApp = new Music(client);
      var settingsApp = new Settings(client);

      musicApp.launch();
      musicApp.waitForFirstTile();
      musicApp.switchToSongsView();
      musicApp.playFirstSong();
      musicApp.shareWith('Ringtones');

      app.inShare(function(container) {
        container.waitForSongInfo('Boot To Gecko (B2G)', 'Minute With');
        container.saveButton.tap();
      });

      client.switchToFrame();
      settingsApp.launch();
      var soundPanel = settingsApp.soundPanel;

      app.inManager(soundPanel, function(container) {
        var customSounds = container.soundLists[1];
        assert.equal(customSounds.sounds.length, 1,
                     'Custom ringtone list should have one item');
        assert.equal(customSounds.displayed(), true,
                     'Custom ringtone list should be displayed');

        var myTone = customSounds.sounds[0];
        assert.equal(myTone.name, 'Boot To Gecko (B2G)');
        assert.equal(myTone.subtitle, 'Minute With');
      });
    });

  });
});
