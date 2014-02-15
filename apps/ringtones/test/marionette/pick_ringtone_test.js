/* jshint node: true*/
/* global marionette, setup, suite, test*/
'use strict';

var Ringtones = require('./lib/ringtones');
var Settings = require('../../../settings/test/marionette/app/app');
var assert = require('assert');

marionette('Ringtones > Pick Activity', function() {
  
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

  });

  suite('Ringtones > pick activity: ', function() {

    test('Default ringtone on first time load', function() {
      settingsApp.launch();
      // Navigate to the sound menu
      soundPanel = settingsApp.soundPanel;

      var text = soundPanel.getSelectedRingTone();
      assert.strictEqual(text.toLowerCase(), 'change');
    });

    test('Load list of ringtones', function() {
      settingsApp.launch();
      // Navigate to the sound menu
      soundPanel = settingsApp.soundPanel;
      soundPanel.clickRingToneSelect();
      switchAppToURL(client, Ringtones.URL);

      assert.ok(
        app.soundsList,
        'Ring tones successfully loaded'
      );
    });

    test('Ringtones list length > 0', function() {
      settingsApp.launch();
      // Navigate to the sound menu
      soundPanel = settingsApp.soundPanel;
      soundPanel.clickRingToneSelect();
      switchAppToURL(client, Ringtones.URL);

      assert.ok(
        app.getSoundsList().length > 0,
        'Ring tones list is not empty'
      );
    });

    test('Select first ringtone', function() {
      settingsApp.launch();
      // Navigate to the sound menu
      soundPanel = settingsApp.soundPanel;
      soundPanel.clickRingToneSelect();
      switchAppToURL(client, Ringtones.URL);

      //Select first sound
      app.selectSound();
      // Get selected sound name
      var sound = app.getSelectedSound();
      assert.strictEqual(sound.toLowerCase(), 'classic prism');
    });

    test('Cancel Set Ringtone', function() {
      settingsApp.launch();
      // Navigate to the sound menu
      soundPanel = settingsApp.soundPanel;
      soundPanel.clickRingToneSelect();
      switchAppToURL(client, Ringtones.URL);

      //Select first sound
      app.selectSound();
      app.tapCancelButton();
      switchAppToURL(client, SETTINGS_URL);

      var text = soundPanel.getSelectedRingTone();
      assert.strictEqual(text.toLowerCase(), 'change');
    });

    test('Set new ringtone in sound panel', function() {
      settingsApp.launch();
      // Navigate to the sound menu
      soundPanel = settingsApp.soundPanel;
      soundPanel.clickRingToneSelect();
      switchAppToURL(client, Ringtones.URL);

      //Select first sound
      app.selectSound();
      app.tapDoneButton();
      switchAppToURL(client, SETTINGS_URL);

      var text = soundPanel.getSelectedRingTone();
      assert.strictEqual(text.toLowerCase(), 'classic prism');
    });
  });
});
