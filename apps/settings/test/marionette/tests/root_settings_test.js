/* global require, marionette, test, setup */
'use strict';
var Settings = require('../app/app'),
    assert = require('assert');

marionette('check root panel settings', function() {
  var client = marionette.client();
  var settingsApp;
  var rootPanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    rootPanel = settingsApp.rootPanel;
  });

  test('check battery description is valid', function() {
    assert.ok(rootPanel.isBatteryDescValid);
  });

  test('language description on the root panel is translated', function() {
    var languagePanel = settingsApp.languagePanel;

    languagePanel.currentLanguage = 'french';
    languagePanel.back();
    assert.ok(rootPanel.isLanguageDescTranslated('french'));

    languagePanel = settingsApp.languagePanel;
    languagePanel.currentLanguage = 'english';
    languagePanel.back();
    assert.ok(rootPanel.isLanguageDescTranslated('english'));

    languagePanel = settingsApp.languagePanel;
    languagePanel.currentLanguage = 'traditionalChinese';
    languagePanel.back();
    assert.ok(rootPanel.isLanguageDescTranslated('traditionalChinese'));
  });

});
