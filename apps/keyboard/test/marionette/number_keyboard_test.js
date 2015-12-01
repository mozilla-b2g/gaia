/* global suite */

'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert');

marionette('Number keyboard input tests', function() {
  var apps = {};
  var keyboardTestApp = null;
  var keyboard = null;
  var client = null;

  apps[KeyboardTestApp.ORIGIN] = __dirname + '/keyboardtestapp';

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
    keyboard =  new Keyboard(client);

    // create a keyboard test app
    keyboardTestApp = new KeyboardTestApp(client);
    keyboardTestApp.launch();
  });

  suite('<input type="number"> tests', function() {
    setup(function() {
      // Switch to test app frame.
      keyboardTestApp.switchTo();
      keyboardTestApp.numberInput.tap();
      // Wait for the keyboard pop up and switch to it
      keyboard.switchTo();
    });

    test('switch to number layout', function() {
      client.switchToFrame();

      assert.equal(
        keyboard.getCurrentKeyboard(), Keyboard.TypeGroupMap.number);
    });

    test('alphabet should not present on keyboard', function() {
      var testAlphabetKey = 'a';

      assert.equal(keyboard.isKeyPresent(testAlphabetKey), false);
    });

    test('Type 1', function() {
      var inputString = '1';
      keyboard.type(inputString);
      keyboardTestApp.switchTo();

      assert.equal(
        inputString, keyboardTestApp.numberInput.getAttribute('value'));
    });
  });
});
