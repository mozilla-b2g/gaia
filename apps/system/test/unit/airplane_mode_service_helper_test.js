/* global MocksHelper, AirplaneModeServiceHelper, System */
'use strict';

requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('system/shared/test/unit/mocks/mock_promise.js');
requireApp('system/test/unit/mock_bluetooth.js');
requireApp('system/test/unit/mock_wifi_manager.js');
requireApp('system/test/unit/mock_radio.js');

requireApp('system/js/base_module.js');
requireApp('system/js/system.js');
requireApp('system/js/airplane_mode_service_helper.js');

var mocksForAirplaneModeServiceHelper = new MocksHelper([
  'Radio',
  'Bluetooth',
  'WifiManager'
]).init();

suite('system/airplane_mode_service_helper.js', function() {
  var subject;
  var services = ['ril.data', 'geolocation', 'wifi', 'nfc', 'bluetooth'];

  mocksForAirplaneModeServiceHelper.attachTestHelpers();

  setup(function() {
    subject = new AirplaneModeServiceHelper();
  });
  teardown(function() {
    subject.stop();
  });

  test('init and _initSetting should set initial values of _settings',
      function() {
        this.sinon.stub(System, 'request', function(arg) {
          var args = Array.prototype.splice.call(arguments, 0);
          if (args[0] === 'SettingsCore:addObserver') {
            return Promise.resolve(args[2].observe(args[1], false));
          } else {
            return Promise.resolve(false);
          }
        });
        subject.start();
        // check all values in _settings
        servicesIterator(function(key) {
          assert.ok(getSettingOnServiceHelper(key + '.enabled') === false);
          assert.ok(getSettingOnServiceHelper(key + '.suspended') === false);
        });
        subject.stop();
    });

    suite('_suspend should work as expected when services are enabled',
      function() {
        setup(function() {
          setAllSettingsOnServiceHelper({enabled: true, suspended: false});
        });
        test('turn on airplane mode, thus all ".enabled" should be false ' +
          'and all ".suspended" should be true', function() {
            var settingsDB = {};
            this.sinon.stub(System, 'request', function() {
              var args = Array.prototype.splice.call(arguments, 0);
              for (var key in args[1]) {
                settingsDB[key] = args[1][key];
              }
              return Promise.resolve(false);
            });
            // enable airplane mode, thus suspend all services
            servicesIterator(function(key) {
              subject._suspend(key);
            });
            servicesIterator(function(key) {
              assert.ok(settingsDB[key + '.enabled'] === false);
              assert.ok(settingsDB[key + '.suspended'] === true);
            });
        });
    });

    suite('_unsuspend should work as expected when airplane mode is on',
      function() {
        setup(function() {
          setAllSettingsOnServiceHelper({enabled: false, suspended: true});
        });

        test('turn on airplane mode, thus all ".enabled" should be false ' +
          'and all ".suspended" should be true', function() {
            var settingsDB = {};
            this.sinon.stub(System, 'request', function() {
              var args = Array.prototype.splice.call(arguments, 0);
              for (var key in args[1]) {
                settingsDB[key] = args[1][key];
              }
              return new Promise(function() {});
            });
            // enable airplane mode, thus suspend all services
            servicesIterator(function(key) {
              subject._unsuspend(key + '.suspended');
            });
            servicesIterator(function(key) {
              assert.ok(settingsDB[key + '.suspended'] === false);
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

  // test helpers

  function servicesIterator(callback) {
    services.forEach(callback);
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