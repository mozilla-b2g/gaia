/* global MockNavigatorSettings, AirplaneMode, MocksHelper,
          MockNavigatorMozMobileConnections, SettingsListener,
          MockLock, MockWifiManager, MockBluetooth */
'use strict';

requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_bluetooth.js');
requireApp('system/test/unit/mock_wifi_manager.js');
requireApp('system/js/airplane_mode.js');

var mocksForAirplaneMode = new MocksHelper([
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
          setConnection(0, 'enabling');
          setConnection(1, 'enabling');
          AirplaneMode.enabled = true;
        });
        test('we will cache doSetRadioEnabled for later use', function() {
          var conns = window.navigator.mozMobileConnections;
          assert.isFunction(
            conns[0].mEventListeners.radiostatechange[0]);
          assert.isFunction(
            conns[1].mEventListeners.radiostatechange[0]);
        });
      });

      suite('conn0 is enabling, conn1 is enabled', function() {
        setup(function() {
          setConnection(0, 'enabling');
          setConnection(1, 'enabled');
          AirplaneMode.enabled = true;
        });
        test('no further steps because setCount is not 2', function() {
          var conns = window.navigator.mozMobileConnections;
          assert.isFunction(
            conns[0].mEventListeners.radiostatechange[0]);
          assert.isFunction(
            conns[1].mCachedRadioEnabledReq.onsuccess);


          // but because setCount is not 2, we will not
          // execute further steps
          conns[1].mCachedRadioEnabledReq.onsuccess();

          var checkedActions = AirplaneMode._getCheckedActions(true);
          assert.isFalse(checkedActions.conn);
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
        test('no further steps because we are waiting other events',
          function() {
            var conns = window.navigator.mozMobileConnections;
            assert.isFunction(
              conns[0].mCachedRadioEnabledReq.onsuccess);
            assert.isFunction(
              conns[1].mCachedRadioEnabledReq.onsuccess);

            // assume radio is done
            conns[0].mCachedRadioEnabledReq.onsuccess();
            conns[1].mCachedRadioEnabledReq.onsuccess();

            // but because we are still waiting for the other window event,
            // we we will not execute further steps
            var checkedActions = AirplaneMode._getCheckedActions(true);
            assert.isFalse(
              AirplaneMode._areCheckedActionsAllDone(checkedActions));

            var lock = getLastSettingsLock();
            assert.equal(lock['airplaneMode.status'], 'enabling');
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
            var conns = window.navigator.mozMobileConnections;
            assert.isFunction(
              conns[0].mCachedRadioEnabledReq.onsuccess);
            assert.isFunction(
              conns[1].mCachedRadioEnabledReq.onsuccess);

            // setRadioEnabled operation is done
            conns[0].mCachedRadioEnabledReq.onsuccess();
            conns[1].mCachedRadioEnabledReq.onsuccess();

            emitEvent('wifi-disabled');
            emitEvent('bluetooth-disabled');

            var lock = getLastSettingsLock();
            assert.equal(lock['airplaneMode.status'], 'enabled');
        });
      });
    });
  });

  suite('set enabled to false', function() {
    suite('but _enabled is false already, do nothing', function() {
      setup(function() {
        this.sinon.spy(AirplaneMode._serviceHelper, 'updateStatus');
        AirplaneMode._enabled = false;
        AirplaneMode.enabled = false;
      });
      test('nothing happend', function() {
        assert.isFalse(AirplaneMode._serviceHelper.updateStatus.called);
      });
    });

    suite('_enabled is true, keep running', function() {
      setup(function() {
        this.sinon.stub(AirplaneMode._serviceHelper, 'updateStatus');
        AirplaneMode._enabled = true;

        // we have to make eventListeners to the newest state
        MockNavigatorMozMobileConnections.mAddMobileConnection();
      });

      teardown(function() {
        // we have to make eventListeners to the newest state
        MockNavigatorMozMobileConnections.mTeardown();
      });

      suite('conn0 is disabling, conn1 is disabling', function() {
        setup(function() {
          setConnection(0, 'disabling');
          setConnection(1, 'disabling');
          AirplaneMode.enabled = false;
        });
        test('we will cache doSetRadioEnabled for later use', function() {
          var conns = window.navigator.mozMobileConnections;
          assert.isFunction(
            conns[0].mEventListeners.radiostatechange[0]);
          assert.isFunction(
            conns[1].mEventListeners.radiostatechange[0]);
        });
      });

      suite('conn0 is disabling, conn1 is disabled', function() {
        setup(function() {
          setConnection(0, 'disabling');
          setConnection(1, 'disabled');

          // AirplaneMode._checkedActions.conn = false;
          AirplaneMode.enabled = false;
        });
        test('no further steps because setCount is not 2', function() {
          var conns = window.navigator.mozMobileConnections;
          assert.isFunction(
            conns[0].mEventListeners.radiostatechange[0]);
          assert.isFunction(
            conns[1].mCachedRadioEnabledReq.onsuccess);

          // but because setCount is not 2, we will not
          // execute further steps
          conns[1].mCachedRadioEnabledReq.onsuccess();
          // assert.isFalse(AirplaneMode._checkedActions.conn);
        });
      });

      suite('conn0 is disabled, conn1 is disabled', function() {
        suiteSetup(function() {
          setSettingOnServiceHelper('wifi.suspended', true);
          setSettingOnServiceHelper('bluetooth.suspended', true);
        });
        suiteTeardown(function() {
          setSettingOnServiceHelper('wifi.suspended', false);
          setSettingOnServiceHelper('bluetooth.suspended', false);
        });
        setup(function() {
          setConnection(0, 'disabled');
          setConnection(1, 'disabled');
          AirplaneMode.enabled = false;
        });
        test('no further steps because we are waiting other events',
          function() {
            var conns = window.navigator.mozMobileConnections;
            assert.isFunction(
              conns[0].mCachedRadioEnabledReq.onsuccess);
            assert.isFunction(
              conns[1].mCachedRadioEnabledReq.onsuccess);

            // setRadioEnabled operation is done
            conns[0].mCachedRadioEnabledReq.onsuccess();
            conns[1].mCachedRadioEnabledReq.onsuccess();

            // but because we are still waiting for the other window event,
            // we we will not execute further steps
            var checkedActions = AirplaneMode._getCheckedActions(false);
            assert.isFalse(
              AirplaneMode._areCheckedActionsAllDone(checkedActions));

            var lock = getLastSettingsLock();
            assert.equal(lock['airplaneMode.status'], 'disabling');
        });
      });

      suite('conn0 is disabled, conn1 is disabled', function() {
        setup(function() {
          setConnection(0, 'disabled');
          setConnection(1, 'disabled');
          AirplaneMode.enabled = false;
        });
        test('all other services are also done, we are leaving airplaneMode',
          function() {
            var conns = window.navigator.mozMobileConnections;
            assert.isFunction(
              conns[0].mCachedRadioEnabledReq.onsuccess);
            assert.isFunction(
              conns[1].mCachedRadioEnabledReq.onsuccess);

            // setRadioEnabled operation is done
            conns[0].mCachedRadioEnabledReq.onsuccess();
            conns[1].mCachedRadioEnabledReq.onsuccess();

            emitEvent('wifi-enabled');
            emitEvent('bluetooth-adapter-added');

            var lock = getLastSettingsLock();
            assert.equal(lock['airplaneMode.status'], 'disabled');
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
        var conns = window.navigator.mozMobileConnections;

        // got a radiostatechange from gecko
        conns[0].mEventListeners.radiostatechange[0]();

        // setRadioEnabled operation is done
        conns[0].mCachedRadioEnabledReq.onsuccess();
        conns[1].mCachedRadioEnabledReq.onsuccess();

        emitEvent('wifi-enabled');
        emitEvent('bluetooth-adapter-added');

        var lock = getLastSettingsLock();
        assert.equal(lock['airplaneMode.status'], 'disabled');
      });
    });
  });


  // test helpers

  function setSettingOnServiceHelper(key, value) {
    AirplaneMode._serviceHelper._settings[key] = value;
  }

  function setConnection(connIndex, status) {
    MockNavigatorMozMobileConnections[connIndex].radioState = status;
  }

  function setServiceEnable(serviceName, enabled) {
    Object.defineProperty(window.navigator, serviceName, {
      configurable: true,
      enabled: enabled
    });
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
