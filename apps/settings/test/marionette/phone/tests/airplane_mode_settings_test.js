'use strict';
var Settings = require('../../app/app'),
    assert = require('assert');

// Note :
// This test is only run on devices
marionette('airplaneMode settings', function() {
  var client = marionette.client();
  var settingsApp;
  var rootPanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    rootPanel = settingsApp.rootPanel;
  });

  suite('Turning airplaneMode from off to on', function() {
    setup(function() {
      prepareDefaultServices();
      rootPanel.airplaneMode(false);
    });

    test('all related services will be turned off', function() {
      rootPanel.airplaneMode(true);
      assert.equal(rootPanel.wifiEnabledSetting, false);
      assert.equal(rootPanel.bluetoothEnabledSetting, false);
      assert.equal(rootPanel.geolocationCheckboxChecked, false);
      assert.equal(rootPanel.nfcCheckboxChecked, false);
    });
  });

  suite('Turning airplaneMode from on to off', function() {
    setup(function() {
      prepareDefaultServices();
      rootPanel.airplaneMode(true);
    });

    test('all related services will be turned on', function() {
      rootPanel.airplaneMode(false);
      assert.equal(rootPanel.wifiEnabledSetting, true);
      assert.equal(rootPanel.bluetoothEnabledSetting, true);
      assert.equal(rootPanel.geolocationCheckboxChecked, true);
      assert.equal(rootPanel.nfcCheckboxChecked, true);
    });
  });

  function prepareDefaultServices() {
    client.settings.set('airplaneMode.enabled', false);
    client.settings.set('wifi.enabled', true);
    client.settings.set('bluetooth.enabled', true);
    client.settings.set('geolocation.enabled', true);
    client.settings.set('nfc.enabled', true);
  }
});
