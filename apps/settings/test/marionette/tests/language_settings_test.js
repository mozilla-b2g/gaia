/* global require, marionette, test, setup */
'use strict';

var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate language settings', function() {
  var client = marionette.client();
  var settingsApp;
  var languagePanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    languagePanel = settingsApp.languagePanel;
    languagePanel.setupDefaultLanguage();
  });

  test('label in the panel is translated.', function() {
    languagePanel.currentLanguage = 'traditionalChinese';
    assert.equal(languagePanel.currentLanguage, 'traditionalChinese');

    languagePanel.currentLanguage = 'english';
    assert.equal(languagePanel.currentLanguage, 'english');

    languagePanel.currentLanguage = 'french';
    assert.equal(languagePanel.currentLanguage, 'french');
  });

  test('mozSettings value is correct', function() {
    languagePanel.currentLanguage = 'french';
    assert.equal(languagePanel.currentLanguageFromMozSettings, 'fr');

    languagePanel.currentLanguage = 'english';
    assert.equal(languagePanel.currentLanguageFromMozSettings, 'en-US');

    languagePanel.currentLanguage = 'traditionalChinese';
    assert.equal(languagePanel.currentLanguageFromMozSettings, 'zh-TW');
  });

  test('sample format is translated', function() {
    languagePanel.currentLanguage = 'french';
    assert.ok(languagePanel.isSampleFormatTranslated('french'));

    languagePanel.currentLanguage = 'english';
    assert.ok(languagePanel.isSampleFormatTranslated('english'));

    languagePanel.currentLanguage = 'traditionalChinese';
    assert.ok(languagePanel.isSampleFormatTranslated('traditionalChinese'));
  });
});
