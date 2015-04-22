/* jshint node: true*/
/* global marionette, setup, suite, test*/
'use strict';

var Ringtones = require('../lib/ringtones');
var Settings = require('../../../../settings/test/marionette/app/app');
var assert = require('assert');
var sd_card = require('../lib/sd_card');

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

marionette('Ringtone picker', function() {

  var client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    }
  });
  var settingsApp;
  var soundPanel;
  var app;

  setup(function() {
    settingsApp = new Settings(client);
    app = new Ringtones(client, settingsApp);

    client.fileManager.removeAllFiles();

    client.contentScript.inject(__dirname +
      '/../lib/mocks/mock_navigator_moz_telephony.js');

    settingsApp.launch();
    soundPanel = settingsApp.soundPanel;
  });

  // We want to run the same tests on both the alerttones and ringtones,
  // so we'll write the tests once and then generate a pair of suites.
  var suiteInfos = [
    { name: 'Alert tones picker',
      opener: 'inAlertTones',
      type: 'alerttone',
      allowNone: true
    },
    { name: 'Ringtones picker',
      opener: 'inRingTones',
      type: 'ringtone',
      allowNone: false
    }
  ];

  suiteInfos.forEach(function(suiteInfo) {
    suite(suiteInfo.name, function() {
      var otherType = suiteInfo.type === 'alerttone' ? 'ringtone' : 'alerttone';

      test('Load list of sounds', function() {
        app[suiteInfo.opener](soundPanel, function(container) {
          var soundLists = container.soundLists;
          assert.equal(soundLists.length, 4,
                       'Should have found 4 sound lists, found ' +
                       soundLists.length);

          var expectedInfo = [
            {l10nID: 'section-title-builtin-' + suiteInfo.type, visible: true},
            {l10nID: 'section-title-custom-' + suiteInfo.type, visible: false},
            {l10nID: 'section-title-builtin-' + otherType, visible: true},
            {l10nID: 'section-title-custom-' + otherType, visible: false}
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
            if (i === 0 && suiteInfo.allowNone) {
              names.shift();
            }
            assert_sorted(names, 'Tones should be sorted by name');
          }

          // Make sure the "None" ringtone is listed first, if appropriate.
          assert.equal(soundLists[0].sounds[0].name === 'None',
                       suiteInfo.allowNone,
                       '"None" ringtone should ' +
                       (suiteInfo.allowNone ? '' : 'not ') +
                       'be shown');
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

        app[suiteInfo.opener](soundPanel, function(container) {
          var index = suiteInfo.type === 'ringtone' ? 1 : 3;
          var customRingtones = container.soundLists[index];
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

      test('Load sd card sound', function() {
        sd_card.injectTone(client, {
          type: suiteInfo.type, filePath: 'test_media/samples/Music/b2g.ogg'
        });
        app[suiteInfo.opener](soundPanel, function(container) {
          var customTones = container.soundLists[1];
          assert.equal(
            customTones.sounds.length, 1,
            'Custom ' + suiteInfo.type + ' list should have one item, found ' +
              customTones.sounds.length
          );
          assert.equal(
            customTones.displayed(), true,
            'Custom ' + suiteInfo.type + ' list should be displayed'
          );

          var customOtherTones = container.soundLists[3];
          assert.equal(
            customOtherTones.sounds.length, 0,
            'Custom ' + otherType + ' list should have no items, found ' +
              customOtherTones.sounds.length
          );
          assert.equal(
            customOtherTones.displayed(), false,
            'Custom ' + otherType + ' list should be hidden'
          );

          var myTone = customTones.sounds[0];
          assert.equal(myTone.name, 'b2g');
          assert.equal(myTone.subtitle, 'SD Card');
        });
      });

      test('Set selected sound', function() {
        var originalButtonText = soundPanel.getSelectedTone(suiteInfo.type);
        var toneIndex, toneName;

        app[suiteInfo.opener](soundPanel, function(container) {
          // Select the first sound with a different name from the current
          // button's text.
          var tone = container.soundLists[0].sounds[0];
          toneIndex = 0;
          if (tone.name === originalButtonText) {
            tone = container.soundLists[0].sounds[1];
            toneIndex = 1;
          }

          toneName = tone.name;
          tone.select();
          container.setButton.tap();
        });

        var buttonText = soundPanel.getSelectedTone(suiteInfo.type);
        assert.strictEqual(buttonText, toneName);

        // Check that reopening the picker selects the right sound.
        app[suiteInfo.opener](soundPanel, function(container) {
          assert.ok(container.soundLists[0].sounds[toneIndex].selected);
        });
      });

      test('Cancel setting selected sound', function() {
        var originalButtonText = soundPanel.getSelectedTone(suiteInfo.type);

        app[suiteInfo.opener](soundPanel, function(container) {
          // Select the first sound with a different name from the current
          // button's text.
          var tone = container.soundLists[0].sounds[0];
          if (tone.name === originalButtonText) {
            tone = container.soundLists[0].sounds[1];
          }

          tone.select();
          container.cancelButton.tap(25, 25);
        });

        var buttonText = soundPanel.getSelectedTone(suiteInfo.type);
        assert.strictEqual(buttonText, originalButtonText);
      });

    });
  });
});
