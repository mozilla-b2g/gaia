/*
 *  This test is to ensure that system's keyboard manager would
 *  correctly show the built-in keyboard app after the previous activated
 *  keyboard has been removed.
 */

'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app');
var ImeTestApp = require('./lib/ime_test_app');
var Keyboard = require('./lib/keyboard');
var assert = require('assert');

marionette('Show Keyboard App after uninstallation', function() {
  var keyboardTestApp = null;
  var keyboard = null;
  var systemInputMgmt = null;
  var imeTestApp = null;
  var appInstall = null;
  var client = null;
  var apps = {};
  var confirmDialog = null;

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
    return imeTestApp.sendKeyButton.displayed();
  }

  setup(function() {
    keyboard =  new Keyboard(client);
    systemInputMgmt = client.loader.getAppClass('system', 'input_management');
    appInstall = client.loader.getAppClass('system', 'app_install');
    confirmDialog = client.loader.getAppClass('system', 'confirm_dialog');
    imeTestApp = new ImeTestApp(client);

    // create a keyboard test app
    keyboardTestApp = new KeyboardTestApp(client);
    keyboardTestApp.launch();
    keyboardTestApp.textInput.click();

    // Wait for the keyboard pop up and switch to it
    systemInputMgmt.waitForKeyboardFrameDisplayed();
    systemInputMgmt.switchToActiveKeyboardFrame();

    // Click to switch to next IME
    keyboard.imeSwitchingKey.click();
    check3rdPartyIme();

    // XXX: Blur the input field, otherwise the keyboard frame has higher
    // z-index than dialog and we can't click it
    systemInputMgmt.waitForKeyboardFrameDisplayed();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);
    keyboardTestApp.nonInputArea.click();

    // Uninstall the current active IME
    appInstall.uninstall(ImeTestApp.MANIFEST_URL);
    client.switchToFrame();
    confirmDialog.confirm('remove');

    // Click the input field again to check the built-in keyboard
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);
    // XXX: do something to remove the focus
    keyboardTestApp.nonInputArea.click();
    keyboardTestApp.textInput.click();

    // Wait for the keyboard pop up and switch to it
    systemInputMgmt.waitForKeyboardFrameDisplayed();
    systemInputMgmt.switchToActiveKeyboardFrame();
  });

  test('Fallback to built-in keyboard when the active IME has been ' +
       'uninstalled', function() {
    assert.ok(keyboard.currentPanel.displayed());
  });

  test('Should not show IME switching key after uninstallation', function() {
    // Since the switching key is gone, we would show ',' on the first page
    var commaKey = keyboard.getKey(',');
    assert.ok(commaKey.displayed());
  });
});
