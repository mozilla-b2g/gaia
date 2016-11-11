'use strict';

var KeyboardTests = require('./lib/keyboard_tests'),
    assert = require('assert');

var KEYBOARD_ORIGIN = 'app://keyboard.gaiamobile.org';

marionette('Keyboard APP', function() {
  var apps = {},
      keyboardtests = null,
      client = null;

  apps[KeyboardTests.ORIGIN] = __dirname + '/keyboardtests';
  
  client = marionette.client({
    apps: apps,
    prefs: {
      'focusmanager.testmode': true
    }
  });

  setup(function() {
    keyboardtests = new KeyboardTests(client);
    keyboardtests.launch();
    keyboardtests.textInputElement.click();
  });

  test('launch keyboard test', function() {
    // switch to keyboard app
    client.switchToFrame();
    client.apps.switchToApp(KEYBOARD_ORIGIN);
    var keyboard = client.findElement('#keyboard');
    
    var isKeyboardDisplayed =  false;
    client.waitFor(function() {
      if (keyboard.displayed()) {
         isKeyboardDisplayed = true;
         return true;
      }
    });

    assert.ok(isKeyboardDisplayed);
  });

});
