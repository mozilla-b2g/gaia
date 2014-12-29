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
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/test/unit/mock_airplane_mode_helper.js');
require('/js/sim_manager.js');

var MocksHelperForUnitTest = new MocksHelper([
  'AirplaneModeHelper',
  'LazyLoader',
  'SettingsListener'
]).init();

suite('Cost Control SimManager >', function() {
  var realMozSettings,
      realMozMobileConnections,
      realMozIccManager;

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
    MockNavigatorSettings.mSetup();
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    MockNavigatorMozIccManager.mTeardown();
    MockNavigatorMozMobileConnections.mTeardown();

    timeouts.forEach(clearTimeout);
    timeouts = [];

    SimManager.reset();
  });


  var timeouts = [];
  function createFailingLockRequest() {
    return function() {
      return {
        set: null,
        get: function() {
          var request = {};
          timeouts.push(setTimeout(function() {
            request.error = { name: 'error' };
            request.onerror && request.onerror();
          }));
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
        done(() => {
          assert.isTrue(dataSim.initialized);
          assert.equal(dataSim.iccId,
                       MockAllNetworkInterfaces[1].id);
          MockNavigatorMozIccManager.removeIcc(MockAllNetworkInterfaces[1].id);
        });
      });
    });

    test('Not possible load the data Icc, when iccId is null', function(done) {
      MockNavigatorMozMobileConnections[0] = {
        iccId: null
      };
      this.sinon.spy(console, 'error');
      SimManager.requestDataSimIcc(
        () => done(new Error('Should not call success')),
        function onerror() {
          done(() => {
            sinon.assert.calledWith(
              console.error,
              'The slot 0, configured as the data slot, is empty'
            );
          });
        }
      );
    });

    // On this case mozMobile connections has an iccId, but IccManager does not
    // have a Icc object with this iccId
    test('Not possible load the data Icc, when Icc is null', function(done) {
      MockNavigatorMozMobileConnections[0] = {
        iccId: MockAllNetworkInterfaces[1].id
      };

      SimManager.requestDataSimIcc(
        () => done(new Error('Should not call success')),
        () => done()
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
        done(() => assert.isTrue(connection.voice.connected));
      });
    });
  });

  suite(' Multi SIM scenario (currently DSDS)  >', function() {
    setup(function() {
      MockNavigatorMozMobileConnections.mAddMobileConnection();
      MockNavigatorMozIccManager.addIcc(MockAllNetworkInterfaces[0].id, {});
      MockNavigatorMozIccManager.addIcc(MockAllNetworkInterfaces[1].id, {});

      MockNavigatorMozMobileConnections[0] = {
        iccId: MockAllNetworkInterfaces[1].id
      };
      MockNavigatorMozMobileConnections[1] = {
        iccId: MockAllNetworkInterfaces[0].id
      };

      // needs to call this again after we setup the connections
      SimManager.reset();
    });

    test('requestDataSimIcc() calls onsuccess with the iccinfo object ',
      function(done) {
        MockNavigatorSettings.mSettings['ril.data.defaultServiceId'] = 0;

        assert.isTrue(SimManager.isMultiSim());

        SimManager.requestDataSimIcc(
          function onsuccess(dataSim) {
            done(() => {
              assert.equal(dataSim.iccId, MockAllNetworkInterfaces[1].id);
            });
          },
          function onerror() {
            done(new Error('requestDataSimIcc should not report an error'));
          }
        );
      }
    );

    test('requestDataSimIcc() without the setting returns a warning message',
      function(done) {
        this.sinon.spy(console, 'warn');
        window.addEventListener('simManagerReady', function _onSMInit() {
          window.removeEventListener('simManagerReady', _onSMInit);
          done(() => {
            sinon.assert.calledTwice(console.warn);
            sinon.assert.calledWith(
              console.warn,
              'SimManager is not ready, waiting for initialized custom event'
            );
            sinon.assert.calledWith(
              console.warn,
              'The setting ril.data.defaultServiceId does not exists, ' +
                'using default Slot (0)'
            );
          });
        });
        SimManager.requestDataSimIcc();
      }
    );

    test('requestTelephonySimIcc() without settings returns warning messages',
      function(done) {
        this.sinon.spy(console, 'warn');
        window.addEventListener('simManagerReady', function _onSMInit() {
          window.removeEventListener('simManagerReady', _onSMInit);
          done(() => {
            sinon.assert.calledTwice(console.warn);
            sinon.assert.calledWith(
              console.warn,
              'SimManager is not ready, waiting for initialized custom event'
            );
            sinon.assert.calledWith(
              console.warn,
              'The setting ril.telephony.' +
                'defaultServiceId does not exists, using default Slot (0)'
            );
          });
        });
        SimManager.requestTelephonySimIcc();
      }
    );

    test('requestMessageSimIcc() without the setting returns warning messages',
      function(done) {
        this.sinon.spy(console, 'warn');
        window.addEventListener('simManagerReady', function _onSMInit() {
          window.removeEventListener('simManagerReady', _onSMInit);
          done(() => {
            sinon.assert.calledTwice(console.warn);
            sinon.assert.calledWith(
              console.warn,
              'SimManager is not ready, waiting for initialized custom event'
            );
            sinon.assert.calledWith(
              console.warn,
              'The setting ril.sms.' +
                'defaultServiceId does not exists, using default Slot (0)'
            );
          });
        });
        SimManager.requestMessageSimIcc();
      }
    );

    test('requestDataSimIcc() returns Icc without settings', function(done) {
      assert.isTrue(SimManager.isMultiSim());

      SimManager.requestDataSimIcc(
        function onsuccess(dataSim) {
          done(() => {
            assert.isTrue(dataSim.initialized);
            assert.isTrue(dataSim.dirty);
            assert.equal(dataSim.iccId, MockAllNetworkInterfaces[1].id);
          });
        },
        function onerror() {
          done(
            new Error('requestTelephonySimIcc should not report an error')
          );
        }
      );
    });

    test('requestTelephonySimIcc() works ok when settings request fails',
      function(done) {
        this.sinon.stub(navigator.mozSettings, 'createLock',
                   createFailingLockRequest());

        assert.isTrue(SimManager.isMultiSim());
        SimManager.requestTelephonySimIcc(
          function onsuccess(telephonySim) {
            done(() => {
              assert.equal(telephonySim.iccId, MockAllNetworkInterfaces[1].id);
            });
          },
          function onerror() {
            done(
              new Error('requestTelephonySimIcc should not report an error')
            );
          }
        );
      }
    );

    test('requestDataSimIcc() when all fails (no settings, no icc)',
      function(done) {
        this.sinon.stub(navigator.mozSettings, 'createLock',
                   createFailingLockRequest());
        MockNavigatorMozMobileConnections[0] = { iccId: null };

        this.sinon.spy(console, 'warn');
        SimManager.requestDataSimIcc(
          function onsuccess() { done(new Error('Should not call success')); },
          function onerror() {
            done(() => {
              sinon.assert.calledTwice(console.warn);
              sinon.assert.calledWith(
                console.warn,
                'SimManager is not ready, waiting for initialized custom event'
              );
              sinon.assert.calledWith(
                console.warn,
                'The setting ril.data.defaultServiceId does not exists'
              );
            });
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

      var promises = [];

      promises.push(new Promise(SimManager.requestDataSimIcc));
      promises.push(new Promise(SimManager.requestMessageSimIcc));
      promises.push(new Promise(SimManager.requestTelephonySimIcc));

      Promise.all(promises).then((sims) => {
        sims.forEach((sim) => assert.ok(sim.initialized));
        assert.equal(sims[0].slotId, dataSlotId);
        assert.equal(sims[1].slotId, messageSlotId);
        assert.equal(sims[2].slotId, telephonySlotId);
      }, () => { throw new Error('A request failed.'); })
      .then(done, done);
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

        SimManager.requestDataSimIcc(
          function onsuccess(dataSim) {
            done(() => { assert.equal(dataSim.slotId, newDataSlotId); });
          },
          function onerror() {
            done(new Error('requestDataSimIcc should not report an error'));
          }
        );
      });

      SimManager.requestDataSimIcc(
        function onsuccess(dataSim) {
          assert.equal(dataSim.slotId, defaultDataSlotId);
          MockSettingsListener.mTriggerCallback(dataSlot, newDataSlotId);
        },
        function onerror() {
          done(new Error('requestDataSimIcc should not report an error'));
        }
      );
    });

    test('getTelephonyConnection() works fine, without settings',
    function(done) {
      MockNavigatorMozMobileConnections[0] = {
        voice: { connected: true }
      };

      SimManager.requestDataConnection(function(telephonyConnection) {
        done(() => { assert.isTrue(telephonyConnection.voice.connected); });
      });
    });

    test('getTelephonyConnection() works ok when settings request fails',
    function(done) {
      this.sinon.stub(navigator.mozSettings, 'createLock',
                 createFailingLockRequest());
      MockNavigatorMozMobileConnections[0] = {
        voice: { connected: true }
      };
      SimManager.requestDataConnection(function (telephonyConnection) {
        done(() => { assert.isTrue(telephonyConnection.voice.connected); });
      });
    });

    test('getTelephonyConnection fails, no settings, no MobileConnections',
      function(done) {
        this.sinon.stub(navigator.mozSettings, 'createLock',
                   createFailingLockRequest());
        MockNavigatorMozMobileConnections[0] = null;

        SimManager.requestDataConnection(function (telephonyConnection) {
          done(() => { assert.isNull(telephonyConnection); });
        });
      }
    );
  });

});


