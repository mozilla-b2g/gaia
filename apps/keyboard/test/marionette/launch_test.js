'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert');

marionette('show Keyboard APP', function() {
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

  test('should show lowercase layout', function() {
    // XXX: Workaround
    // To get the #keyboard element to instead of the body element.
    // The value of `client.findElement('body').displayed()` could not be true
    // when the keyboard app is show up in the screen currently.
    // Please refer to http://bugzil.la/995865.
    var keyboardContainer =
      client.findElement('.keyboard-type-container[data-active]');
    assert.ok(keyboardContainer.displayed());

    var shiftKey = keyboard.shiftKey;
    assert.ok(shiftKey.getAttribute('aria-pressed') === 'false');

    var alphaKey = keyboard.getKey('a');
    assert.ok(alphaKey.displayed());
  });

  test('switch between inputs w/o waiting for layout loading', function() {
    var keyboardContainer =
      client.findElement('.keyboard-type-container[data-active]');
    assert.ok(keyboardContainer.displayed());

    var shiftKey = keyboard.shiftKey;
    var alphaKey = keyboard.getKey('a');

    assert.ok(shiftKey.getAttribute('aria-pressed') === 'false');
    assert.ok(alphaKey.displayed());

    // Switch to test app frame.
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);

    // Focus on the 2nd input
    keyboardTestApp.textInput2.click();

    // Without waiting for the keyboard, focus the 3rd input
    keyboardTestApp.textInput3.click();

    // Switch back to keyboard
    client.switchToFrame();
    systemInputMgmt.switchToActiveKeyboardFrame();

    // Should remain, or switched back to alpha keyboard.
    client.waitFor(function() {
      return alphaKey.displayed();
    });

    // Since the 3rd input is a <textarea>,
    // we should reach upper case at this point.
    client.waitFor(function() {
      return (shiftKey.getAttribute('aria-pressed') === 'true');
    });
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

    systemInputMgmt.switchToActiveKeyboardFrame();

    var keyboardContainer =
      client.findElement('.keyboard-type-container[data-active]');

    assert.ok(keyboardContainer.displayed());
  });
});
