var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate bluetooth settings', function() {
  var client = marionette.client();
  var settingsApp;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the Bluetooth menu
    bluetoothPanel = settingsApp.bluetoothPanel;
  });

  test('check bluetooth initial state', function() {
    assert.ok(
      !bluetoothPanel.isBluetoothEnabled,
      'bluetooth is disabled by default'
    );
  });

  test('enable bluetooth', function() {
    bluetoothPanel.enableBluetooth();
    assert.ok(
      bluetoothPanel.isBluetoothEnabled,
      'bluetooth has been enabled'
    );
  });

});
