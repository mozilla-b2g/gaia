/* global require, marionette, test, setup */
'use strict';

var Settings = require('../app/app'),
    assert = require('assert');

marionette('change language and go back to the root panel', function() {
  var client = marionette.client();
  var settingsApp;
  var languagePanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    languagePanel = settingsApp.languagePanel;
    languagePanel.setupDefaultLanguage();
  });

  test('language description on the root panel is translated', function() {
    languagePanel.currentLanguage = 'french';
    languagePanel.back();
    assert.ok(settingsApp.isLanguageDescTranslated('french'));

    languagePanel = settingsApp.languagePanel;
    languagePanel.currentLanguage = 'english';
    languagePanel.back();
    assert.ok(settingsApp.isLanguageDescTranslated('english'));

    languagePanel = settingsApp.languagePanel;
    languagePanel.currentLanguage = 'traditionalChinese';
    languagePanel.back();
    assert.ok(settingsApp.isLanguageDescTranslated('traditionalChinese'));
  });
});
