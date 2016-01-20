'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Dialog = require('../../../system/test/marionette/lib/dialog'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert');

marionette('Text keyboard input tests', function() {
  var apps = {};
  var keyboardTestApp = null;
  var keyboard = null;
  var systemInputMgmt = null;
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
    systemInputMgmt = client.loader.getAppClass('system', 'input_management');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    keyboard =  new Keyboard(client);
    keyboardTestApp = new KeyboardTestApp(client);

    keyboard.waitForKeyboardReady();

    keyboardTestApp.launch();
    keyboardTestApp.switchTo();
    keyboardTestApp.textInput.tap();

    keyboard.switchTo();
  });

  test('Type abc', function() {
    var inputString = 'abc';
    keyboard.type(inputString);
    keyboardTestApp.switchTo();

    assert.equal(
      keyboardTestApp.textInput.getAttribute('value'), inputString);
  });

  test('Type multiple alphabet', function() {
    var inputString = 'aGDsaIabcmvljdDFDFDDs śZîd';
    keyboard.type(inputString);
    keyboardTestApp.switchTo();

    assert.equal(
      keyboardTestApp.textInput.getAttribute('value'), inputString);
  });

  test('Type number and then alphabet', function() {
    var inputString = '123abc';
    keyboard.type(inputString);
    keyboardTestApp.switchTo();

    assert.equal(
      keyboardTestApp.textInput.getAttribute('value'), inputString);
  });

  test('Type alphabet and then number', function() {
    var inputString = 'abc123';
    keyboard.type(inputString);
    keyboardTestApp.switchTo();

    assert.equal(
      keyboardTestApp.textInput.getAttribute('value'), inputString);
  });

  test('Type symbols', function() {
    var inputString = 'aG1 !@#$&*-_/(),.:;"\'?[]{}<>+=`^~|\\%';
    keyboard.type(inputString);
    keyboardTestApp.switchTo();

    assert.equal(
      keyboardTestApp.textInput.getAttribute('value'), inputString);
  });

  var dialog;

  test('Type into an window.prompt() dialog and hit enter', function() {
    // Hide keyboard before click prompt
    keyboardTestApp.switchTo();
    keyboardTestApp.nonInputArea.tap();
    client.waitFor(() => {
      return !systemInputMgmt.keyboardFrameDisplayed();
    });

    dialog = new Dialog(client);

    keyboardTestApp.switchTo();
    keyboardTestApp.triggerPromptModalDialog();
    client.switchToFrame();

    dialog.promptInput.tap();
    keyboard.switchTo();
    keyboard.type('lazy dog.');
    keyboard.getKey('\u000d').tap();

    keyboardTestApp.switchTo();

    assert.equal('lazy dog.', keyboardTestApp.promptResult.text());
  });
});
