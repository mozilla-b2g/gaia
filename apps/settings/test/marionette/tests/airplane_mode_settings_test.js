'use strict';
var Settings = require('../app/app'),
    assert = require('assert');

marionette('airplaneMode settings', function() {
  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var settingsApp;
  var rootPanel;

  setup(function() {
    settingsApp = new Settings(client);
  });

  suite('Turning airplaneMode from off to on', function() {
    setup(function() {
      prepareDefaultServices();
      rootPanel.airplaneMode(false);
    });

    test('all related services will be turned off', function() {
      rootPanel.airplaneMode(true);
      // assert.ok(rootPanel.airplaneModeCheckboxChecked,
      //   'airplane mode should be enabled');
      // assert.equal(rootPanel.wifiEnabledSetting, false);
      // assert.equal(rootPanel.bluetoothEnabledSetting, false);
      assert.equal(rootPanel.geolocationCheckboxChecked, false);
      // assert.equal(rootPanel.nfcCheckboxChecked, false);
    });
  });

  suite('Turning airplaneMode from on to off', function() {
    setup(function() {
      prepareDefaultServices();
      rootPanel.airplaneMode(true);
    });

    test('all related services will be turned on', function() {
      rootPanel.airplaneMode(false);
      // assert.ok(!rootPanel.airplaneModeCheckboxChecked,
      //   'airplane mode should be disabled');
      // assert.equal(rootPanel.wifiEnabledSetting, true);
      // assert.equal(rootPanel.bluetoothEnabledSetting, true);
      assert.equal(rootPanel.geolocationCheckboxChecked, true);
      // assert.equal(rootPanel.nfcCheckboxChecked, true);
    });
  });

  function prepareDefaultServices() {
    // We need to inject the script before launching settings app because it
    // access to the objects upon starting up.
    client.contentScript.inject(__dirname +
      '/../mocks/mock_navigator_moz_wifi_manager.js');
    client.contentScript.inject(__dirname +
      '/../mocks/mock_navigator_moz_bluetooth.js');

    client.settings.set('airplaneMode.enabled', false);
    client.settings.set('wifi.enabled', true);
    client.settings.set('bluetooth.enabled', true);
    client.settings.set('geolocation.enabled', true);
    client.settings.set('nfc.enabled', true);

    settingsApp.launch();
    rootPanel = settingsApp.rootPanel;
  }
});
