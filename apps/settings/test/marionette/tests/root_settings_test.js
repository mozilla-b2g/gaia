'use strict';
var Settings = require('../app/app'),
    assert = require('assert');

marionette('check root panel settings', function() {
  var client = marionette.client();
  var settingsApp;
  var rootPanel;

  var hasNumbers = function(t) {
    return /\d/.test(t);
  };

  setup(function() {
    settingsApp = new Settings(client);
  });

  // Common tests are the tests that use the basic hardware configuration.
  suite('common tests', function() {
    setup(function() {
      // We need to inject the script before launching settings app because it
      // access to the objects upon starting up.
      client.contentScript.inject(__dirname +
        '/../mocks/mock_navigator_moz_wifi_manager.js');
      client.contentScript.inject(__dirname +
        '/../mocks/mock_navigator_moz_bluetooth.js');

      client.settings.set('devtools.qps.enabled', true);

      settingsApp.launch();
      rootPanel = settingsApp.rootPanel;
    });

    teardown(function() {
      client.settings.set('devtools.qps.enabled', false);
    });

    test('check static item descriptions', function() {
      // The content of the root panel are delay loaded. We need to wait for
      // the actual result.
      client.waitFor(function() {
        return rootPanel.bluetoothDesc === 'Turned off';
      });
      client.waitFor(function() {
        return rootPanel.firefoxAccountDesc === 'Create Account or Sign In';
      });
      client.waitFor(function() {
        return rootPanel.screenLockDesc === 'Disabled';
      });
      client.waitFor(function() {
        return rootPanel.WiFiDesc === 'Disabled';
      });
      client.waitFor(function() {
        return hasNumbers(rootPanel.applicationStorageDesc);
      });
      client.waitFor(function() {
        return hasNumbers(rootPanel.batteryDesc);
      });
      client.waitFor(function() {
        return hasNumbers(rootPanel.mediaStorageDesc);
      });
    });

    test('language description on the root panel is translated',
      function() {
      settingsApp.currentLanguage = 'accented';
      assert.ok(
        rootPanel.isLanguageDescTranslated('accented'),
        'language desc was not localized into Accented English');

      settingsApp.currentLanguage = 'mirrored';
      assert.ok(
        rootPanel.isLanguageDescTranslated('mirrored'),
        'language desc was not localized into Mirrored English');

      settingsApp.currentLanguage = 'english';
      assert.ok(
        rootPanel.isLanguageDescTranslated('english'),
        'language desc was not localized into Mirrored English');
    });

    suite('airplane mode', function() {
      test('check default value', function() {
        assert.ok(!rootPanel.airplaneModeCheckboxChecked,
          'airplane mode should be disabled by default');
      });

      test('enable airplane mode', function() {
        rootPanel.airplaneMode(true);
        assert.ok(rootPanel.airplaneModeCheckboxChecked,
          'airplane mode should be enabled');
      });
    });

    suite('geolocation', function() {
      test('check default value', function() {
        assert.ok(rootPanel.geolocationCheckboxChecked,
          'geolocation should be enabled by default');
      });

      test('disable geolocation', function() {
        rootPanel.geolocation(false);
        assert.ok(!rootPanel.geolocationCheckboxChecked,
          'geolocation should be disabled');
        assert.ok(!rootPanel.geolocationEnabledSetting,
          'geolocation.enabled should be false');
      });
    });

    suite('usb storage', function() {
      test('check default value', function() {
        assert.ok(!rootPanel.usbStorageCheckboxChecked,
          'usb storage should be disabled by default');
        client.waitFor(function() {
          return rootPanel.usbStorageDesc === 'Disabled';
        });
      });

      test.skip('enable usb storage', function() {
        rootPanel.usbStorage(true);

        // There will be confirmation dialog shown at the first time the usb
        // storage is enabled. Add a waitFor for this case.
        client.waitFor(function() {
          return client.findElement('.turn-on-ums-dialog').displayed();
        });
        rootPanel.tapUsbStorageConfirmButton();

        assert.ok(rootPanel.usbStorageCheckboxChecked,
          'usb storage should be enabled');
      });
    });
  });

  suite('sim related tests', function() {
    suite('single sim tests', function() {
      setup(function() {
        client.contentScript.inject(__dirname +
          '/../mocks/mock_navigator_moz_mobile_connections.js');
        client.contentScript.inject(__dirname +
          '/../mocks/mock_navigator_moz_telephony.js');

        settingsApp.launch();
        rootPanel = settingsApp.rootPanel;
      });

      test('ensure sim security item visible', function() {
        assert.ok(rootPanel.isSimSecurityItemVisible);
      });

      test('ensure sim manager item invisible', function() {
        assert.ok(!rootPanel.isSimManagerItemVisible);
      });
    });

    suite('multiple sim tests', function() {
      setup(function() {
        client.contentScript.inject(__dirname +
          '/../mocks/mock_navigator_moz_mobile_connections_multi.js');
        client.contentScript.inject(__dirname +
          '/../mocks/mock_navigator_moz_telephony.js');

        settingsApp.launch();
        rootPanel = settingsApp.rootPanel;
      });

      test('ensure sim security item visible', function() {
        assert.ok(!rootPanel.isSimSecurityItemVisible);
      });

      test('ensure sim manager item invisible', function() {
        assert.ok(rootPanel.isSimManagerItemVisible);
      });
    });
  });

});
