/* global suite */

'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Dialog = require('../../../system/test/marionette/lib/dialog'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert');

marionette('Text keyboard input tests', function() {
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
    keyboardTestApp = new KeyboardTestApp(client);

    keyboardTestApp.launch();
  });

  suite('<input type="text"> tests', function() {
    setup(function() {
      keyboardTestApp.switchTo();
      keyboardTestApp.textInput.tap();

      keyboard.switchTo();
    });

    test('Type abc', function() {
      var inputString = 'abc';
      keyboard.type(inputString);
      keyboardTestApp.switchTo();

      assert.equal(
        inputString, keyboardTestApp.textInput.getAttribute('value'));
    });

    test('Type multiple alphabet', function() {
      var inputString = 'aGDsaIabcmvljdDFDFDDs śZîd';
      keyboard.type(inputString);
      keyboardTestApp.switchTo();

      assert.equal(
        inputString, keyboardTestApp.textInput.getAttribute('value'));
    });

    test('Type number and then alphabet', function() {
      var inputString = '123abc';
      keyboard.type(inputString);
      keyboardTestApp.switchTo();

      assert.equal(
        inputString, keyboardTestApp.textInput.getAttribute('value'));
    });

    test('Type alphabet and then number', function() {
      var inputString = 'abc123';
      keyboard.type(inputString);
      keyboardTestApp.switchTo();

      assert.equal(
        inputString, keyboardTestApp.textInput.getAttribute('value'));
    });

    test('Type symbols', function() {
      var inputString = 'aG1 !@#$&*-_/(),.:;"\'?[]{}<>+=`^~|\\%';
      keyboard.type(inputString);
      keyboardTestApp.switchTo();

      assert.equal(
        inputString, keyboardTestApp.textInput.getAttribute('value'));
    });
  });

  suite('<textarea> tests', function() {
    setup(function() {
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
        inputString, keyboardTestApp.textareaInput.getAttribute('value'));
    });

    test('Double tapping space bar', function() {
      var inputString = 'Aa';
      keyboard.type(inputString);

      // type 2 spaces
      var space = keyboard.getKey(' ');
      space.tap();
      space.tap();

      // Switch to test app frame.
      keyboardTestApp.switchTo();

      assert.equal(
        'As. ', keyboardTestApp.textareaInput.getAttribute('value'));
    });

    test('tap space bar and then wait for a while before tapping again',
        function() {
      var inputString = 'Aa';
      keyboard.type(inputString);

      // type one space and then tap again after a while
      var space = keyboard.getKey(' ');
      space.tap();

      // The timeout for double tapping is set as 700ms.
      client.helper.wait(800);
      space.tap();

      // Switch to test app frame.
      keyboardTestApp.switchTo();

      assert.equal('As  ', keyboardTestApp.textareaInput.getAttribute('value'));
    });
  });

  var dialog;

  test('type into an window.prompt() dialog and hit enter', function() {
    dialog = new Dialog(client);

    // Switch to test app frame.
    keyboardTestApp.switchTo();

    // Trigger prompt
    keyboardTestApp.triggerPromptModalDialog();

    // Tap on the prompt input
    client.switchToFrame();
    dialog.promptInput.tap();

    // Type
    keyboard.switchTo();
    keyboard.type('lazy dog.');
    keyboard.getKey('\u000d').tap();

    // Switch to test app frame.
    keyboardTestApp.switchTo();

    assert.equal('lazy dog.', keyboardTestApp.promptResult.text());
  });
});
