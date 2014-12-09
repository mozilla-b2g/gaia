'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app');
var ImeTestApp = require('./lib/ime_test_app');
var Keyboard = require('./lib/keyboard');
var assert = require('assert');

marionette('switch Keyboard App', function() {
  var keyboardTestApp = null;
  var keyboard = null;
  var system = null;
  var imeTestApp = null;
  var client = null;
  var actions = null;
  var apps = {};

  // Pre-install keyboard testing app
  apps[KeyboardTestApp.ORIGIN] = __dirname + '/keyboardtestapp';

  // And a testing 3rd-party IME app
  apps[ImeTestApp.ORIGIN] = __dirname + '/imetestapp';

  var keyboardSettings = {};
  keyboardSettings[Keyboard.MANIFEST_URL] = {
    'en': true,
    'number': true
  };

  // Enable a testing IME app
  keyboardSettings[ImeTestApp.MANIFEST_URL] = {
    'lol': true
  };

  client = marionette.client({
    apps: apps,
    prefs: {
      'focusmanager.testmode': true
    },
    settings: {
      'keyboard.enabled-layouts': keyboardSettings,
      'lockscreen.enabled': false,
      'ftu.manifestURL': null
    }
  });

  /*
   * To check the 3rd-party IME is shown.
   */
  function check3rdPartyIme() {
    // switch back to system
    client.switchToFrame();
    system.switchToActiveKeyboardFrame();
    assert.ok(imeTestApp.sendKeyButton.displayed());
  }

  setup(function() {
    actions = client.loader.getActions();
    keyboard = new Keyboard(client);
    system = client.loader.getAppClass('keyboard', 'system');
    imeTestApp = new ImeTestApp(client);

    // create a keyboard test app
    keyboardTestApp = new KeyboardTestApp(client);
    keyboardTestApp.launch();
    keyboardTestApp.textInput.click();

    // Wait for the keyboard pop up and switch to it
    system.waitForKeyboardFrameDisplayed();
    system.switchToActiveKeyboardFrame();
  });

  test('Checking the switching IME function is available', function() {
    var imeSwitchingKey = keyboard.imeSwitchingKey;
    assert.ok(imeSwitchingKey.displayed());

    // Click to switch to next IME
    imeSwitchingKey.click();
    check3rdPartyIme();
  });

  test('Long press to show the IME menu', function() {
    var imeSwitchingKey = keyboard.imeSwitchingKey;

    // Long press to show IME menu
    actions.longPress(imeSwitchingKey, 1.0).perform();

    // switch back to system
    client.switchToFrame();
    var imeMenu = system.imeMenu;
    assert.ok(imeMenu.displayed());

    // select the 3rd-party IME
    system.selectImeOption(1);
    check3rdPartyIme();
  });

  test('Drag down the utility tray', function() {
    // Swipe to drag down the utility tray
    system.dragDownUtilityTray();

    // Check the IME switching buttion in notification
    var imeNotification = system.imeNotification;
    client.waitFor(function() {
      return imeNotification.displayed();
    });

    imeNotification.click();

    assert.ok(system.imeMenu.displayed());
    //XXX: Wait for the previous keyboard to hide or we may not be able to
    //     switch to the next keyboard.
    client.waitFor(function() {
      return system.keyboardFrameHidden();
    });

    // select the 3rd-party IME
    system.selectImeOption(1);
    check3rdPartyIme();
  });
});
