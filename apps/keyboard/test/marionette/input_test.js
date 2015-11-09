/* global suite */

'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Dialog = require('../../../system/test/marionette/lib/dialog'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert');

marionette('Input with Keyboard APP', function() {
  var apps = {};
  var keyboardTestApp = null;
  var systemInputMgmt = null;
  var keyboard = null;
  var client = null;
  var typeGroupMap = {
    'text': 'text',
    'textarea': 'text',
    'url': 'url',
    'email': 'email',
    'password': 'password',
    'search': 'text',
    'number': 'number',
    'tel': 'number'
  };

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
    }
  });

  setup(function() {
    keyboard =  new Keyboard(client);
    systemInputMgmt = client.loader.getAppClass('system', 'input_management');

    // create a keyboard test app
    keyboardTestApp = new KeyboardTestApp(client);
    keyboardTestApp.launch();
  });

  suite('input type tests', function() {
    setup(function() {
      // Switch to test app frame.
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);
    });

    test('number input', function() {
      keyboardTestApp.numberInput.tap();

      systemInputMgmt.waitForKeyboardFrameDisplayed();
      systemInputMgmt.switchToActiveKeyboardFrame();

      assert.equal(
        keyboard.getCurrentInputType(), typeGroupMap.number);
    });

    test('email input', function() {
      keyboardTestApp.emailInput.tap();

      systemInputMgmt.waitForKeyboardFrameDisplayed();
      systemInputMgmt.switchToActiveKeyboardFrame();

      assert.equal(
        keyboard.getCurrentInputType(), typeGroupMap.email);
    });
  });

  suite('<input type="text"> tests', function() {
    setup(function() {
      // Switch to test app frame.
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      keyboardTestApp.textInput.tap();

      // Wait for the keyboard pop up and switch to it
      systemInputMgmt.waitForKeyboardFrameDisplayed();
      systemInputMgmt.switchToActiveKeyboardFrame();
    });

    test('Type abc', function() {
      var inputString = 'abc';
      keyboard.type(inputString);

      // Switch to test app frame.
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal(
        inputString, keyboardTestApp.textInput.getAttribute('value'));
    });

    test('Type multiple alphabet', function() {
      var inputString = 'aGDsaIabcmvljdDFDFDDs śZîd';
      keyboard.type(inputString);

      // Switch to test app frame.
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal(
        inputString, keyboardTestApp.textInput.getAttribute('value'));
    });

    test('Type number and then alphabet', function() {
      var inputString = '123abc';
      keyboard.type(inputString);

      // Switch to test app frame.
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal(
        inputString, keyboardTestApp.textInput.getAttribute('value'));
    });

    test('Type alphabet and then number', function() {
      var inputString = 'abc123';
      keyboard.type(inputString);

      // Switch to test app frame.
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal(
        inputString, keyboardTestApp.textInput.getAttribute('value'));
    });

    test('Type symbols', function() {
      var inputString = 'aG1 !@#$&*-_/(),.:;"\'?[]{}<>+=`^~|\\%';
      keyboard.type(inputString);

      // Switch to test app frame.
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal(
        inputString, keyboardTestApp.textInput.getAttribute('value'));
    });
  });

  suite('<input type="number"> tests', function() {
    setup(function() {
      // Switch to test app frame.
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      keyboardTestApp.numberInput.tap();

      // Wait for the keyboard pop up and switch to it
      systemInputMgmt.waitForKeyboardFrameDisplayed();
      systemInputMgmt.switchToActiveKeyboardFrame();
    });

    test('Type 123', function() {
      var inputString = '123';
      keyboard.type(inputString);

      // Switch to test app frame.
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal(
        inputString, keyboardTestApp.numberInput.getAttribute('value'));
    });
  });

  suite('<input type="email"> tests', function() {
    setup(function() {
      // Switch to test app frame.
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      keyboardTestApp.emailInput.tap();

      // Wait for the keyboard pop up and switch to it
      systemInputMgmt.waitForKeyboardFrameDisplayed();
      systemInputMgmt.switchToActiveKeyboardFrame();
    });

    test('Type post@mydomain.com', function() {
      keyboard.type('post');

      // Switch to test app frame.
      client.switchToFrame();

      client.apps.switchToApp(KeyboardTestApp.ORIGIN);
      keyboardTestApp.emailInput.tap();
      systemInputMgmt.waitForKeyboardFrameDisplayed();
      systemInputMgmt.switchToActiveKeyboardFrame();

      keyboard.type('@');
      keyboard.type('mydomain.com');

      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal(
        keyboardTestApp.emailInput.getAttribute('value'), 'post@mydomain.com');
    });
  });

  suite('<textarea> tests', function() {
    setup(function() {
      // Switch to test app frame.
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      // Focus on a textarea
      keyboardTestApp.textareaInput.tap();

      client.switchToFrame();
      systemInputMgmt.switchToActiveKeyboardFrame();
    });

    test('Type Abc', function() {
      var inputString = 'Abc';
      keyboard.type(inputString.substring(0, 1));

      // Make sure it would switch to lower case mode
      var shiftKey = keyboard.shiftKey;
      client.waitFor(function() {
        return (shiftKey.getAttribute('aria-pressed') === 'false');
      });

      keyboard.type(inputString.substring(1));

      // Switch to test app frame.
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

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
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

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
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal('As  ', keyboardTestApp.textareaInput.getAttribute('value'));
    });
  });

  suite('autocorrect tests', function() {
    setup(function() {
      // Switch to test app frame.
      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      // Focus on a textarea
      keyboardTestApp.textInput.tap();

      client.switchToFrame();
      systemInputMgmt.switchToActiveKeyboardFrame();
    });

    test('toggle autocorrect setting', function() {
      assert(keyboard.autoCorrect, true);

      keyboard.autoCorrct = false; 
      assert(keyboard.autoCorrect, false);

      keyboard.autoCorrct = true; 
      assert(keyboard.autoCorrect, true);
    });

    test('predictive key', function() {
      keyboard.autoCorrct = true; 

      // Test 1 - type first 7 letters of the expected word
      var expectedWord = 'keyboard';
      keyboard.type(expectedWord.slice(0, 7));
      keyboard.tapFirstPredictiveWord();

      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), expectedWord);

      // Test 2 - tap second suggestion, then press space
      client.switchToFrame();
      systemInputMgmt.switchToActiveKeyboardFrame();
      keyboard.type(' ');
      keyboard.type('Tes');

      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'keyboard Tes');

      client.switchToFrame();
      systemInputMgmt.switchToActiveKeyboardFrame();
      keyboard.tapSuggestionKey('Tea');
      keyboard.type(' ');

      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'keyboard Tea ');

      // Test 3 - type something with autocorrect and press space
      client.switchToFrame();
      systemInputMgmt.switchToActiveKeyboardFrame();
      keyboard.type('ye ');

      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'keyboard Tea he ');

      // Test 4 - autocorrect, dot and backspace
      client.switchToFrame();
      systemInputMgmt.switchToActiveKeyboardFrame();
      keyboard.type('wot.');

      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 
        'keyboard Tea he wit.');

      client.switchToFrame();
      systemInputMgmt.switchToActiveKeyboardFrame();
      keyboard.tapBackspaceKey();

      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'keyboard Tea he wot');
    });

    test('bug 1073870', function() {
      keyboard.autoCorrct = true; 
      keyboard.type('Hello worl');

      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      client.executeScript(
        'var el = document.activeElement;' +
        'el.selectionStart = el.selectionEnd = 5;');

      client.switchToFrame();
      systemInputMgmt.switchToActiveKeyboardFrame();
      keyboard.type(' ');

      client.switchToFrame();
      client.apps.switchToApp(KeyboardTestApp.ORIGIN);

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'Hello  worl');
    });
  });



  var dialog;

  test('type into an window.prompt() dialog and hit enter', function() {
    dialog = new Dialog(client);

    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);

    // Trigger prompt
    keyboardTestApp.triggerPromptModalDialog();

    // Tap on the prompt input
    client.switchToFrame();
    dialog.promptInput.tap();

    // Type
    systemInputMgmt.waitForKeyboardFrameDisplayed();
    systemInputMgmt.switchToActiveKeyboardFrame();
    keyboard.type('lazy dog.');
    keyboard.getKey('\u000d').tap();

    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);

    assert.equal('lazy dog.', keyboardTestApp.promptResult.text());
  });
});
