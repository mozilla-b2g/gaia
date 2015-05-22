/* jshint node: true*/
/* global marionette, setup, suite, test*/
'use strict';

var assert = require('assert');
var sd_card = require('./lib/sd_card');
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
    profile: {
      prefs: {
        'device.storage.enabled': true,
        'device.storage.testing': true,
        'device.storage.prompt.testing': true
      }
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

  suite('Initial load', function() {

    test('Load list of sounds', function() {
      app.inManager(soundPanel, function(container) {
        var soundLists = container.soundLists;
        assert.equal(soundLists.length, 4,
                     'Should have found 4 sound lists, found ' +
                     soundLists.length);

        var expectedInfo = [
          {l10nID: 'section-title-builtin-ringtone', visible: true},
          {l10nID: 'section-title-custom-ringtone', visible: false},
          {l10nID: 'section-title-builtin-alerttone', visible: true},
          {l10nID: 'section-title-custom-alerttone', visible: false}
        ];
        var getName = function(element) {
          return element.name.toLocaleLowerCase();
        };
        for (var i = 0; i < soundLists.length; i++) {
          // Check basic properties of each section.
          assert.equal(soundLists[i].header.getAttribute('data-l10n-id'),
                       expectedInfo[i].l10nID);
          assert.equal(soundLists[i].sounds.length !== 0,
                       expectedInfo[i].visible);
          assert.equal(soundLists[i].displayed(), expectedInfo[i].visible);

          // Check that the tones are in sorted order.
          var names = soundLists[i].sounds.map(getName);
          assert_sorted(names, 'Tones should be sorted by name');
        }
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
        container.backButton.tap(25, 25);
      });

      app.inManager(soundPanel, function(container) {
        var customRingtones = container.soundLists[1];
        assert.equal(customRingtones.sounds.length, 1,
                     'Custom ringtone list should have one item, found ' +
                     customRingtones.sounds.length);
        assert.equal(customRingtones.displayed(), true,
                     'Custom ringtone list should be displayed');

        var myTone = customRingtones.sounds[0];
        assert.equal(myTone.name, 'My ringtone');
        assert.equal(myTone.subtitle, 'Bob\'s Ringtones');
      });
    });

    test('Load sd card ringtone', function() {
      sd_card.injectTone(client, {
        type: 'ringtone', filePath: 'test_media/samples/Music/b2g.ogg'
      });
      app.inManager(soundPanel, function(container) {
        var customRingtones = container.soundLists[1];
        assert.equal(customRingtones.sounds.length, 1,
                     'Custom ringtone list should have one item, found ' +
                     customRingtones.sounds.length);
        assert.equal(customRingtones.displayed(), true,
                     'Custom ringtone list should be displayed');

        var customAlertTones = container.soundLists[3];
        assert.equal(customAlertTones.sounds.length, 0,
                     'Custom alert tone list should have no items, found ' +
                     customAlertTones.sounds.length);
        assert.equal(customAlertTones.displayed(), false,
                     'Custom alert tone list should be hidden');

        var myTone = customRingtones.sounds[0];
        assert.equal(myTone.name, 'b2g');
        assert.equal(myTone.subtitle, 'SD Card');
      });
    });

    test('Load sd card alert tone', function() {
      sd_card.injectTone(client, {
        type: 'alerttone', filePath: 'test_media/samples/Music/b2g.ogg'
      });
      app.inManager(soundPanel, function(container) {
        var customRingtones = container.soundLists[1];
        assert.equal(customRingtones.sounds.length, 0,
                     'Custom ringtone list should have no items, found ' +
                     customRingtones.sounds.length);
        assert.equal(customRingtones.displayed(), false,
                     'Custom ringtone list should be hidden');

        var customAlertTones = container.soundLists[3];
        assert.equal(customAlertTones.sounds.length, 1,
                     'Custom alert tone list should have one item, found ' +
                     customAlertTones.sounds.length);
        assert.equal(customAlertTones.displayed(), true,
                     'Custom alert tone list should be displayed');

        var myTone = customAlertTones.sounds[0];
        assert.equal(myTone.name, 'b2g');
        assert.equal(myTone.subtitle, 'SD Card');
      });
    });

  });

  suite('Creation', function() {

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

  suite('Previewing', function() {

    test('Previewing shows play icon', function() {
      app.inManager(soundPanel, function(container) {
        // Pick an alert tone, since they're short.
        var tone = container.soundLists[2].sounds[0];

        tone.tap();
        client.waitFor(function() { return tone.playing; });

        // The play icon should go away on its own once the tone ends.
        client.waitFor(function() { return !tone.playing; });
      });
    });

    test('Tapping twice hides play icon', function() {
      app.inManager(soundPanel, function(container) {
        var tone = container.soundLists[0].sounds[0];

        tone.tap();
        client.waitFor(function() { return tone.playing; });

        tone.tap();
        client.waitFor(function() { return !tone.playing; });
      });
    });

    test('Tapping another tone hides first play icon', function() {
      app.inManager(soundPanel, function(container) {
        var tone1 = container.soundLists[0].sounds[0];
        var tone2 = container.soundLists[0].sounds[1];

        tone1.tap();
        client.waitFor(function() { return tone1.playing; });

        tone2.tap();
        client.waitFor(function() { return tone2.playing; });
        client.waitFor(function() { return !tone1.playing; });
      });
    });

  });

  suite('Actions', function() {
    var toneInfos = [
      {location: 'built-in', type: 'ringtone', deletable: false,
       listIndex: 0, setup: function() {}},

      {location: 'built-in', type: 'alerttone', deletable: false, listIndex: 2,
       setup: function() {}},

      {location: 'custom', type: 'ringtone', deletable: true, listIndex: 1,
       setup: function() {
         // Inject a custom ringtone, then close and reopen the app to show it.
         app.inManager(soundPanel, function(container) {
           container.addCustomRingtone({
             name: 'My ringtone', subtitle: 'Bob\'s Ringtones', blob: {
               name: 'my_ringtone.mp3'
             }
           });
           container.backButton.tap(25, 25);
         });
      }},

      {location: 'sd card', type: 'ringtone', deletable: true, listIndex: 1,
       setup: function() {
         sd_card.injectTone(client, {
           type: 'ringtone', filePath: 'test_media/samples/Music/b2g.ogg'
         });
      }},

      {location: 'sd card', type: 'alerttone', deletable: true, listIndex: 3,
       setup: function() {
         sd_card.injectTone(client, {
           type: 'alerttone', filePath: 'test_media/samples/Music/b2g.ogg'
         });
      }}
    ];

    toneInfos.forEach(function(info) {
      suite('Actions for ' + info.location + ' ' + info.type, function() {

        setup(info.setup);

        test('Open action menu', function() {
          app.inManager(soundPanel, function(container) {
            var list = container.soundLists[info.listIndex];
            var actionsMenu = list.sounds[0].openActions();

            assert.equal(actionsMenu.shareButton.getAttribute('data-l10n-id'),
                         'actions-share-' + info.type);
            assert.equal(actionsMenu.shareButton.displayed(), true,
                         'Share button should be displayed');
            assert.equal(actionsMenu.deleteButton.getAttribute('data-l10n-id'),
                         'actions-delete-' + info.type);
            assert.equal(actionsMenu.deleteButton.displayed(), info.deletable,
                         'Delete button should be ' +
                         (info.deletable ? 'displayed' : 'hidden'));
         });
        });

        test('Share ringtone', function() {
          app.inManager(soundPanel, function(container) {
            var list = container.soundLists[info.listIndex];
            // Make sure we get at least as far as being able to share to the
            // SMS app. XXX: Later, this could be more detailed and actually
            // check that the right data was sent...
            var actionsMenu = list.sounds[0].openActions();
            actionsMenu.shareButton.tap();

            // Make sure we can't share with ourselves, since that's weird.
            assert.equal(actionsMenu.shareWith('Ringtones'), null,
                         'Ringtones app shouldn\'t be in Share menu');

            // Share with the messages app.
            actionsMenu.shareWith('Messages').tap();
          });
        });

        if (info.deletable) {
          test('Delete ringtone', function() {
            var numTones;
            app.inManager(soundPanel, function(container) {
              var list = container.soundLists[info.listIndex];
              numTones = list.sounds.length;

              var actionsMenu = list.sounds[0].openActions();
              actionsMenu.deleteButton.tap();
              var dialog = actionsMenu.waitForDialog();
              dialog.cancelButton.tap();
              assert.equal(list.sounds.length, numTones,
                           'Tone should not have been deleted');

              actionsMenu = list.sounds[0].openActions();
              actionsMenu.deleteButton.tap();
              dialog = actionsMenu.waitForDialog();
              dialog.confirmButton.tap();
              assert.equal(list.sounds.length, numTones - 1,
                           'Tone should have been deleted');

              container.backButton.tap(25, 25);
            });

            app.inManager(soundPanel, function(container) {
              var list = container.soundLists[info.listIndex];
              assert.equal(list.sounds.length, numTones - 1,
                           'Tone should have remained deleted');
            });
          });
        }

      });
    });
  });

});
