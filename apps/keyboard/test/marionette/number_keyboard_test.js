'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert');

marionette('Number keyboard input tests', function() {
  var apps = {};
  var keyboardTestApp = null;
  var keyboard = null;
  var client = null;
  var system = null;

  apps[KeyboardTestApp.ORIGIN] = __dirname + '/apps/keyboardtestapp';

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
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    keyboard =  new Keyboard(client);
    keyboardTestApp = new KeyboardTestApp(client);

    keyboard.waitForKeyboardReady();

    keyboardTestApp.launch();
    keyboardTestApp.switchTo();
    keyboardTestApp.numberInput.tap();

    keyboard.switchTo();
  });

  test('Should be number layout', function() {
    assert.equal(
      keyboard.getCurrentKeyboardLayout(), Keyboard.TypeGroupMap.number);
  });

  test('Alphabet should not present on keyboard', function() {
    var testAlphabetKey = 'a';

    assert.equal(keyboard.isKeyPresent(testAlphabetKey), false);
  });

  test('Type 1', function() {
    var inputString = '1';
    keyboard.type(inputString);
    keyboardTestApp.switchTo();

    assert.equal(
      keyboardTestApp.numberInput.getAttribute('value'), inputString);
  });

  test('Type 7997979979', function() {
    var inputString = '7997979979';
    keyboard.type(inputString);
    keyboardTestApp.switchTo();

    assert.equal(
      keyboardTestApp.numberInput.getAttribute('value'), inputString);
  });
});
