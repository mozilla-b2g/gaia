'use strict';
var Settings = require('../../app/app');
var KeyboardApp = require('../../app/keyboard_app');
var assert = require('assert');

marionette('manipulate keyboard settings', function() {
  var client = marionette.client();
  var settingsApp;
  var keyboardApp;
  var keyboardPanel;

  setup(function() {
    keyboardApp = new KeyboardApp(client);
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the keyboard menu
    keyboardPanel = settingsApp.keyboardPanel;
  });

  test('Launch built-in keyboard\'s settings page', function() {
    keyboardPanel.tapBuiltInKeyboardItem();

    keyboardApp.switchToSettings();
    keyboardApp.goBackToSettingsApp();

    // switch back to settings frame and verify
    settingsApp.switchTo();
    assert.equal(keyboardPanel.header.getAttribute('action'), 'back');

    // Check the icon is not shown as [X], which is for dialog style.
    assert.ok(!keyboardPanel.isDialog());
  });
});
