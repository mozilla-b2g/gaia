'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    System = require('./lib/system'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert'),
    Actions = require('marionette-client').Actions;

marionette('Dimiss the keyboard', function() {
  var apps = {};
  var keyboardTestApp = null;
  var keyboard = null;
  var system = null;

  apps[KeyboardTestApp.ORIGIN] = __dirname + '/keyboardtestapp';

  var client = marionette.client({
    apps: apps,
    prefs: {
      'focusmanager.testmode': true
    }
  });

  var actions = new Actions(client);

  function longPressSpaceBar(time) {
    var spaceBarSelector = '.keyboard-type-container[data-active]' +
                           ' .keyboard-key[data-keycode="32"]';

    var spaceBar = client.findElement(spaceBarSelector);
    actions.longPress(spaceBar, time).perform();
  }

  setup(function() {
    system = new System(client);
    keyboard = new Keyboard(client);

    // create a keyboard test app
    keyboardTestApp = new KeyboardTestApp(client);
    keyboardTestApp.launch();
    keyboardTestApp.textInput.click();

    // Wait for the keyboard pop up and switch to it
    system.waitForKeyboardFrameDisplayed();
    system.switchToActiveKeyboardFrame();
  });

  test('Longpressing the space bar should dimiss the keyboard', function() {
    // The time needed for dimiss is 700ms.
    longPressSpaceBar(1.0);

    client.waitFor(function() {
      return !system.keyboardFrameDisplayed();
    });

    assert.ok(true);
  });

  test('Longpressing for only 0.5 sec should not dimiss keyboard', function() {
    longPressSpaceBar(0.5);

    var keyboardContainer =
      client.findElement('.keyboard-type-container[data-active]');

    assert.ok(keyboardContainer.displayed());
  });
});
