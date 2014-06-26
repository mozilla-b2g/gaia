'use strict';
var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate battery settings', function() {
  var client = marionette.client();
  var settingsApp;
  var batteryPanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the battery menu
    batteryPanel = settingsApp.batteryPanel;
  });

  test('Check what is the Battey indicator status', function() {
    assert.equal(
      batteryPanel.batteryIndicatorStatus,
      '0',
      'Only battery icon is selected'
    );
    assert.equal(
      batteryPanel.batteryIndicatorStatus,
      '1',
      'Only battery percentage is selected'
    );
    assert.equal(
      batteryPanel.batteryIndicatorStatus,
      '2',
      'Both battery icon and percentage are selected'
    );
  });

  test('check power save mode initial state', function() {
    assert.ok(
      !batteryPanel.isPowerSavingEnabled,
      'power save mode is disabled by default'
    );
  });

  test('enable power save mode', function() {
    batteryPanel.enablePowerSaveMode();
    assert.ok(
      batteryPanel.isPowerSavingEnabled,
      'power save mode has been enabled'
    );
  });

  test('open Turn On Period option selector', function() {
    batteryPanel.changeTurnOnPeriod();
    assert.ok(
      batteryPanel.isLastOptionSelected,
      'Turn On Period option can be tapped'
    );
  });

});
