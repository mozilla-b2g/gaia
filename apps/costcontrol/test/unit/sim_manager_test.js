/* global MockAllNetworkInterfaces, MockNavigatorSettings, SimManager,
          MockNavigatorMozMobileConnections, MockNavigatorMozIccManager,
          MocksHelper, MockSettingsListener
*/

'use strict';

require('/test/unit/mock_all_network_interfaces.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/js/sim_manager.js');

var realMozSettings,
    realMozMobileConnections,
    realMozIccManager;

if (!window.navigator.mozSettings) {
  window.navigator.mozSettings = null;
}

if (!window.navigator.mozMobileConnections) {
  window.navigator.mozMobileConnections = null;
}

if (!window.navigator.mozIccManager) {
  window.navigator.mozIccManager = null;
}

var MocksHelperForUnitTest = new MocksHelper([
  'SettingsListener'
]).init();

suite('Cost Control SimManager >', function() {

  MocksHelperForUnitTest.attachTestHelpers();

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    realMozIccManager = navigator.mozIccManager;
    window.navigator.mozIccManager = window.MockNavigatorMozIccManager;

    realMozMobileConnections = navigator.mozMobileConnections;
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realMozSettings;
    window.navigator.mozMobileConnections = realMozMobileConnections;
    window.navigator.mozIccManager = realMozIccManager;
  });

  setup(function() {
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    window.navigator.mozIccManager = window.MockNavigatorMozIccManager;
  });

  function createFailingLockRequest() {
    return function() {
      return {
        set: null,
        get: function() {
          var request = {};
          setTimeout(function() {
            request.error = { name: 'error' };
            request.onerror && request.onerror();
          }, 0);
          return request;
        }
      };
    };
  }

  suite(' Single SIM scenario >', function() {
    setup(function() {
      SimManager.reset();
      MockNavigatorSettings.mTeardown();
      window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
      window.navigator.mozIccManager = window.MockNavigatorMozIccManager;
    });

    test('The data Icc is loading without errors', function(done) {
      MockNavigatorMozMobileConnections[0] = {
        iccId: MockAllNetworkInterfaces[1].id
      };
      MockNavigatorMozIccManager.addIcc(MockAllNetworkInterfaces[1].id, {});

      assert.isFalse(SimManager.isMultiSim());

      SimManager.requestDataSimIcc(function(dataSim) {
        assert.isTrue(dataSim.initialized);
        assert.equal(dataSim.iccId,
                     MockAllNetworkInterfaces[1].id);
        MockNavigatorMozIccManager.removeIcc(MockAllNetworkInterfaces[1].id);
        done();
      });
    });

    test('Not possible load the data Icc, when iccId is null', function(done) {
      MockNavigatorMozMobileConnections[0] = {
        iccId: null
      };
      var consoleSpy = sinon.spy(console, 'error');
      SimManager.requestDataSimIcc(function() { assert.ok(false); },
        function _onError() {
          consoleSpy.calledWith('The slot 0, configured as the data slot,' +
                                ' is empty');
          consoleSpy.restore();
          done();
        }
      );
    });

    // On this case mozMobile connections has an iccId, but IccManager does not
    // have a Icc object with this iccId
    test('Not possible load the data Icc, when Icc is null', function(done) {
      MockNavigatorMozMobileConnections[0] = {
        iccId: MockAllNetworkInterfaces[1].id
      };
      var consoleSpy = sinon.spy(console, 'error');
      SimManager.requestDataSimIcc(function() { assert.ok(false); },
        function _onError() {
          consoleSpy.calledWith('The slot 0, configured as the data slot,' +
                                ' is empty');
          consoleSpy.restore();
          done();
        }
      );
    });

    test('requestDataConnection()', function(done) {
      var dataSlotId = 0,
          dataSlot = 'ril.data.defaultServiceId';
      MockNavigatorSettings.mSettings[dataSlot] = dataSlotId;
      MockNavigatorMozMobileConnections[dataSlotId] = {
        voice: { connected: true }
      };

      SimManager.requestDataConnection(function(connection) {
        assert.isTrue(connection.voice.connected);
        done();
      });
    });
  });

  suite(' Multi SIM scenario (currently DSDS)  >', function() {
    suiteSetup(function () {
      MockNavigatorMozMobileConnections.mAddMobileConnection();
      MockNavigatorMozIccManager.addIcc(MockAllNetworkInterfaces[0].id, {});
      MockNavigatorMozIccManager.addIcc(MockAllNetworkInterfaces[1].id, {});
    });
    suiteTeardown(function () {
      MockNavigatorMozMobileConnections.mRemoveMobileConnection(1);
      MockNavigatorMozIccManager.removeIcc(MockAllNetworkInterfaces[0].id);
      MockNavigatorMozIccManager.removeIcc(MockAllNetworkInterfaces[1].id);
    });
    setup(function() {
      SimManager.reset();
      MockNavigatorSettings.mTeardown();
      MockNavigatorMozMobileConnections[0] = {
        iccId: MockAllNetworkInterfaces[1].id
      };
      MockNavigatorMozMobileConnections[1] = {
        iccId: MockAllNetworkInterfaces[0].id
      };
    });

    test('requestDataSimIcc() calls onsuccess with the iccinfo object ',
      function(done) {
        MockNavigatorSettings.mSettings['ril.data.defaultServiceId'] = 0;

        assert.isTrue(SimManager.isMultiSim());

        SimManager.requestDataSimIcc(function(dataSim) {
          assert.equal(dataSim.iccId, MockAllNetworkInterfaces[1].id);
          done();
        }, function _onError() { assert.ok(false); });
      }
    );

    test('requestDataSimIcc() without the setting returns a warning message',
      function(done) {
        var consoleSpy = sinon.spy(console, 'warn');
        window.addEventListener('simManagerReady', function _onSMInit() {
          window.removeEventListener('simManagerReady', _onSMInit);
          assert.ok(consoleSpy.calledTwice);
          assert.ok(consoleSpy.calledWith('SimManager is not ready, waiting ' +
                                          'for initialized custom event'));
          assert.ok(consoleSpy.calledWith('The setting ril.data.' +
            'defaultServiceId does not exists, using default Slot (0)'));
          consoleSpy.restore();
          done();
        });
        SimManager.requestDataSimIcc();
      }
    );

    test('requestTelephonySimIcc() without settings returns warning messages',
      function(done) {
        var consoleSpy = sinon.spy(console, 'warn');
        window.addEventListener('simManagerReady', function _onSMInit() {
          window.removeEventListener('simManagerReady', _onSMInit);
          assert.ok(consoleSpy.calledTwice);
          assert.ok(consoleSpy.calledWith('SimManager is not ready, waiting ' +
                                          'for initialized custom event'));
          assert.ok(consoleSpy.calledWith('The setting ril.telephony.' +
            'defaultServiceId does not exists, using default Slot (0)'));
          consoleSpy.restore();
          done();
        });
        SimManager.requestTelephonySimIcc();
      }
    );

    test('requestMessageSimIcc() without the setting returns warning messages',
      function(done) {
        var consoleSpy = sinon.spy(console, 'warn');
        window.addEventListener('simManagerReady', function _onSMInit() {
          window.removeEventListener('simManagerReady', _onSMInit);
          assert.ok(consoleSpy.calledTwice);
          assert.ok(consoleSpy.calledWith('SimManager is not ready, waiting ' +
                                          'for initialized custom event'));
          assert.ok(consoleSpy.calledWith('The setting ril.sms.' +
            'defaultServiceId does not exists, using default Slot (0)'));
          consoleSpy.restore();
          done();
        });
        SimManager.requestMessageSimIcc();
      }
    );

    test('requestDataSimIcc() returns Icc without settings', function(done) {
      assert.isTrue(SimManager.isMultiSim());

      SimManager.requestDataSimIcc(function(dataSim) {
        assert.isTrue(dataSim.initialized);
        assert.isTrue(dataSim.dirty);
        assert.equal(dataSim.iccId, MockAllNetworkInterfaces[1].id);
        done();
      }, function _onError() { assert.ok(false); });
    });

    test('requestTelephonySimIcc() works ok when settings request fails',
      function(done) {
        sinon.stub(navigator.mozSettings, 'createLock',
                   createFailingLockRequest());

        assert.isTrue(SimManager.isMultiSim());
        SimManager.requestTelephonySimIcc(function _onSuccess(telephonySim) {
          assert.equal(telephonySim.iccId, MockAllNetworkInterfaces[1].id);
          navigator.mozSettings.createLock.restore();
          done();
        }, function _onError() { assert.ok(false); });
      }
    );

    test('requestDataSimIcc() when all fails (no settings, no icc)',
      function(done) {
        sinon.stub(navigator.mozSettings, 'createLock',
                   createFailingLockRequest());
        MockNavigatorMozMobileConnections[0] = { iccId: null };

        var consoleSpy = sinon.spy(console, 'warn');
        SimManager.requestDataSimIcc(function() { assert.ok(false); },
          function _onError() {
            assert.ok(consoleSpy.calledTwice);
            assert.ok(consoleSpy.calledWith(
              'SimManager is not ready, waiting for initialized custom event'));
            assert.ok(consoleSpy.calledWith(
              'The setting ril.data.defaultServiceId does not exists'));
            navigator.mozSettings.createLock.restore();
            consoleSpy.restore();
            done();
          }
        );
      }
    );

    test('init() requests the correct slotId', function(done) {
      var dataSlotId = 0, messageSlotId = 1, telephonySlotId = 1;
      MockNavigatorSettings
        .mSettings['ril.data.defaultServiceId'] = dataSlotId;
      MockNavigatorSettings
        .mSettings['ril.telephony.defaultServiceId'] = telephonySlotId;
      MockNavigatorSettings
        .mSettings['ril.sms.defaultServiceId'] = messageSlotId;

      SimManager.requestDataSimIcc(function(dataSim) {
          assert.ok(dataSim.initialized);
          assert.equal(dataSim.slotId, dataSlotId);
      }, function _onError() { assert.ok(false); });

      SimManager.requestMessageSimIcc(function(messageSim) {
          assert.equal(messageSim.slotId, messageSlotId);
      }, function _onError() { assert.ok(false); });

      SimManager.requestTelephonySimIcc(function _onSuccess(telephonySim) {
        assert.equal(telephonySim.slotId, telephonySlotId);
      }, function _onError() { assert.ok(false); });
      done();
    });

    test('requestMessageSimIcc() launches initialized event', function(done) {
      window.addEventListener('simManagerReady', function _onSMInit() {
        window.removeEventListener('simManagerReady', _onSMInit);
        done();
      });
      SimManager.requestMessageSimIcc();
    });

    test('requestDataSimIcc behaviour when changing the default data slot',
    function(done) {
      var defaultDataSlotId = 0, newDataSlotId = 1,
          dataSlot = 'ril.data.defaultServiceId';
      MockNavigatorSettings.mSettings[dataSlot] = defaultDataSlotId;

      window.addEventListener('dataSlotChange', function _onSMInit() {
        window.removeEventListener('dataSlotChange', _onSMInit);

        SimManager.requestDataSimIcc(function(dataSim) {
          assert.equal(dataSim.slotId, newDataSlotId);
          done();

        }, function _onError() { assert.ok(false); });
      });

      SimManager.requestDataSimIcc(function _onsuccess(dataSim) {
        assert.equal(dataSim.slotId, defaultDataSlotId);
        MockSettingsListener.mTriggerCallback(dataSlot, newDataSlotId);
      }, function _onerror() { assert.ok(false); });
    });

    test('getTelephonyConnection() works fine, without settings',
    function(done) {
      MockNavigatorMozMobileConnections[0] = {
        voice: { connected: true }
      };

      SimManager.requestDataConnection(function(telephonyConnection) {
        assert.isTrue(telephonyConnection.voice.connected);
        done();
      });
    });

    test('getTelephonyConnection() works ok when settings request fails',
    function(done) {
      sinon.stub(navigator.mozSettings, 'createLock',
                 createFailingLockRequest());
      MockNavigatorMozMobileConnections[0] = {
        voice: { connected: true }
      };
      SimManager.requestDataConnection(function (telephonyConnection) {
        assert.isTrue(telephonyConnection.voice.connected);
        navigator.mozSettings.createLock.restore();
        done();
      });
    });

    test('getTelephonyConnection fails, no settings, no MobileConnections',
      function(done) {
        sinon.stub(navigator.mozSettings, 'createLock',
                   createFailingLockRequest());
        MockNavigatorMozMobileConnections[0] = null;

        SimManager.requestDataConnection(function (telephonyConnection) {
            assert.isNull(telephonyConnection);
            navigator.mozSettings.createLock.restore();
            done();
        });
      }
    );
  });

});


