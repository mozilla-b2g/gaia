'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app'),
    Keyboard = require('./lib/keyboard'),
    assert = require('assert');

marionette('Launch Keyboard APP', function() {
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
    keyboardTestApp.textInput.click();

    keyboard.switchTo();
  });

  test('Should show lowercase layout', function() {
    // XXX: Workaround
    // To get the #keyboard element to instead of the body element.
    // The value of `client.findElement('body').displayed()` could not be true
    // when the keyboard app is show up in the screen currently.
    // Please refer to http://bugzil.la/995865.
    var keyboardContainer = keyboard.currentPanel;
    assert.ok(keyboardContainer.displayed());

    var shiftKey = keyboard.shiftKey;
    assert.ok(shiftKey.getAttribute('aria-pressed') === 'false');

    var alphaKey = keyboard.getKey('a');
    assert.ok(alphaKey.displayed());
  });

  test('Switch between inputs w/o waiting for layout loading', function() {
    var keyboardContainer = keyboard.currentPanel;
    assert.ok(keyboardContainer.displayed());

    var shiftKey = keyboard.shiftKey;
    var alphaKey = keyboard.getKey('a');

    assert.ok(shiftKey.getAttribute('aria-pressed') === 'false');
    assert.ok(alphaKey.displayed());

    // Switch to test app frame.
    keyboardTestApp.switchTo();

    // Focus on the 2nd input
    keyboardTestApp.numberInput.click();

    // Without waiting for the keyboard, focus the 3rd input
    keyboardTestApp.textareaInput.click();

    // Switch back to keyboard
    keyboard.switchTo();

    // Should remain, or switched back to alpha keyboard.
    client.waitFor(() => {
      return alphaKey.displayed();
    });

    // Since the 3rd input is a <textarea>,
    // we should reach upper case at this point.
    client.waitFor(() => {
      return (shiftKey.getAttribute('aria-pressed') === 'true');
    });
  });

  test('Keys and buttons should be have aria-label set', function() {
    var returnKey = keyboard.returnKey;
    client.waitFor(() => {
      return (returnKey.getAttribute('aria-label') === 'return');
    });

    var dismissSuggestionsKey = keyboard.dismissSuggestionsKey;
    client.waitFor(() => {
      var label = dismissSuggestionsKey.getAttribute('aria-label');
      return (label === 'Dismiss');
    });
  });

  test('Touching the status bar should not dismiss keyboard', function() {
    // Click on the status bar
    client.switchToFrame();
    var topPanel = client.findElement('#top-panel');
    topPanel.click();

    client.helper.wait(3000);

    keyboard.switchTo();

    var keyboardContainer = keyboard.currentPanel;

    assert.ok(keyboardContainer.displayed());
  });
});
