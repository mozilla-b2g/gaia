/* jshint node: true*/
/* global marionette, setup, suite, test*/
'use strict';

var Ringtones = require('./lib/ringtones');
var Settings = require('../../../settings/test/marionette/app/app');
var assert = require('assert');

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

  var client = marionette.client();
  var settingsApp;
  var soundPanel;
  var app;

  setup(function() {
    settingsApp = new Settings(client);
    app = new Ringtones(client, settingsApp);

    client.contentScript.inject(__dirname +
      '/lib/mocks/mock_navigator_moz_telephony.js');

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

      test('Load list of sounds', function() {
        app[suiteInfo.opener](soundPanel, function(container) {
          var soundLists = container.soundLists;
          assert.equal(soundLists.length, 3,
                       'Should have found 3 sound lists');

          assert.equal(soundLists[0].header.getAttribute('data-l10n-id'),
                       'list-title-' + suiteInfo.type);
          var otherType = suiteInfo.type === 'alerttone' ?
                          'ringtone' : 'alerttone';
          assert.equal(soundLists[1].header.getAttribute('data-l10n-id'),
                       'list-title-custom');
          assert.equal(soundLists[2].header.getAttribute('data-l10n-id'),
                       'list-title-' + otherType);

          assert.notEqual(soundLists[0].sounds.length, 0,
                          'Built-in ' + suiteInfo.type +
                          ' list should not be empty');
          assert.equal(soundLists[1].sounds.length, 0,
                       'Custom ringtone list should be empty');
          assert.notEqual(soundLists[2].sounds.length, 0,
                          'Built-in ' + otherType +
                          ' list should not be empty');

          assert.equal(soundLists[0].displayed(), true,
                       'Built-in ' + suiteInfo.type +
                       ' list should be displayed');
          assert.equal(soundLists[1].displayed(), false,
                       'Custom ringtone list should be hidden');
          assert.equal(soundLists[2].displayed(), true,
                       'Built-in ' + otherType +
                       ' list should be displayed');

          assert.equal(soundLists[0].sounds[0].name === 'None',
                       suiteInfo.allowNone,
                       '"None" ringtone should ' +
                       (suiteInfo.allowNone ? '' : 'not ') +
                       'be shown');

          var getNames = function(element) {
            return element.name.toLocaleLowerCase();
          };
          for (var i = 0; i < 2; i++) {
            var names = soundLists[i].sounds.map(getNames);
            if (i === 0 && suiteInfo.allowNone) {
              names.shift();
            }

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
          container.backButton.tap();
        });

        app[suiteInfo.opener](soundPanel, function(container) {
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
          container.doneButton.tap();
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
          container.cancelButton.tap();
        });

        var buttonText = soundPanel.getSelectedTone(suiteInfo.type);
        assert.strictEqual(buttonText, originalButtonText);
      });

    });
  });
});
