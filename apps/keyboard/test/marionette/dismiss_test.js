'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert');

marionette('Dimiss the keyboard', function() {
  var apps = {};
  var keyboardTestApp = null;
  var keyboard = null;
  var systemInputMgmt = null;
  var system = null;
  var actions;

  apps[KeyboardTestApp.ORIGIN] = __dirname + '/apps/keyboardtestapp';

  var client = marionette.client({
    profile: {
      apps: apps,
      prefs: {
        'focusmanager.testmode': true
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  setup(function() {
    systemInputMgmt = client.loader.getAppClass('system', 'input_management');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    actions = client.loader.getActions();

    keyboard = new Keyboard(client);
    keyboardTestApp = new KeyboardTestApp(client);

    keyboard.waitForKeyboardReady();

    keyboardTestApp.launch();
    keyboardTestApp.switchTo();
    keyboardTestApp.textInput.click();

    keyboard.switchTo();
  });

  test('Longpressing the space bar should dismiss the keyboard', function() {
    // The time needed for dismiss is 500ms.
    keyboard.longPressSpaceBar(0.7);

    client.waitFor(() => {
      return !systemInputMgmt.keyboardFrameDisplayed();
    });

    assert.ok(true);
  });

  test('Longpressing for only 0.5 sec should not dimiss keyboard', function() {
    keyboard.longPressSpaceBar(0.5);

    var keyboardContainer = keyboard.currentPanel;

    assert.ok(keyboardContainer.displayed());
  });

  test('Click on a non-input field, should dimiss keyboard', function() {
    keyboardTestApp.switchTo();
    keyboardTestApp.nonInputArea.click();

    client.waitFor(() => {
      return !systemInputMgmt.keyboardFrameDisplayed();
    });

    assert.ok(true);
  });

  test('Pressing [Home] button should dimiss keyboard', function() {
    system.tapHome();

    client.waitFor(() => {
      return !systemInputMgmt.keyboardFrameDisplayed();
    });

    assert.ok(true);
  });
});
