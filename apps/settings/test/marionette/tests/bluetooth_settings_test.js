/* global Event */

'use strict';
var Settings = require('../app/app');
var BluetoothApp = require('../app/bluetooth_app');
var assert = require('assert');

marionette('manipulate bluetooth settings', function() {
  var client = marionette.client();
  var settingsApp;
  var bluetoothApp;
  var bluetoothPanel;

  setup(function() {
    client.contentScript.inject(__dirname +
      '/../mocks/mock_navigator_moz_bluetooth.js');

    bluetoothApp = new BluetoothApp(client);
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the Bluetooth menu
    bluetoothPanel = settingsApp.bluetoothPanel;
  });

  test('Launch bluetooth\'s settings page', function() {
    // switch to bluetooth's iframe and verify
    bluetoothApp.switchToSettings();
    assert.ok(bluetoothApp.backButton.displayed());

    // XXX: https://bugzilla.mozilla.org/show_bug.cgi?id=1048167
    // Since Bug 1048167 is blocking, we use 'client.executeScript' instead of
    // triggering 'click' event from element directly.
    // bluetoothApp.goBackToSettingsApp();

    // Below script is to trigger click event on the back button correctly
    client.executeScript(function(el) {
      console.log('el = ' + el);
      var evt = new Event('click', {
        cancelable: true,
        bubbles: true
      });
      el.dispatchEvent(evt);
    }, [bluetoothApp.backButton]);

    // switch back to settings frame and verify
    settingsApp.switchTo();
    assert.ok(settingsApp.rootPanel.isVisible);
  });

  test('check bluetooth initial state', function() {
    // switch to bluetooth's iframe and verify
    bluetoothApp.switchToSettings();

    assert.ok(
      !bluetoothPanel.isBluetoothEnabled,
      'bluetooth is disabled by default'
    );
  });

  test('enable bluetooth', function() {
    // switch to bluetooth's iframe and verify
    bluetoothApp.switchToSettings();

    bluetoothPanel.enableBluetooth();
    assert.ok(
      bluetoothPanel.isBluetoothEnabled,
      'bluetooth has been enabled'
    );
  });

});
