/* global MockNavigatorSettings, MocksHelper,
          MockNavigatorMozMobileConnections, MockAirplaneModeServiceHelper,
          MockLazyLoader, BaseModule, AirplaneModeIcon */
'use strict';

requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_wifi_manager.js');
requireApp('system/test/unit/mock_airplane_mode_service_helper.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/airplane_mode_icon.js');
requireApp('system/js/airplane_mode.js');

var mocksForAirplaneMode = new MocksHelper([
  'WifiManager',
  'NavigatorMozMobileConnections',
  'LazyLoader'
]).init();

suite('system/airplane_mode.js', function() {
  var realSettings;
  var realMobileConnections;
  var subject;

  mocksForAirplaneMode.attachTestHelpers();

  suiteSetup(function() {
    sinon.spy(MockLazyLoader, 'load');
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
    subject = BaseModule.instantiate('AirplaneMode');
    window.AirplaneModeServiceHelper = MockAirplaneModeServiceHelper;
    subject.start();
    subject.airplaneModeServiceHelper = new MockAirplaneModeServiceHelper();
    subject.icon = new AirplaneModeIcon(subject);
    this.sinon.stub(subject.icon, 'update');
  });

  teardown(function() {
    subject.stop();
  });

  test('should lazy load icon', function() {
    assert.isTrue(MockLazyLoader.load.calledWith(['js/airplane_mode_icon.js']));
  });

  suite('set enabled to true', function() {
    suite('but _enabled is true already, do nothing', function() {
      setup(function() {
        this.sinon.spy(subject.airplaneModeServiceHelper, 'updateStatus');
        subject._enabled = true;
        subject.enabled = true;
      });
      test('nothing happend', function() {
        assert.isFalse(subject.airplaneModeServiceHelper.updateStatus.called);
      });
    });

    suite('_enabled is false, keep running', function() {
      setup(function() {
        this.sinon.stub(subject.airplaneModeServiceHelper, 'updateStatus');
        subject._enabled = false;

        // we have to make eventListeners to the newest state
        MockNavigatorMozMobileConnections.mAddMobileConnection();
      });

      teardown(function() {
        // we have to make eventListeners to the newest state
        MockNavigatorMozMobileConnections.mTeardown();
      });

      suite('conn0 is enabling, conn1 is enabling', function() {
        setup(function() {
          this.sinon.stub(subject, '_updateAirplaneModeStatus');

          setConnection(0, 'enabling');
          setConnection(1, 'enabling');
          subject.enabled = true;
        });
        test('no further steps because we are waiting for other events',
          function() {
            assert.isTrue(subject._updateAirplaneModeStatus.called);
        });
      });

      suite('conn0 is enabling, conn1 is enabled', function() {
        setup(function() {
          this.sinon.stub(subject, '_updateAirplaneModeStatus');

          setConnection(0, 'enabling');
          setConnection(1, 'enabled');
          subject.enabled = true;
        });
        test('no further steps because we are waiting for other events',
          function() {
            assert.isTrue(subject._updateAirplaneModeStatus.called);
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
          subject.enabled = true;
        });
        test('no further steps because we are waiting for other events',
          function() {
            // but because we are still waiting for the other window event,
            // we we will not execute further steps
            var checkedActions = subject._getCheckedActions(true);
            assert.isFalse(
              subject._areCheckedActionsAllDone(checkedActions));
        });
      });

      suite('conn0 is enabled, conn1 is enabled', function() {
        setup(function() {
          setConnection(0, 'enabled');
          setConnection(1, 'enabled');

          this.sinon.stub(subject, 'writeSetting');
          subject.enabled = true;
        });
        test('all other services are also done, we are in airplaneMode',
          function() {
            emitEvent('wifi-disabled');
            emitEvent('bluetooth-disabled');
            emitEvent('radio-disabled');

            assert.deepEqual(subject.writeSetting.getCall(0).args[0], {
              'airplaneMode.status': 'enabled',
              'airplaneMode.enabled': true,
              'ril.radio.disabled': true
            });
            assert.isTrue(subject.icon.update.called);
        });
      });
    });
  });

  suite('AirplaneMode is enabled now', function() {
    suite('but users want to dial out an emergency call', function() {
      setup(function() {
        subject._enabled = true;
        setConnection(0, 'enabled');
        setConnection(1, 'enabled');
      });
      test('we will leave airplane mode', function() {
        emitEvent('radiostatechange', 'enabled');
        emitEvent('wifi-enabled');
        emitEvent('bluetooth-enabled');
        emitEvent('radio-enabled');

        assert.isTrue(subject.enabled);
      });
    });
  });

  // test helpers
  function setSettingOnServiceHelper(key, value) {
    subject.airplaneModeServiceHelper._settings[key] = value;
  }

  function setConnection(connIndex, status) {
    MockNavigatorMozMobileConnections[connIndex].radioState = status;
  }

  function emitEvent(eventName, detail) {
    var evt = new CustomEvent(eventName, {
      detail: detail || null
    });
    window.dispatchEvent(evt);
  }
});
