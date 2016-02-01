'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert');

marionette('Email keyboard input tests', function() {
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
    keyboardTestApp.emailInput.tap();

    keyboard.switchTo();
  });

  test('Should be email layout', function() {
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
