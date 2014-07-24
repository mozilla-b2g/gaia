'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    System = require('./lib/system'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert');

marionette('show Keyboard APP', function() {
  var apps = {};
  var keyboardTestApp = null;
  var system = null;
  var keyboard = null;
  var client = null;

  apps[KeyboardTestApp.ORIGIN] = __dirname + '/keyboardtestapp';

  client = marionette.client({
    apps: apps,
    prefs: {
      'focusmanager.testmode': true
    }
  });

  setup(function() {
    keyboard =  new Keyboard(client);
    system =  new System(client);

    // create a keyboard test app
    keyboardTestApp = new KeyboardTestApp(client);
    keyboardTestApp.launch();
    keyboardTestApp.textInput.click();

    // Wait for the keyboard pop up and switch to it
    system.waitForKeyboardFrameDisplayed();
    system.switchToActiveKeyboardFrame();
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

  test('keys and buttons should be have aria-label set', function() {
    var returnKey = keyboard.returnKey;
    client.waitFor(function() {
      return (returnKey.getAttribute('aria-label') === 'return');
    });

    var dismissSuggestionsButton = keyboard.dismissSuggestionsButton;
    client.waitFor(function() {
      var label = dismissSuggestionsButton.getAttribute('aria-label');
      return (label === 'Dismiss');
    });
  });

  test('Touching the status bar should not dismiss keyboard', function() {
    // Click on the status bar
    client.switchToFrame();
    var topPanel = client.findElement('#top-panel');
    topPanel.click();

    client.helper.wait(3000);

    system.switchToActiveKeyboardFrame();

    var keyboardContainer =
      client.findElement('.keyboard-type-container[data-active]');

    assert.ok(keyboardContainer.displayed());
  });
});
