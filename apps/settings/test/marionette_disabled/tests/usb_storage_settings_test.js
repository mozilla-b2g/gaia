'use strict';

var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate display settings', function() {
  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var settingsApp;
  var usbStoragePanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
  });

  suite('USB storage', function() {
    setup(function() {
      // Navigate to the usb storage menu
      usbStoragePanel = settingsApp.usbStoragePanel;
    });

    suite('Check USB storage states and enable it', function() {
      test('check default value', function() {
        assert.ok(
          !usbStoragePanel.isUsbEnabledSwitchChecked,
          'USB enabled switch is un-checked by default'
        );
        assert.ok(
          !usbStoragePanel.isUmsEnabled,
          'The default value for USB setting is false'
        );

        usbStoragePanel.tapUsbEnabledSwitch();
        client.waitFor(function() {
          return usbStoragePanel.isUsbEnabledSwitchChecked;
        });

        usbStoragePanel.tapConfirmButton();
        // Need to wait for a moment for the change in settings
        client.waitFor(function() {
          return usbStoragePanel.isUmsEnabled;
        });

        assert.ok(
          usbStoragePanel.isUsbEnabledSwitchChecked,
          'USB enabled switch is checked'
        );
        assert.ok(
          usbStoragePanel.isUmsEnabled,
          'USB setting value is changed'
        );
      });
    });
  });
});
