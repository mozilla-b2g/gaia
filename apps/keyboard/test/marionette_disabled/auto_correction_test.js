/* global suite */

'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Keyboard = require('./lib/keyboard'),
    KeyboardSettings = require('./lib/keyboard_settings'),
    assert = require('assert');


marionette('Keyboard Auto correction tests', function() {
  var apps = {};
  var keyboardTestApp = null;
  var keyboard = null;
  var keyboardSettings = null;
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
        'ftu.manifestURL': null,
        'keyboard.autocorrect': true
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    keyboard =  new Keyboard(client);
    keyboardSettings = new KeyboardSettings(client);
    keyboardTestApp = new KeyboardTestApp(client);

    keyboard.waitForKeyboardReady();
  });

  suite('AutoCorrect switch', function() {
    setup(function() {
      keyboardSettings.launch();
    });

    test('Auto correct switch should equal to settings context',
         function() {
      var currentSwitch = client.settings.get('keyboard.autocorrect');

      keyboardSettings.switchTo();

      // Toggle one time
      keyboardSettings.clickAutoCorrectOption();
      assert.equal(keyboardSettings.autoCorrect, !currentSwitch);

      // Toggle again
      keyboardSettings.clickAutoCorrectOption();
      assert.equal(keyboardSettings.autoCorrect, !!currentSwitch);
    });
  });

  suite('With autocorrect on', function() {
    setup(function () {
      keyboardTestApp.launch();
      keyboardTestApp.switchTo();
      keyboardTestApp.textInput.tap();

      keyboard.switchTo();
    });

    test('Predictive tests', function() {
      // Test 1 - type first 7 letters of the expected word
      // select suggestion will append a space.
      var expectedWord = 'keyboard ';
      keyboard.type(expectedWord.slice(0, 7));
      keyboard.tapAutoCorrectWord();
      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), expectedWord);

      // Test 2 - tap second suggestion, then press space
      keyboard.switchTo();
      keyboard.type('Tes');
      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'keyboard Tes');

      keyboard.switchTo();
      keyboard.tapSuggestionWord('Tea');
      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'keyboard Tea ');

      // Test 3 - type something with autocorrect and press space
      keyboard.switchTo();
      keyboard.type('ye ');
      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'keyboard Tea he ');

      // Test 4 - autocorrect, dot and backspace
      keyboard.switchTo();
      keyboard.type('wot.');
      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'),
        'keyboard Tea he wit.');

      keyboard.switchTo();
      keyboard.tapBackspaceKey();
      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'keyboard Tea he wot');
    });

    // For Bug 1073870
    test('Move caret before autocorrect', function() {
      keyboard.type('Hello worl');
      keyboardTestApp.switchTo();

      client.executeScript(
        'var el = document.activeElement;' +
        'el.selectionStart = el.selectionEnd = 5;');

      keyboard.switchTo();
      keyboard.type(' ');

      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'Hello  worl');
    });
  });

  suite('With autocorrect off', function() {
    setup(function () {
      client.settings.set('keyboard.autocorrect', false); 

      keyboardTestApp.launch();
      keyboardTestApp.switchTo();
      keyboardTestApp.textInput.tap();

      keyboard.switchTo();
    });

    test('No autocorrect while typing', function() {
      keyboard.type('Tes');
      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'Tes');

      keyboard.switchTo();
      keyboard.tapSuggestionWord('Tea');
      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'Tea ');

      keyboard.switchTo();
      keyboard.type('ye.');
      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'Tea ye.');

      keyboard.switchTo();
      keyboard.tapBackspaceKey();
      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'Tea ye');
    });
  });
});
