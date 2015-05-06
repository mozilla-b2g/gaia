'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert');

marionette('Input with Keyboard APP', function() {
  var apps = {};
  var keyboardTestApp = null;
  var systemInputMgmt = null;
  var keyboard = null;
  var client = null;

  apps[KeyboardTestApp.ORIGIN] = __dirname + '/keyboardtestapp';

  client = marionette.client({
    apps: apps,
    prefs: {
      'focusmanager.testmode': true
    },
    settings: {
      'lockscreen.enabled': false,
      'ftu.manifestURL': null
    }
  });

  setup(function() {
    keyboard =  new Keyboard(client);
    systemInputMgmt = client.loader.getAppClass('system', 'input_management');

    // create a keyboard test app
    keyboardTestApp = new KeyboardTestApp(client);
    keyboardTestApp.launch();
    keyboardTestApp.textInput.click();

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

    assert.equal(inputString, keyboardTestApp.textInput.getAttribute('value'));
  });

  test('Type Abc in textarea', function() {
    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);

    // Focus on a textarea
    keyboardTestApp.textInput3.click();

    client.switchToFrame();
    systemInputMgmt.switchToActiveKeyboardFrame();
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

    assert.equal(inputString, keyboardTestApp.textInput3.getAttribute('value'));
  });

  test('Type multiple alphabet', function() {
    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);


    client.switchToFrame();
    systemInputMgmt.switchToActiveKeyboardFrame();
    var inputString = 'aGDsaIabcmvljdDFDFDDs';
    keyboard.type(inputString);

    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);

    assert.equal(inputString, keyboardTestApp.textInput.getAttribute('value'));
  });

  test('Type number and then alphabet', function() {
    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);


    client.switchToFrame();
    systemInputMgmt.switchToActiveKeyboardFrame();
    var inputString = '123abc';
    keyboard.type(inputString);

    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);

    assert.equal(inputString, keyboardTestApp.textInput.getAttribute('value'));
  });

  test('Type alphabet and then number', function() {
    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);


    client.switchToFrame();
    systemInputMgmt.switchToActiveKeyboardFrame();
    var inputString = 'abc123';
    keyboard.type(inputString);

    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);

    assert.equal(inputString, keyboardTestApp.textInput.getAttribute('value'));
  });

  test('Type symbols', function() {
    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);


    client.switchToFrame();
    systemInputMgmt.switchToActiveKeyboardFrame();
    var inputString = 'aG1 !@#$&*-_/(),.:;"\'?[]{}<>+=`^~|\\%';
    keyboard.type(inputString);

    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);

    assert.equal(inputString, keyboardTestApp.textInput.getAttribute('value'));
  });

  test('Double tapping space bar in textarea', function() {
    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);

    // Focus on a textarea
    keyboardTestApp.textInput3.click();

    client.switchToFrame();
    systemInputMgmt.switchToActiveKeyboardFrame();

    var inputString = 'Aa';
    keyboard.type(inputString);

    // type 2 spaces
    var space = keyboard.getKey(' ');
    space.click();
    space.click();

    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);

    assert.equal('As. ', keyboardTestApp.textInput3.getAttribute('value'));
  });

  test('tap space bar and then wait for a while before tapping again',
      function() {
    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);

    // Focus on a textarea
    keyboardTestApp.textInput3.click();

    client.switchToFrame();
    systemInputMgmt.switchToActiveKeyboardFrame();

    var inputString = 'Aa';
    keyboard.type(inputString);

    // type one space and then tap again after a while
    var space = keyboard.getKey(' ');
    space.click();

    // The timeout for double tapping is set as 700ms.
    client.helper.wait(800);
    space.click();

    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);

    assert.equal('As  ', keyboardTestApp.textInput3.getAttribute('value'));
  });
});
