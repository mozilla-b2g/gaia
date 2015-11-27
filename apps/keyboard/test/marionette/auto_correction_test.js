/* global suite */

'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Keyboard = require('./lib/keyboard'),
    Settings = require('./lib/settings'),
    assert = require('assert');


marionette('Keyboard Auto correction tests', function() {
  var apps = {};
  var keyboardTestApp = null;
  var keyboard = null;
  var settings = null;
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
    }
  });

  setup(function() {
    keyboard =  new Keyboard(client);
    keyboardTestApp = new KeyboardTestApp(client);
    settings = new Settings(client);
  });

  suite('autocorrect toggle', function() {
    setup(function() {
      keyboard.launch();
      keyboard.switchToBuiltInSettings();
    });

    test('auto correct switch should equal to settings context',
         function() {
      var currentSwitch = keyboard.autocorrect;

      // Toggle one time
      keyboard.clickAutocorrectOption();
      assert.equal(keyboard.autocorrect, !currentSwitch);

      // Toggle again
      keyboard.clickAutocorrectOption();
      assert.equal(keyboard.autocorrect, !!currentSwitch);
    });

    test('re-open built-in settings', function() {
      var currentSwitch = keyboard.autocorrect;

      keyboard.clickAutocorrectOption();
      keyboard.goBackToSettingsApp();
      settings.close();

      assert.equal(keyboard.autocorrect, !currentSwitch);

      keyboard.launch();
      keyboard.switchToBuiltInSettings();
      keyboard.clickAutocorrectOption();

      assert.equal(keyboard.autocorrect, !!currentSwitch);
    });
  });

  suite('with autocorrect on', function() {
    setup(function () {
      if (!keyboard.autocorrect) {
        keyboard.launch();
        keyboard.switchToBuiltInSettings();
        keyboard.clickAutocorrectOption();
        keyboard.goBackToSettingsApp();
        settings.close();
      }

      keyboardTestApp.launch();
      keyboardTestApp.switchTo();
      keyboardTestApp.textInput.tap();

      keyboard.switchTo();
    });

    test('predictive tests', function() {
      // Test 1 - type first 7 letters of the expected word
      var expectedWord = 'keyboard';
      keyboard.type(expectedWord.slice(0, 7));
      keyboard.tapFirstPredictiveWord();
      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), expectedWord);

      // Test 2 - tap second suggestion, then press space
      keyboard.switchTo();
      keyboard.type(' ');
      keyboard.type('Tes');
      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'keyboard Tes');

      keyboard.switchTo();
      keyboard.tapSuggestionKey('Tea');
      keyboard.type(' ');
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
  });

  suite('with autocorrect off', function() {
    setup(function () {
      if (keyboard.autocorrect) {
        keyboard.launch();
        keyboard.switchToBuiltInSettings();
        keyboard.clickAutocorrectOption();
        keyboard.goBackToSettingsApp();
        settings.close();
      }

      keyboardTestApp.launch();
      keyboardTestApp.switchTo();
      keyboardTestApp.textInput.tap();

      keyboard.switchTo();
    });

    test('no autocorrect while texting', function() {
      keyboard.type('Tes');
      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.textInput.getAttribute('value'), 'Tes');

      keyboard.switchTo();
      keyboard.tapSuggestionKey('Tea');
      keyboard.type(' ');
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
