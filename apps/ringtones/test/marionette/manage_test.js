/* jshint node: true*/
/* global marionette, setup, suite, test*/
'use strict';

var assert = require('assert');
var Ringtones = require('./lib/ringtones');
var Settings = require('../../../settings/test/marionette/app/app');
var Music = require('../../../music/test/marionette/lib/music');

function assert_sorted(array, message) {
  if (array.length === 0) {
    return;
  }

  var prevElt = array[0];
  for (var i = 1; i < array.length; i++) {
    assert(prevElt.localeCompare(array[i]) < 0, message);
    prevElt = array[i];
  }
}

marionette('Ringtone management', function() {

  var client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    }
  });
  var app, settingsApp;
  var soundPanel;

  setup(function() {
    settingsApp = new Settings(client);
    app = new Ringtones(client);

    client.fileManager.removeAllFiles();
    client.fileManager.add([
      { type: 'music', filePath: 'test_media/samples/Music/b2g.ogg' }
    ]);

    settingsApp.launch();
    soundPanel = settingsApp.soundPanel;
  });

  suite('Manage ringtones', function() {

    test('Load list of sounds', function() {
      app.inManager(soundPanel, function(container) {
        var soundLists = container.soundLists;
        assert.equal(soundLists.length, 2,
                     'Should have found 2 sound lists');

        assert.equal(soundLists[0].header.getAttribute('data-l10n-id'),
                     'list-title-ringtone');
        assert.equal(soundLists[1].header.getAttribute('data-l10n-id'),
                     'list-title-custom');

        assert.notEqual(soundLists[0].sounds.length, 0,
                        'Built-in ringtone list should not be empty');
        assert.equal(soundLists[1].sounds.length, 0,
                     'Custom ringtone list should be empty');

        assert.equal(soundLists[0].displayed(), true,
                     'Built-in ringtone list should be displayed');
        assert.equal(soundLists[1].displayed(), false,
                     'Custom ringtone list should be hidden');

        var names = soundLists[0].sounds.map(function(element) {
          return element.name.toLocaleLowerCase();
        });
        assert_sorted(names, 'Tones should be sorted by name');
      });
    });


    test('Load custom sound', function() {
      // Inject a custom ringtone, then close and reopen the app to show it.
      app.inManager(soundPanel, function(container) {
        var tone = container.addCustomRingtone({
          name: 'My ringtone', subtitle: 'Bob\'s Ringtones'
        });
        assert.equal(tone.name, 'My ringtone');
        assert.equal(tone.subtitle, 'Bob\'s Ringtones');
        container.backButton.tap();
      });

      app.inManager(soundPanel, function(container) {
        var customSounds = container.soundLists[1];
        assert.equal(customSounds.sounds.length, 1,
                     'Custom ringtone list should have one item');
        assert.equal(customSounds.displayed(), true,
                     'Custom ringtone list should be displayed');

        var myTone = customSounds.sounds[0];
        assert.equal(myTone.name, 'My ringtone');
        assert.equal(myTone.subtitle, 'Bob\'s Ringtones');
      });
    });

    test('Open action menu for built-in ringtone', function() {
      app.inManager(soundPanel, function(container) {
        var actionsMenu = container.soundLists[0].sounds[0].openActions();
        assert.equal(actionsMenu.shareButton.displayed(), true,
                     'Share button should be displayed');
        assert.equal(actionsMenu.deleteButton.displayed(), false,
                     'Delete button should be hidden');
      });
    });

    test('Open action menu for custom ringtone', function() {
      // Inject a custom ringtone, then close and reopen the app to show it.
      app.inManager(soundPanel, function(container) {
        container.addCustomRingtone({
          name: 'My ringtone', subtitle: 'Bob\'s Ringtones'
        });
        container.backButton.tap();
      });

      app.inManager(soundPanel, function(container) {
        var customSounds = container.soundLists[1];
        assert.equal(customSounds.sounds.length, 1,
                     'Custom ringtone list should have one item');
        assert.equal(customSounds.displayed(), true,
                     'Custom ringtone list should be displayed');

        var actionsMenu = customSounds.sounds[0].openActions();
        assert.equal(actionsMenu.shareButton.displayed(), true,
                     'Share button should be displayed');
        assert.equal(actionsMenu.deleteButton.displayed(), true,
                     'Delete button should be displayed');
      });
    });

    test('Share ringtone', function() {
      app.inManager(soundPanel, function(container) {
        // Make sure we get at least as far as being able to share to the SMS
        // app. XXX: Later, this could be more detailed and actually check that
        // the right data was sent...
        var actionsMenu = container.soundLists[0].sounds[0].openActions();
        actionsMenu.shareButton.tap();

        // Make sure we can't share with ourselves, since that's weird.
        assert.equal(actionsMenu.shareWith('Ringtones'), null,
                     'Ringtones app shouldn\'t be in Share menu');

        // Share with the messages app.
        actionsMenu.shareWith('Messages').tap();
      });
    });

    test('Delete ringtone', function() {
      // Inject a custom ringtone, then close and reopen the app to show it.
      app.inManager(soundPanel, function(container) {
        container.addCustomRingtone({
          name: 'My ringtone', subtitle: 'Bob\'s Ringtones'
        });
        container.backButton.tap();
      });

      app.inManager(soundPanel, function(container) {
        var customSounds = container.soundLists[1];
        var numTones = customSounds.sounds.length;

        var actionsMenu = customSounds.sounds[0].openActions();
        actionsMenu.deleteButton.tap();
        var dialog = actionsMenu.waitForDialog();
        dialog.cancelButton.tap();
        assert.equal(customSounds.sounds.length, numTones,
                     'Tone should not have been deleted');

        actionsMenu = customSounds.sounds[0].openActions();
        actionsMenu.deleteButton.tap();
        dialog = actionsMenu.waitForDialog();
        dialog.confirmButton.tap();
        assert.equal(customSounds.sounds.length, numTones - 1,
                     'Tone should have been deleted');
      });
    });

    test('Create new ringtone', function() {
      var musicApp = new Music(client);

      app.inManager(soundPanel, function(container) {
        container.addButton.tap();

        musicApp.switchToMe();
        musicApp.playFirstSong();
        musicApp.finishPick();

        container.waitForNewRingtoneWindow(function(win) {
          win.waitForSongInfo('Boot To Gecko (B2G)', 'Minute With');
          win.saveButton.tap();
        });

        var customSounds = container.soundLists[1];
        client.waitFor(function() {
          return customSounds.sounds.length === 1;
        });
        assert.equal(customSounds.displayed(), true,
                     'Custom ringtone list should be displayed');
        var myTone = customSounds.sounds[0];
        assert.equal(myTone.name, 'Boot To Gecko (B2G)');
        assert.equal(myTone.subtitle, 'Minute With');
      });
    });

  });
});
