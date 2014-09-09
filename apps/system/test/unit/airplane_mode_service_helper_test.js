/* global MockNavigatorSettings, MocksHelper,
          MockNavigatorMozMobileConnections, SettingsListener,
          MockLock, AirplaneModeServiceHelper,
          suite, requireApp, test, suiteTeardown, suiteSetup,
          setup, teardown, assert, sinon */
'use strict';

requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_bluetooth.js');
requireApp('system/test/unit/mock_wifi_manager.js');
requireApp('system/test/unit/mock_radio.js');

requireApp('system/js/base_module.js');
requireApp('system/js/system.js');
requireApp('system/js/airplane_mode_service_helper.js');

var mocksForAirplaneModeServiceHelper = new MocksHelper([
  'Radio',
  'Bluetooth',
  'WifiManager',
  'SettingsListener',
  'NavigatorMozMobileConnections'
]).init();

suite('system/airplane_mode_service_helper.js', function() {
  var realSettings;
  var realMobileConnections;
  var subject;

  mocksForAirplaneModeServiceHelper.attachTestHelpers();

  suiteSetup(function() {
    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    realMobileConnections = window.navigator.mozMobileConnections;
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realSettings;

    MockNavigatorMozMobileConnections.mTeardown();
    window.navigator.mozMobileConnections = realMobileConnections;
  });

  setup(function() {
    // we will do a lot of manipulations on SettingsListener,
    // let's clean it all for every test
    MockLock.clear();

    subject = new AirplaneModeServiceHelper();
    subject.start();
  });
  teardown(function() {
    subject.stop();
  });

  suite('AirplaneModeServiceHelper', function() {
    test('init and _initSetting should set initial values of _settings',
      function() {
        // SettingsListener is a mock here and would never observe any changes.
        // We need to trigger callbacks manually to make initSettings work
        servicesIterator(function(key) {
          SettingsListener.mTriggerCallback(key + '.enabled', false);
          SettingsListener.mTriggerCallback(key + '.suspended', false);
        });
        // check all values in _settings
        servicesIterator(function(key) {
          assert.ok(getSettingOnServiceHelper(key + '.enabled') === false);
          assert.ok(getSettingOnServiceHelper(key + '.suspended') === false);
        });
    });

    suite('_suspend should work as expected when services are enabled',
      function() {
        setup(function() {
          setAllSettingsOnServiceHelper({enabled: true, suspended: false});
        });
        test('turn on airplane mode, thus all ".enabled" should be false ' +
          'and all ".suspended" should be true', function() {
            // enable airplane mode, thus suspend all services
            servicesIterator(function(key) {
              subject._suspend(key);
            });
            servicesIterator(function(key) {
              assert.ok(
                MockNavigatorSettings.mSettings[key + '.enabled'] === false);
              assert.ok(
                MockNavigatorSettings.mSettings[key + '.suspended'] === true);
            });
        });
    });

    suite('_unsuspend should work as expected when airplane mode is on',
      function() {
        setup(function() {
          this.sinon.spy(subject, '_unsuspend');
          setAllSettingsOnServiceHelper({enabled: true, suspended: false});
          // enable airplane mode, thus suspend all services
          servicesIterator(function(key) {
            subject._suspend(key);
          });
        });
        // expand the tests to all services
        servicesIterator(function(key) {
          test('turn on ' + key + ', "' + key + '.suspended" should be false ' +
            'and _unsuspend should be called', function() {
              var sset = JSON.parse('{"' + key + '.enabled": true}');
              sinon.assert.notCalled(subject._unsuspend);
              MockNavigatorSettings.createLock().set(sset);
              // toggle service (identified by key) on
              assert.ok(
                MockNavigatorSettings.mSettings[key + '.enabled'] === true);
              assert.ok(
                MockNavigatorSettings.mSettings[key + '.suspended'] === false);
              assert.ok(getSettingOnServiceHelper(key + '.enabled') === true);
              assert.ok(
                getSettingOnServiceHelper(key + '.suspended') === false);
              sinon.assert.called(subject._unsuspend);
          });
        });
      });

    suite('_restore should work as expected', function() {
      setup(function() {
        // turn on all services
        setAllSettingsOnServiceHelper({enabled: true, suspended: false});
        // enable airplane mode, thus suspend all services
        servicesIterator(function(key) {
          subject._suspend(key);
        });
      });
      test('turn on all services, then turn on airplane mode, ' +
        'and turn off airplane mode. All ".suspended" and ".enabled" ' +
        'should be just the same', function() {
          // disable airplane mode, thus _restore all services
          servicesIterator(function(key) {
            subject._restore(key);
          });
          // all '.suspended' should be false, and all '.enabled' should be true
          servicesIterator(function(key) {
            assert.ok(
              getSettingOnServiceHelper(key + '.enabled') === true);
            assert.ok(
              getSettingOnServiceHelper(key + '.suspended') === false);
          });
      });
    });
  });

  // test helpers

  function servicesIterator(callback) {
    ['ril.data', 'bluetooth', 'wifi', 'geolocation', 'nfc'].forEach(callback);
  }

  function setSettingOnServiceHelper(key, value) {
    subject._settings[key] = value;
  }

  function setAllSettingsOnServiceHelper(values) {
    servicesIterator(function(key) {
      setSettingOnServiceHelper(key + '.enabled', values.enabled);
      setSettingOnServiceHelper(key + '.suspended', values.suspended);
    });
  }

  function getSettingOnServiceHelper(key) {
    return subject._settings[key];
  }
});