'use strict';
var Settings = require('../app/app');
var SettingsKeyboardApp = require('../app/keyboard_app');
var KeyboardTestApp = require(
  '../../../../keyboard/test/marionette/lib/keyboard_test_app');
var KeyboardApp = require('../../../../keyboard/test/marionette/lib/keyboard');
var assert = require('assert');

marionette('manipulate keyboard settings', function() {
  var client;
  var settingsApp;
  var settingsKeyboardApp;
  var keyboardTestApp;
  var keyboardApp;
  var keyboardPanel;
  var systemInputMgmt;
  var apps = {};

  apps[KeyboardTestApp.ORIGIN] =
    __dirname + '/../../../../keyboard/test/marionette/keyboardtestapp';
  client = marionette.client({
    profile: {
      apps: apps,
      prefs: {
        'focusmanager.testmode': true
      },
      settings: {
        'lockscreen.enabled': false,
        'ftu.manifestURL': null
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  setup(function() {
    settingsKeyboardApp = new SettingsKeyboardApp(client);
    settingsApp = new Settings(client);
    keyboardApp = new KeyboardApp(client);
    keyboardTestApp = new KeyboardTestApp(client);

    settingsApp.launch();
    // Navigate to the keyboard menu
    keyboardPanel = settingsApp.keyboardPanel;
  });

  test('Launch built-in keyboard\'s settings page', function() {
    keyboardPanel.tapBuiltInKeyboardItem();

    settingsKeyboardApp.switchToSettings();

    // Uncheck the vibration menu item and ensure mozSetting is set.
    settingsKeyboardApp.clickVibrationOption();
    assert.equal(settingsKeyboardApp.vibrationFromMozSettings, false);

    settingsKeyboardApp.goBackToSettingsApp();

    // switch back to settings frame and verify
    settingsApp.switchTo();
    assert.equal(keyboardPanel.header.getAttribute('action'), 'back');

    // Check the icon is not shown as [X], which is for dialog style.
    assert.ok(!keyboardPanel.isDialog());
  });

  test('Change keyboard language', function() {
    // Keyboard location of special character ñ
    var specialKeySelector = 'button[data-keycode-upper="209"]';

    // Tap 'Select Keyboards' button
    keyboardPanel.tapSelectKeyboards();

    // Select keyboard language, then click back to make it "stick"
    keyboardPanel.selectLayout('Espa\u00F1ol');
    keyboardPanel.tapBackButton();
    settingsApp.close();

    // Launch the keyboard test app to verify the keyboard layout
    keyboardTestApp.launch();
    keyboardTestApp.textInput.tap();

    // Switch to keyboard frame
    systemInputMgmt = client.loader.getAppClass('system', 'input_management');
    systemInputMgmt.waitForKeyboardFrameDisplayed();
    systemInputMgmt.switchToActiveKeyboardFrame();

    // Switch language, and check if keyboard language is indeed 'Es'
    // Need to wait for the change before making an assertion.
    keyboardApp.imeSwitchingKey.tap();
    client.waitFor(function() {
      return (keyboardApp.imeSwitchingKey.getAttribute('aria-label') === 'Es');
    });
    assert.equal(keyboardApp.imeSwitchingKey.getAttribute('aria-label'), 'Es');

    // Try typing the special character
    // The keyboardApp.type() method uses long-press, which is not normal user
    // behaviour, and English keyboard would also be able to type it out.
    client.waitFor(function() {
      return client.findElement(specialKeySelector).displayed();
    });
    client.findElement(specialKeySelector).tap();

    // Verify the typed key is correct
    client.switchToFrame();
    keyboardTestApp.launch();
    assert.equal(keyboardTestApp.textInput.getAttribute('value'), '\u00F1',
      '\u00F1 is typed out');
  });
});
