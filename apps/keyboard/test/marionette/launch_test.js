'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert');

marionette('show Keyboard APP', function() {
  var apps = {},
      keyboardTestApp = null,
      keyboard = null,
      client = null;

  apps[KeyboardTestApp.ORIGIN] = __dirname + '/keyboardtestapp';

  client = marionette.client({
    apps: apps,
    prefs: {
      'focusmanager.testmode': true
    }
  });

  setup(function() {
    keyboard =  new Keyboard(client);

    // create a keyboard test app
    keyboardTestApp = new KeyboardTestApp(client);
    keyboardTestApp.launch();
    keyboardTestApp.textInput.click();

    // Wait for the keyboard pop up and switch to it
    keyboard.waitForDisplayed();
    keyboard.switchToActiveKeyboardFrame();
  });

  test('should show lowercase layout', function() {
    // XXX: Workaround
    // To get the #keyboard element to instead of the body element.
    // The value of `client.findElement('body').displayed()` could not be true
    // when the keyboard app is show up in the screen currently.
    // Please refer to http://bugzil.la/995865.
    var keyboardContainer =
      client.findElement('.keyboard-type-container[data-active]');

    assert.ok(keyboardContainer.displayed());
  });

  test('Touching the status bar should not dismiss keyboard', function() {
    // Click on the status bar
    client.switchToFrame();
    var statusbar = client.findElement('#statusbar');
    statusbar.click();

    client.helper.wait(3000);

    keyboard.switchToActiveKeyboardFrame();

    var keyboardContainer =
      client.findElement('.keyboard-type-container[data-active]');

    assert.ok(keyboardContainer.displayed());
  });
});
