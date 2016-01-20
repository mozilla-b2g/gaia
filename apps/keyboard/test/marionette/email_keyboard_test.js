/* global suite */

'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert');

marionette('Email keyboard input tests', function() {
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

  suite('<input type="email"> tests', function() {
    setup(function() {
      keyboardTestApp.switchTo();
      keyboardTestApp.emailInput.tap();

      keyboard.switchTo();
    });

    test('should be email layout', function() {
      var atSymbol = '@';
      var commaSymbol = ',';

      assert.equal(keyboard.isKeyPresent(atSymbol), true);

      assert.equal(keyboard.isKeyPresent(commaSymbol), false);
    });

    test('Type post@mydomain.com', function() {
      keyboard.type('post');

      keyboardTestApp.switchTo();
      keyboardTestApp.emailInput.tap();
      keyboard.switchTo();

      keyboard.type('@');
      keyboard.type('mydomain.com');

      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.emailInput.getAttribute('value'), 'post@mydomain.com');
    });

    test('Type post123@mydomain.com', function() {
      keyboard.type('post123');
      keyboard.type('@');
      keyboard.type('mydomain.com');

      keyboardTestApp.switchTo();

      assert.equal(
        keyboardTestApp.emailInput.getAttribute('value'),
        'post123@mydomain.com');
    });

  });
});
