/* global MocksHelper, BaseModule, MockNavigatorSettings,
          Bluetooth, WifiManager */
'use strict';

requireApp('system/test/unit/mock_bluetooth.js');
requireApp('system/test/unit/mock_wifi_manager.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/settings_core.js');
requireApp('system/js/airplane_mode_service_helper.js');

var mocksForAirplaneModeServiceHelper = new MocksHelper([
  'Bluetooth',
  'WifiManager',
  'NavigatorSettings'
]).init();

suite('system/airplane_mode_service_helper.js', function() {
  var subject, settingsCore;
  var realMozSettings, realWifiManager, realNfc, realBluetooth;
  var services = ['ril.data', 'geolocation', 'wifi', 'nfc', 'bluetooth'];
  mocksForAirplaneModeServiceHelper.attachTestHelpers();

  suiteSetup(function() {
    realWifiManager = navigator.mozWifiManager;
    navigator.mozWifiManager = WifiManager;
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realNfc = navigator.mozNfc;
    navigator.mozNfc = {};
    realBluetooth = navigator.mozBluetooth;
    Object.defineProperty(navigator, 'mozBluetooth', {
      configurable: true,
      get: function() {
        return Bluetooth;
      }
    });
    MockNavigatorSettings.mSyncRepliesOnly = true;
  });

  suiteTeardown(function() {
    navigator.mozNfc = realNfc;
    navigator.mozWifiManager = realWifiManager;
    navigator.mozSettings = realMozSettings;
    Object.defineProperty(navigator, 'mozBluetooth', {
      configurable: true,
      get: function() {
        return realBluetooth;
      }
    });
  });

  setup(function() {
    settingsCore = BaseModule.instantiate('SettingsCore');
    settingsCore.start();
    subject = BaseModule.instantiate('AirplaneModeServiceHelper');
  });
  teardown(function() {
    settingsCore.stop();
    subject.stop();
  });

  suite('init', function() {
    setup(function() {
      subject.start();
    });

    services.forEach(function(key) {
      test('should set initial values of _settings for ' + key,
        function() {
          MockNavigatorSettings.mTriggerObservers(
            key + '.enabled', { settingValue: true });
        });
    });
  });

  suite('_suspend should work as expected when services are enabled',
    function() {
      var fakeNfc = {};
      suiteSetup(function() {
        if (!navigator.mozNfc) {
          navigator.mozNfc = fakeNfc;
        }
      });
      suiteTeardown(function() {
        if (navigator.mozNfc === fakeNfc) {
          delete navigator.mozNfc;
        }
      });
      setup(function() {
        subject.start();
        services.forEach(function(key) {
          MockNavigatorSettings.mTriggerObservers(key + '.enabled', {
            settingValue: true
          });
          MockNavigatorSettings.mTriggerObservers(key + '.suspended', {
            settingValue: false
          });
        });
      });
      test('turn on airplane mode, thus all ".enabled" should be false ' +
        'and all ".suspended" should be true', function() {
          subject.updateStatus(true);
          MockNavigatorSettings.mReplyToRequests();
          services.forEach(function(key) {
            assert.equal(
              MockNavigatorSettings.mSettings[key + '.enabled'], false);
            assert.equal(
              MockNavigatorSettings.mSettings[key + '.suspended'], true);
          });
      });
    });

  suite('_unsuspend should work as expected when airplane mode is on',
    function() {
      test('turn on airplane mode, thus all ".enabled" should be false ' +
        'and all ".suspended" should be true', function() {
          // enable airplane mode, thus suspend all services
          services.forEach(function(key) {
            subject._unsuspend(key + '.suspended');
          });
          MockNavigatorSettings.mReplyToRequests();
          services.forEach(function(key) {
            assert.equal(MockNavigatorSettings.mSettings[key + '.suspended'],
              false);
          });
      });
    });

  suite('restoring enabled settings', function() {
    setup(function() {
      subject.start();
      services.forEach(function(key) {
        MockNavigatorSettings.mTriggerObservers(key + '.enabled', {
          settingValue: false
        });
        MockNavigatorSettings.mTriggerObservers(key + '.suspended', {
          settingValue: true
        });
      });
    });
    test('turn on all services, then turn on airplane mode, ' +
      'and turn off airplane mode. All ".suspended" and ".enabled" ' +
      'should be just the same', function() {
        subject.updateStatus(false);
        MockNavigatorSettings.mReplyToRequests();
        services.forEach(function(key) {
          assert.equal(MockNavigatorSettings.mSettings[key + '.enabled'], true);
          assert.equal(
            MockNavigatorSettings.mSettings[key + '.suspended'], false);
        });
    });
  });
});