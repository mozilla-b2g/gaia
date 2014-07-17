/*
 *  This test is to ensure that system's keyboard manager would
 *  correctly show the built-in keyboard app after the previous activated
 *  keyboard has been removed.
 */

'use strict';

var KeyboardTestApp = require('./lib/keyboard_test_app');
var ImeTestApp = require('./lib/ime_test_app');
var Keyboard = require('./lib/keyboard');
var System = require('./lib/system');
var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');

marionette('Show Keyboard App after uninstallation', function() {
  var keyboardTestApp = null;
  var keyboard = null;
  var system = null;
  var imeTestApp = null;
  var appInstall = null;
  var client = null;
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

  appInstall = new AppInstall(client);

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
    keyboard =  new Keyboard(client);
    system =  new System(client);
    imeTestApp = new ImeTestApp(client);

    // create a keyboard test app
    keyboardTestApp = new KeyboardTestApp(client);
    keyboardTestApp.launch();
    keyboardTestApp.textInput.click();

    // Wait for the keyboard pop up and switch to it
    system.waitForKeyboardFrameDisplayed();
    system.switchToActiveKeyboardFrame();

    // Click to switch to next IME
    keyboard.imeSwitchingKey.click();
    check3rdPartyIme();

    // Uninstall the current active IME
    appInstall.uninstall(ImeTestApp.MANIFEST_URL);
    appInstall.confirmUninstallDialog();

    // Click the input field again to check the built-in keyboard
    client.switchToFrame();
    client.apps.switchToApp(KeyboardTestApp.ORIGIN);
    // XXX: do something to remove the focus
    keyboardTestApp.nonInputArea.click();
    keyboardTestApp.textInput.click();

    // Wait for the keyboard pop up and switch to it
    system.waitForKeyboardFrameDisplayed();
    system.switchToActiveKeyboardFrame();
  });

  test('Fallback to built-in keyboard when the active IME has been ' +
       'uninstalled', function() {
    assert.ok(keyboard.currentPanel.displayed());
  });

  test('Should not show IME switching key after uninstallation', function() {
    client.findElement(Keyboard.Selector.imeSwitchingKey,
      function(err, element) {
        // Should not find the IME switching key
        if (err) {
          assert.equal(err.name, 'NoSuchElement');
        } else {
          assert.ok(false);
        }
      });
  });
});
