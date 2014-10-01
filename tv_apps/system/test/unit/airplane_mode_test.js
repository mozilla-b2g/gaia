/* global MockNavigatorSettings, AirplaneMode, MocksHelper,
          MockNavigatorMozMobileConnections, SettingsListener,
          MockLock, Radio,
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
requireApp('system/js/airplane_mode.js');

var mocksForAirplaneMode = new MocksHelper([
  'Radio',
  'Bluetooth',
  'WifiManager',
  'SettingsListener',
  'NavigatorMozMobileConnections'
]).init();

suite('system/airplane_mode.js', function() {
  var realSettings;
  var realMobileConnections;

  mocksForAirplaneMode.attachTestHelpers();

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
  });

  suite('init > ', function() {
    suiteSetup(function() {
      AirplaneMode.init();
    });
    test('AirplaneModeServiceHelper is registered', function() {
       assert.isObject(AirplaneMode._serviceHelper);
    });
    test('AirplaneModeServiceHelper starts observing key changes',
      function() {
        var checkedServiceKeys = [
          'bluetooth.enabled',
          'wifi.enabled',
          'geolocation.enabled',
          'nfc.enabled'
        ];
        checkedServiceKeys.forEach(function(key) {
          assert.ok(key in SettingsListener.mCallbacks);
        });
    });
  });

  suite('set enabled to true', function() {
    suite('but _enabled is true already, do nothing', function() {
      setup(function() {
        this.sinon.spy(AirplaneMode._serviceHelper, 'updateStatus');
        AirplaneMode._enabled = true;
        AirplaneMode.enabled = true;
      });
      test('nothing happend', function() {
        assert.isFalse(AirplaneMode._serviceHelper.updateStatus.called);
      });
    });

    suite('_enabled is false, keep running', function() {
      setup(function() {
        this.sinon.stub(AirplaneMode._serviceHelper, 'updateStatus');
        AirplaneMode._enabled = false;

        // we have to make eventListeners to the newest state
        MockNavigatorMozMobileConnections.mAddMobileConnection();
      });

      teardown(function() {
        // we have to make eventListeners to the newest state
        MockNavigatorMozMobileConnections.mTeardown();
      });

      suite('conn0 is enabling, conn1 is enabling', function() {
        setup(function() {
          this.sinon.stub(AirplaneMode, '_updateAirplaneModeStatus');

          setConnection(0, 'enabling');
          setConnection(1, 'enabling');
          AirplaneMode.enabled = true;
        });
        test('no further steps because we are waiting for other events',
          function() {
            assert.isTrue(AirplaneMode._updateAirplaneModeStatus.called);
        });
      });

      suite('conn0 is enabling, conn1 is enabled', function() {
        setup(function() {
          this.sinon.stub(AirplaneMode, '_updateAirplaneModeStatus');

          setConnection(0, 'enabling');
          setConnection(1, 'enabled');
          AirplaneMode.enabled = true;
        });
        test('no further steps because we are waiting for other events',
          function() {
            assert.isTrue(AirplaneMode._updateAirplaneModeStatus.called);
        });
      });

      suite('conn0 is enabled, conn1 is enabled', function() {
        // we will wait for these two services
        suiteSetup(function() {
          setSettingOnServiceHelper('wifi.enabled', true);
          setSettingOnServiceHelper('bluetooth.enabled', true);
        });
        suiteTeardown(function() {
          setSettingOnServiceHelper('wifi.enabled', false);
          setSettingOnServiceHelper('bluetooth.enabled', false);
        });
        setup(function() {
          setConnection(0, 'enabled');
          setConnection(1, 'enabled');
          AirplaneMode.enabled = true;
        });
        test('no further steps because we are waiting for other events',
          function() {
            // but because we are still waiting for the other window event,
            // we we will not execute further steps
            var checkedActions = AirplaneMode._getCheckedActions(true);
            assert.isFalse(
              AirplaneMode._areCheckedActionsAllDone(checkedActions));
        });
      });

      suite('conn0 is enabled, conn1 is enabled', function() {
        setup(function() {
          setConnection(0, 'enabled');
          setConnection(1, 'enabled');
          AirplaneMode.enabled = true;
        });
        test('all other services are also done, we are in airplaneMode',
          function() {
            emitEvent('wifi-disabled');
            emitEvent('bluetooth-disabled');
            emitEvent('radio-disabled');

            var lock = getLastSettingsLock();
            assert.equal(lock['airplaneMode.status'], 'enabled');
        });
      });
    });
  });

  suite('AirplaneMode is enabled now', function() {
    suiteSetup(function() {
      // we need registered radiostatechange event
      AirplaneMode.init();
    });
    suite('but users want to dial out an emergency call', function() {
      setup(function() {
        AirplaneMode._enabled = true;
        setConnection(0, 'enabled');
        setConnection(1, 'enabled');
      });
      test('we will leave airplane mode', function() {
        var radioStateChangeEvents = Radio._events.radiostatechange;
        for (var i = 0; i < radioStateChangeEvents.length; i++) {
          radioStateChangeEvents[i]();
        }

        emitEvent('wifi-enabled');
        emitEvent('bluetooth-adapter-added');
        emitEvent('radio-enabled');

        assert.isTrue(AirplaneMode.enabled);
      });
    });
  });

  suite('AirplaneModeServiceHelper', function() {
    test('init and _initSetting should set initial values of _settings',
      function() {
        AirplaneMode._serviceHelper.init();
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
          AirplaneMode._serviceHelper.init();
          setAllSettingsOnServiceHelper({enabled: true, suspended: false});
        });
        test('turn on airplane mode, thus all ".enabled" should be false ' +
          'and all ".suspended" should be true', function() {
            // enable airplane mode, thus suspend all services
            servicesIterator(function(key) {
              AirplaneMode._serviceHelper._suspend(key);
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
          this.sinon.spy(AirplaneMode._serviceHelper, '_unsuspend');
          AirplaneMode._serviceHelper.init();
          setAllSettingsOnServiceHelper({enabled: true, suspended: false});
          // enable airplane mode, thus suspend all services
          servicesIterator(function(key) {
            AirplaneMode._serviceHelper._suspend(key);
          });
        });
        teardown(function() {
          AirplaneMode._serviceHelper._unsuspend.restore();
        });
        // expand the tests to all services
        servicesIterator(function(key) {
          test('turn on ' + key + ', "' + key + '.suspended" should be false ' +
            'and _unsuspend should be called', function() {
              var sset = JSON.parse('{"' + key + '.enabled": true}');
              sinon.assert.notCalled(AirplaneMode._serviceHelper._unsuspend);
              // toggle service (identified by key) on
              MockNavigatorSettings.createLock().set(sset);
              assert.ok(
                MockNavigatorSettings.mSettings[key + '.enabled'] === true);
              assert.ok(
                MockNavigatorSettings.mSettings[key + '.suspended'] === false);
              assert.ok(getSettingOnServiceHelper(key + '.enabled') === true);
              assert.ok(
                getSettingOnServiceHelper(key + '.suspended') === false);
              sinon.assert.called(AirplaneMode._serviceHelper._unsuspend);
          });
        });
      });

    suite('_restore should work as expected', function() {
      setup(function() {
        AirplaneMode._serviceHelper.init();
        // turn on all services
        setAllSettingsOnServiceHelper({enabled: true, suspended: false});
        // enable airplane mode, thus suspend all services
        servicesIterator(function(key) {
          AirplaneMode._serviceHelper._suspend(key);
        });
      });
      test('turn on all services, then turn on airplane mode, ' +
        'and turn off airplane mode. All ".suspended" and ".enabled" ' +
        'should be just the same', function() {
          // disable airplane mode, thus _restore all services
          servicesIterator(function(key) {
            AirplaneMode._serviceHelper._restore(key);
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
    AirplaneMode._serviceHelper._settings[key] = value;
  }

  function setAllSettingsOnServiceHelper(values) {
    servicesIterator(function(key) {
      setSettingOnServiceHelper(key + '.enabled', values.enabled);
      setSettingOnServiceHelper(key + '.suspended', values.suspended);
    });
  }

  function getSettingOnServiceHelper(key) {
    return AirplaneMode._serviceHelper._settings[key];
  }

  function setConnection(connIndex, status) {
    MockNavigatorMozMobileConnections[connIndex].radioState = status;
  }

  function emitEvent(eventName) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(eventName, true, false, null);
    window.dispatchEvent(evt);
  }

  function getLastSettingsLock() {
    return MockLock.locks[MockLock.locks.length - 1];
  }
});
