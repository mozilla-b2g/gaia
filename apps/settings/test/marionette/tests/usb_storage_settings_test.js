'use strict';

var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate display settings', function() {
  var client = marionette.client();
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

    suite('USB storage enabled states', function() {
      test('check default value', function() {
        assert.ok(
          !usbStoragePanel.isUsbEnabledSwitchChecked,
          'USB enabled switch is un-checked by default'
        );
      });

      test('tap toggle', function() {
        usbStoragePanel.tapUsbEnabledSwitch();
        client.waitFor(function() {
          return usbStoragePanel.isUsbEnabledSwitchChecked;
        }.bind(this));

        assert.ok(
          usbStoragePanel.isUsbEnabledSwitchChecked,
          'USB enabled switch is checked'
        );
      });
    });
  });
});
