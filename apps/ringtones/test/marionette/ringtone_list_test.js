/* jshint node: true*/
/* global marionette, setup, suite, test*/
'use strict';

var Ringtones = require('./lib/ringtones');
var Settings = require('../../../settings/test/marionette/app/app');
var assert = require('assert');

marionette('Ringtones App > Sounds list', function() {
  
  var client = marionette.client();
  var settingsApp;
  var soundPanel;
  var app;
  var SETTINGS_URL = 'app://settings.gaiamobile.org';

  function switchAppToURL(client, URL) {
    client.switchToFrame();
    client.apps.switchToApp(URL);
  }

  setup(function() {
    settingsApp = new Settings(client);
    app = new Ringtones(client);
    client.contentScript.inject(__dirname +
      '/lib/mocks/mock_navigator_moztelephony.js');
    settingsApp.launch();
    // Navigate to the sound menu
    soundPanel = settingsApp.soundPanel;
  });

  // We want to run the same tests on both the alerttones and ringtones,
  // so we'll write the tests once and then generate a pair of suites.
  var suiteInfos = [
    {
      name: 'Alerttone Flow',
      opener: 'inAlertTones',
      type: 'alert',
      toneNames: ['none', 'bell']
    },
    {
      name: 'Ringtone Flow',
      opener: 'inRingTones',
      type: 'ring',
      toneNames: ['classic prism', 'classic courier']
    }
  ];

  suiteInfos.forEach(function(suiteInfo) {
    suite(suiteInfo.name, function() {
      test('Load list of sounds', function() {
        app[suiteInfo.opener](soundPanel, function(container) {
          assert.ok(container.defaultSoundsList,
                    'Sound list successfully loaded');
        });
      });

      test('Sounds list length > 0', function() {
        app[suiteInfo.opener](soundPanel, function(container) {
          assert.ok(container.getDefaultSoundsList().length > 0,
                    'Sound list is not empty');
        });
      });

      test('Select second sound in list', function() {
        app[suiteInfo.opener](soundPanel, function(container) {
          //Select second sound
          container.selectSound(1);
          // Get selected sound name
          var sound = container.getSelectedSound(1);
          assert.strictEqual(sound.toLowerCase(), suiteInfo.toneNames[1]);
        });
      });

      test('Set selected sound in settings sound panel', function() {
        app[suiteInfo.opener](soundPanel, function(container) {
          //Select second sound
          container.selectSound(1);
          container.tapBackButton();
          switchAppToURL(client, SETTINGS_URL);

          var text = soundPanel.getSelectedTone(suiteInfo.type);
          assert.strictEqual(text.toLowerCase(), suiteInfo.toneNames[1]);
        });
      });

      test('Set first option from list in settings sound panel', function() {
        app[suiteInfo.opener](soundPanel, function(container) {
          //Select first option
          container.selectSound(0);
          container.tapBackButton();
          switchAppToURL(client, SETTINGS_URL);

          var text = soundPanel.getSelectedTone(suiteInfo.type);
          assert.strictEqual(text.toLowerCase(), suiteInfo.toneNames[0]);
        });
      });

    });
  });
});
