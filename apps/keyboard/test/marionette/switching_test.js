'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app');
var ImeTestApp = require('./lib/ime_test_app');
var Keyboard = require('./lib/keyboard');
var assert = require('assert');

marionette('switch Keyboard App', function() {
  var keyboardTestApp = null;
  var keyboard = null;
  var systemInputMgmt = null;
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
      'keyboard.enabled-layouts': keyboardSettings
    }
  });

  /*
   * To check the 3rd-party IME is shown.
   */
  function check3rdPartyIme() {
    // switch back to system
    client.switchToFrame();

    // wait for the 2nd keyboard is loaded
    systemInputMgmt.ensureInputWindowCount(2);

    systemInputMgmt.switchToActiveKeyboardFrame();
    assert.ok(imeTestApp.sendKeyButton.displayed());
  }

  setup(function() {
    actions = client.loader.getActions();
    keyboard = new Keyboard(client);
    systemInputMgmt = client.loader.getAppClass('system', 'input_management');
    imeTestApp = new ImeTestApp(client);

    // create a keyboard test app
    keyboardTestApp = new KeyboardTestApp(client);
    keyboardTestApp.launch();
    keyboardTestApp.textInput.click();

    // Wait for the keyboard pop up and switch to it
    systemInputMgmt.waitForKeyboardFrameDisplayed();
    systemInputMgmt.switchToActiveKeyboardFrame();
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
    actions.longPress(imeSwitchingKey, 0.7).perform();

    // switch back to system
    client.switchToFrame();
    var imeMenu = systemInputMgmt.imeMenu;
    assert.ok(imeMenu.displayed());

    // select the 3rd-party IME
    systemInputMgmt.selectImeOption(1);
    check3rdPartyIme();
  });

  test('Drag down the utility tray', function() {
    // Swipe to drag down the utility tray
    systemInputMgmt.dragDownUtilityTray();

    // Check the IME switching buttion in notification
    var imeNotification = systemInputMgmt.imeNotification;
    client.waitFor(function() {
      return imeNotification.displayed();
    });

    imeNotification.click();

    assert.ok(systemInputMgmt.imeMenu.displayed());
    //XXX: Wait for the previous keyboard to hide or we may not be able to
    //     switch to the next keyboard.
    client.waitFor(function() {
      return systemInputMgmt.keyboardFrameHidden();
    });

    // select the 3rd-party IME
    systemInputMgmt.selectImeOption(1);
    check3rdPartyIme();
  });
});
