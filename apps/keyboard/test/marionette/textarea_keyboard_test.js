'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert');

marionette('Textarea keyboard input tests', function() {
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
    keyboardTestApp.textareaInput.tap();

    keyboard.switchTo();
  });

    test('Type Abc', function() {
    var inputString = 'Abc';
    keyboard.type(inputString.substring(0, 1));

    var shiftKey = keyboard.shiftKey;
    client.waitFor(function() {
      return (shiftKey.getAttribute('aria-pressed') === 'false');
    });
    keyboard.type(inputString.substring(1));

    keyboardTestApp.switchTo();

    assert.equal(
      keyboardTestApp.textareaInput.getAttribute('value'), inputString);
    });

    test('Double tapping space bar', function() {
    var inputString = 'Aa';
    keyboard.type(inputString);

    client.waitFor(() => {
      return keyboard.autoCorrectWord.displayed();
    });
    // type 2 spaces
    keyboard.type('  ');

    // Switch to test app frame.
    keyboardTestApp.switchTo();

    assert.equal(
      'As. ', keyboardTestApp.textareaInput.getAttribute('value'));
    });

    test('Tap space bar and then wait for a while before tapping again',
      function() {
    var inputString = 'Aa';
    keyboard.type(inputString);

    client.waitFor(() => {
      return keyboard.autoCorrectWord.displayed();
    });

    // type one space and then tap again after a while
    keyboard.type(' ');

    // The timeout for double tapping is set as 700ms.
    client.helper.wait(800);
    keyboard.type(' ');

    // Switch to test app frame.
    keyboardTestApp.switchTo();

    assert.equal('As  ', keyboardTestApp.textareaInput.getAttribute('value'));
  });
});
