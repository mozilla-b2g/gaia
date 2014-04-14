'use strict';

var KeyboardTests = require('./lib/keyboard_tests'),
    assert = require('assert');

var KEYBOARD_ORIGIN = 'app://keyboard.gaiamobile.org';
var browser_ORIGIN = 'app://browser.gaiamobile.org';
var urlBar = null;
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
    // keyboardtests = new KeyboardTests(client);
    // keyboardtests.launch();
    // keyboardtests.textInput.click(0, 0);
    client.apps.launch(browser_ORIGIN);
    client.apps.switchToApp(browser_ORIGIN);
    client.helper.waitForElement('#url-input');
    urlBar = client.findElement('#url-input');
    urlBar.click();
  });

  test('should show lowercase layout', function() {
    // switch to System app
    client.switchToFrame();
    console.log(client.screenshot());
    client.apps.switchToApp(KEYBOARD_ORIGIN);
    // XXX: Workaround to get the #keyboard element to instead of the body element.
    // The value of `client.findElement('body').displayed()` could not be true
    // when the keyboard app is show up in the screen currently.
    // Please refer to http://bugzil.la/995865.
    var keyboard = client.findElement('#keyboard');

    client.waitFor(function() {
      if (keyboard.displayed()) {
        assert.ok(true);
        return true;
      }
    });    
  });
});
