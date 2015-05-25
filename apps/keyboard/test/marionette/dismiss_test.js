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

  apps[KeyboardTestApp.ORIGIN] = __dirname + '/keyboardtestapp';

  var client = marionette.client({
    profile: {
      apps: apps,
      prefs: {
        'focusmanager.testmode': true
      }
    }
  });

  function longPressSpaceBar(time) {
    var spaceBarSelector = '.keyboard-type-container[data-active]' +
                           ' .keyboard-key[data-keycode="32"]';

    var spaceBar = client.findElement(spaceBarSelector);
    actions.longPress(spaceBar, time).perform();
  }

  setup(function() {
    actions = client.loader.getActions();
    systemInputMgmt = client.loader.getAppClass('system', 'input_management');
    system = client.loader.getAppClass('system');
    keyboard = new Keyboard(client);

    // create a keyboard test app
    keyboardTestApp = new KeyboardTestApp(client);
    keyboardTestApp.launch();
    keyboardTestApp.textInput.click();

    // Wait for the keyboard pop up and switch to it
    systemInputMgmt.waitForKeyboardFrameDisplayed();
    systemInputMgmt.switchToActiveKeyboardFrame();
  });

  test('Longpressing the space bar should dismiss the keyboard', function() {
    // The time needed for dismiss is 500ms.
    longPressSpaceBar(0.7);

    client.waitFor(function() {
      return !systemInputMgmt.keyboardFrameDisplayed();
    });

    assert.ok(true);
  });

  test('Longpressing for only 0.5 sec should not dimiss keyboard', function() {
    longPressSpaceBar(0.5);

    var keyboardContainer =
      client.findElement('.keyboard-type-container[data-active]');

    assert.ok(keyboardContainer.displayed());
  });

  test('Click on a non-input field, should dimiss keyboard', function() {
    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);

    keyboardTestApp.nonInputArea.click();

    client.waitFor(function() {
      return !systemInputMgmt.keyboardFrameDisplayed();
    });

    assert.ok(true);
  });

  test('Pressing [Home] button should dimiss keyboard', function() {
    system.tapHome();

    client.waitFor(function() {
      return !systemInputMgmt.keyboardFrameDisplayed();
    });

    assert.ok(true);
  });
});
