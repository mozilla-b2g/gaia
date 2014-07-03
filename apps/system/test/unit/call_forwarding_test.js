/* global MockNavigatorMozMobileConnections, MockNavigatorSettings,
   MockSIMSlotManager, MockSettingsHelper, MockasyncStorage,
   MockMobileconnection, MockSIMSlot */

'use strict';

requireApp('system/js/mock_simslot.js');
requireApp('system/js/mock_simslot_manager.js');
requireApp('system/test/unit/mock_asyncStorage.js');
requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_settings_helper.js');

mocha.setup({
  globals: [
    'SIMSlotManager',
    'SettingsHelper',
    'CallForwarding',
    'callForwarding',
    'asyncStorage'
  ]
});

suite('system/callForwarding >', function() {
  var realMobileConnections;
  var realSIMSlotManager;
  var realMozSettings;
  var realSettingsHelper;
  var realAsyncStorage;

  suiteSetup(function(done) {
    // Must be in sync with nsIDOMMozMobileCFInfo interface.
    this.cfReason = {
      CALL_FORWARD_REASON_UNCONDITIONAL: 0,
      CALL_FORWARD_REASON_MOBILE_BUSY: 1,
      CALL_FORWARD_REASON_NO_REPLY: 2,
      CALL_FORWARD_REASON_NOT_REACHABLE: 3
    };

    this.cfAction = {
      CALL_FORWARD_ACTION_DISABLE: 0,
      CALL_FORWARD_ACTION_ENABLE: 1,
      CALL_FORWARD_ACTION_QUERY_STATUS: 2,
      CALL_FORWARD_ACTION_REGISTRATION: 3,
      CALL_FORWARD_ACTION_ERASURE: 4
    };

    realMobileConnections = window.navigator.mozMobileConnections;
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realMozSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    realSIMSlotManager = window.SIMSlotManager;
    window.SIMSlotManager = MockSIMSlotManager;

    realSettingsHelper = window.SettingsHelper;
    window.SettingsHelper = MockSettingsHelper;

    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockasyncStorage;

    requireApp('system/js/call_forwarding.js', done);
  });

  suiteTeardown(function() {
    window.navigator.mozMobileConnections = realMobileConnections;
    window.navigator.mozSettings = realMozSettings;
    window.SIMSlotManager = realSIMSlotManager;
    window.SettingsHelper = realSettingsHelper;
    window.asyncStorage = realAsyncStorage;
  });

  setup(function() {
    this.mockMobileConnection = MockMobileconnection();
    this.slots = [new MockSIMSlot(this.mockMobileConnection, 0)];
    this.iccid = 'iccid1';
    this.slots[0].simCard = {
      cardState: 'ready',
      iccInfo: {
        iccid: this.iccid
      }
    };
    MockSIMSlotManager.mInstances = this.slots;

    this.callForwarding = new window.CallForwarding();
  });

  teardown(function() {
    MockSettingsHelper.mTeardown();
    MockNavigatorSettings.mTeardown();
    MockasyncStorage.mTeardown();
  });

  suite('start()', function() {
    test('should early return if it has been started', function() {
      this.callForwarding.start();
      sinon.spy(this.callForwarding._callForwardingHelper, 'set');
      this.callForwarding.start();
      sinon.assert.notCalled(this.callForwarding._callForwardingHelper.set);
    });

    test('_slots should be the same as what SIMSlotManager returns',
      function() {
        this.callForwarding.start();
        for (var i = 0; i < this.slots.length; i++) {
          assert.equal(this.callForwarding._slots[i], this.slots[i]);
        }
    });

    test('should add event handlers', function() {
      sinon.stub(this.callForwarding, '_addEventHandlers');
      this.callForwarding.start();
      sinon.assert.called(this.callForwarding._addEventHandlers);
    });

    test('should call to _initCallForwardingState', function() {
      sinon.stub(this.callForwarding, '_initCallForwardingState');
      this.callForwarding.start();
      sinon.assert.calledWith(this.callForwarding._initCallForwardingState,
        this.slots[0]);
    });

    test('should set the icons state to false by default', function(done) {
      this.callForwarding.start();
      setTimeout(function() {
        var instance = MockSettingsHelper.instances['ril.cf.enabled'];
        assert.isFalse(instance.value[0]);
        assert.isFalse(instance.defaultValue[0]);
        done();
      });
    });
  });

  suite('_addEventHandlers()', function() {
    ['simslot-cardstatechange',
     'simslot-iccinfochange'].forEach(function(eventName) {
      test('should call to _initCallForwardingState when receiving ' +
        eventName, function(done) {
          sinon.stub(this.callForwarding, '_initCallForwardingState');
          this.callForwarding.start();

          var eventObj = new CustomEvent(eventName, { detail: this.slots[0] });
          window.dispatchEvent(eventObj);
          setTimeout((function() {
            sinon.assert.calledWith(
              this.callForwarding._initCallForwardingState,
              this.slots[0]);
            done();
          }).bind(this));
        });
    });

    test('should call to _onCallForwardingStateChanged when ' +
      'ril.cf.carrier.enabled changed', function() {
        sinon.stub(this.callForwarding, '_onCallForwardingStateChanged');
        this.callForwarding.start();

        var value = { settingValue: { index: 0, enabled: true }};
        MockNavigatorSettings
          .mTriggerObservers('ril.cf.carrier.enabled', value);

        sinon.assert.calledWith(
          this.callForwarding._onCallForwardingStateChanged,
          value.settingValue.index, value.settingValue.enabled);
    });

    test('should call to _updateCallForwardingIconState when receiving ' +
      'cfstatechange', function() {
        sinon.stub(this.callForwarding, '_updateCallForwardingIconState');
        this.callForwarding.start();

        var event = {};
        this.slots[0].conn.triggerEventListeners('cfstatechange', event);

        sinon.assert.called(
          this.callForwarding._updateCallForwardingIconState,
          this.slots[0], event);
    });

    suite('_initCallForwardingState()', function() {
      test('should early return if the slot has been initialized', function() {
        this.callForwarding.start();
        sinon.spy(window.asyncStorage, 'getItem');
        this.callForwarding._callForwardingIconInitializedStates[0] = true;
        this.callForwarding._initCallForwardingState(this.slots[0]);
        sinon.assert.notCalled(window.asyncStorage.getItem);
        window.asyncStorage.getItem.restore();
      });

      test('should early returrn if the sim card is not available', function() {
        this.callForwarding.start();
        sinon.spy(window.asyncStorage, 'getItem');
        this.slots[0].simCard = null;
        this.callForwarding._initCallForwardingState(this.slots[0]);
        sinon.assert.notCalled(window.asyncStorage.getItem);
        window.asyncStorage.getItem.restore();
      });

      test('should early returrn if the card state is not ready', function() {
        this.callForwarding.start();
        sinon.spy(window.asyncStorage, 'getItem');
        this.slots[0].simCard.cardState = 'unknown';
        this.callForwarding._initCallForwardingState(this.slots[0]);
        sinon.assert.notCalled(window.asyncStorage.getItem);
        window.asyncStorage.getItem.restore();
      });

      test('should early returrn if the iccid is not available', function() {
        this.callForwarding.start();
        sinon.spy(window.asyncStorage, 'getItem');
        this.slots[0].simCard.iccInfo = {
          iccid: null
        };
        this.callForwarding._initCallForwardingState(this.slots[0]);
        sinon.assert.notCalled(window.asyncStorage.getItem);
        window.asyncStorage.getItem.restore();
      });

      suite('when with valid iccid', function() {
        test('should mark the slot as initialized', function() {
          this.callForwarding.start();
          this.callForwarding._initCallForwardingState(this.slots[0]);
          assert.ok(
            this.callForwarding._callForwardingIconInitializedStates[0]);
        });

        test('should set the icon state to false when no cached information',
          function(done) {
            this.callForwarding.start();
            this.callForwarding._initCallForwardingState(this.slots[0]);
            setTimeout(function() {
              assert.isFalse(
                MockSettingsHelper.instances['ril.cf.enabled'].value[0]);
              done();
            });
        });

        test('should initialize the icon state with cached information',
          function(done) {
            MockasyncStorage.mItems['ril.cf.enabled.' + this.iccid] = true;
            this.callForwarding.start();
            this.callForwarding._initCallForwardingState(this.slots[0]);
            setTimeout(function() {
              assert.isTrue(
                MockSettingsHelper.instances['ril.cf.enabled'].value[0]);
              done();
            });
        });
      });
    });

    suite('_updateCallForwardingIconState()', function() {
      setup(function() {
        this.event = {
          reason: this.cfReason.CALL_FORWARD_REASON_UNCONDITIONAL,
          action: this.cfAction.CALL_FORWARD_ACTION_ENABLE,
          success: true
        };

        this.callForwarding.start();
      });

      test('should early return if the event is not available', function() {
        sinon.spy(this.callForwarding._callForwardingHelper, 'get');
        this.callForwarding._updateCallForwardingIconState(this.slots[0]);
        sinon.assert.notCalled(this.callForwarding._callForwardingHelper.get);
      });

      test('should early return if it is not unconditional call forwarding ',
        function() {
          this.event.reason = 'otherReason';
          sinon.spy(this.callForwarding._callForwardingHelper, 'get');
          this.callForwarding._updateCallForwardingIconState(this.slots[0],
            this.event);
          sinon.assert.notCalled(this.callForwarding._callForwardingHelper.get);
      });

      test('should set the icon state to false when unsuccess', function(done) {
        this.event.success = false;
        this.callForwarding._updateCallForwardingIconState(this.slots[0],
          this.event);
        setTimeout(function() {
          assert.isFalse(
            MockSettingsHelper.instances['ril.cf.enabled'].value[0]);
          done();
        });
      });

      suite('should set the icon state to true when with correct call ' +
        'forwarding settings', function() {
          test('CALL_FORWARD_ACTION_REGISTRATION', function(done) {
            this.event.action = this.cfAction.CALL_FORWARD_ACTION_REGISTRATION;
            this.callForwarding._updateCallForwardingIconState(this.slots[0],
              this.event);
            setTimeout(function() {
              assert.isTrue(
                MockSettingsHelper.instances['ril.cf.enabled'].value[0]);
              done();
            });
          });

          test('CALL_FORWARD_ACTION_ENABLE', function(done) {
            this.event.action = this.cfAction.CALL_FORWARD_ACTION_ENABLE;
            this.callForwarding._updateCallForwardingIconState(this.slots[0],
              this.event);
            setTimeout(function() {
              assert.isTrue(
                MockSettingsHelper.instances['ril.cf.enabled'].value[0]);
              done();
            });
          });
      });

      suite('should cache the call forwarding information', function() {
        test('when success', function() {
          this.callForwarding._updateCallForwardingIconState(this.slots[0],
            this.event);
          assert.isTrue(
            MockasyncStorage.mItems['ril.cf.enabled.' + this.iccid]);
        });

        test('when unsuccess', function() {
          this.event.success = false;
          this.callForwarding._updateCallForwardingIconState(this.slots[0],
            this.event);
          assert.isFalse(
            MockasyncStorage.mItems['ril.cf.enabled.' + this.iccid]);
        });
      });
    });

    suite('_onCallForwardingStateChanged()', function() {
      setup(function() {
        this.callForwarding.start();
      });

      test('should set icon state correctly', function(done) {
        var enabled = true;
        this.callForwarding._onCallForwardingStateChanged(0, enabled);
        setTimeout(function() {
          assert.ok(MockSettingsHelper.instances['ril.cf.enabled'].value[0] ===
            enabled);
          done();
        });
        assert.ok(MockasyncStorage.mItems['ril.cf.enabled.' + this.iccid] ===
          enabled);
      });
    });
  });
});
