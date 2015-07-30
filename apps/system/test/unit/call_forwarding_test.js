/* global MockNavigatorSettings, CallForwardingsIcon, MocksHelper,
   MockSIMSlotManager, MockSettingsHelper, MockasyncStorage,
   MockMobileconnection, MockSIMSlot, BaseModule, MockLazyLoader */

'use strict';

requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/shared/test/unit/mocks/mock_simslot.js');
requireApp('system/shared/test/unit/mocks/mock_simslot_manager.js');
requireApp('system/test/unit/mock_asyncStorage.js');
requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_settings_helper.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/settings_core.js');
requireApp('system/js/call_forwarding_icon.js');
requireApp('system/js/base_icon_collection.js');
requireApp('system/js/call_forwarding.js');

var mocksForCallForwarding = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/callForwarding >', function() {
  var realSIMSlotManager;
  var realMozSettings;
  var realSettingsHelper;
  var realAsyncStorage;
  mocksForCallForwarding.attachTestHelpers();

  // Must be in sync with nsIDOMMozMobileCFInfo interface.
  var cfReason = {
    CALL_FORWARD_REASON_UNCONDITIONAL: 0,
    CALL_FORWARD_REASON_MOBILE_BUSY: 1,
    CALL_FORWARD_REASON_NO_REPLY: 2,
    CALL_FORWARD_REASON_NOT_REACHABLE: 3,
    CALL_FORWARD_REASON_ALL_CALL_FORWARDING: 4,
    CALL_FORWARD_REASON_ALL_CONDITIONAL_CALL_FORWARDING: 5
  };

  var cfAction = {
    CALL_FORWARD_ACTION_DISABLE: 0,
    CALL_FORWARD_ACTION_ENABLE: 1,
    CALL_FORWARD_ACTION_QUERY_STATUS: 2,
    CALL_FORWARD_ACTION_REGISTRATION: 3,
    CALL_FORWARD_ACTION_ERASURE: 4
  };

  suiteSetup(function() {
    realMozSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    realSIMSlotManager = window.SIMSlotManager;
    window.SIMSlotManager = MockSIMSlotManager;

    realSettingsHelper = window.SettingsHelper;
    window.SettingsHelper = MockSettingsHelper;

    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockasyncStorage;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realMozSettings;
    window.SIMSlotManager = realSIMSlotManager;
    window.SettingsHelper = realSettingsHelper;
    window.asyncStorage = realAsyncStorage;
  });

  setup(function() {
    MockLazyLoader.mLoadRightAway = true;
    this.sinon.spy(MockLazyLoader, 'load');
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

    this.callForwarding = BaseModule.instantiate('CallForwarding');
  });

  teardown(function() {
    MockSettingsHelper.mTeardown();
    MockNavigatorSettings.mTeardown();
    MockasyncStorage.mTeardown();
  });

  suite('settings changed', function() {
    var settingsCore;
    setup(function() {
      settingsCore = BaseModule.instantiate('SettingsCore');
      settingsCore.start();
      this.callForwarding.start();
    });

    teardown(function() {
      this.callForwarding.stop();
      settingsCore.stop();
    });

    test('Should lazy load icon', function() {
      MockNavigatorSettings.mTriggerObservers('ril.cf.enabled',
        { settingValue: [true] });
      assert.isTrue(MockLazyLoader.load.calledWith(
        ['js/call_forwarding_icon.js']));
    });

    test('Should update icon', function() {
      this.callForwarding.icon = new CallForwardingsIcon(this.callForwarding);
      this.sinon.stub(this.callForwarding.icon, 'update');
      MockNavigatorSettings.mTriggerObservers('ril.cf.enabled',
        { settingValue: [false] });
      assert.isTrue(this.callForwarding.icon.update.called);
    });
  });

  suite('start()', function() {
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
      setup(function() {
        this.callForwarding.start();
        this.sinon.spy(window.asyncStorage, 'getItem');

        // _callForwardingIconInitializedStates will be true after calling
        // callForwarding.start(), set to false so we can test different cases.
        this.callForwarding._callForwardingIconInitializedStates[0] = false;

        // MockSettingsHelper.instances['ril.cf.enabled'].value[0] is false
        // by default, set to true and see if it changes to correct value.
        MockSettingsHelper.instances['ril.cf.enabled'].value[0] = true;
      });

      teardown(function() {
        // Move back 'ril.cf.enabled' default settings value
        MockSettingsHelper.instances['ril.cf.enabled'].value[0] = false;
      });

      test('should early return if the slot has been initialized', function() {
        this.callForwarding._callForwardingIconInitializedStates[0] = true;
        this.callForwarding._initCallForwardingState(this.slots[0]);
        sinon.assert.notCalled(window.asyncStorage.getItem);
      });

      test('should early return and set call forwarding to false ' +
        'if the sim card is not available', function(done) {
          this.slots[0].simCard = null;
          this.callForwarding._initCallForwardingState(this.slots[0]);
          sinon.assert.notCalled(window.asyncStorage.getItem);
          setTimeout(function() {
            assert.isFalse(
              MockSettingsHelper.instances['ril.cf.enabled'].value[0]);
            done();
          });
      });

      test('should early return and set call forwarding to false ' +
        'if the card state is not ready', function(done) {
          this.slots[0].simCard.cardState = 'unknown';
          this.callForwarding._initCallForwardingState(this.slots[0]);
          sinon.assert.notCalled(window.asyncStorage.getItem);
          setTimeout(function() {
            assert.isFalse(
              MockSettingsHelper.instances['ril.cf.enabled'].value[0]);
            done();
          });
      });

      test('should early return and set call forwarding to false ' +
        'if the iccid is not available', function(done) {
          this.slots[0].simCard.iccInfo = {
            iccid: null
          };
          this.callForwarding._initCallForwardingState(this.slots[0]);
          sinon.assert.notCalled(window.asyncStorage.getItem);
          setTimeout(function() {
            assert.isFalse(
              MockSettingsHelper.instances['ril.cf.enabled'].value[0]);
            done();
          });
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

    [cfReason.CALL_FORWARD_REASON_UNCONDITIONAL,
     cfReason.CALL_FORWARD_REASON_ALL_CALL_FORWARDING].forEach(
      function(reason) {
        suite('_updateCallForwardingIconState()', function() {
          setup(function() {
            this.event = {
              reason: reason,
              action: cfAction.CALL_FORWARD_ACTION_ENABLE
            };

            this.callForwarding.start();
            this.callForwarding.icon =
              new CallForwardingsIcon(this.callForwarding);
          });

          test('should early return if the event is not available', function() {
            sinon.spy(this.callForwarding._callForwardingHelper, 'get');
            this.callForwarding._updateCallForwardingIconState(this.slots[0]);
            sinon.assert.notCalled(
              this.callForwarding._callForwardingHelper.get);
          });

          test('should early return if it is not unconditional call forwarding',
            function() {
              this.event.reason = 'otherReason';
              sinon.spy(this.callForwarding._callForwardingHelper, 'get');
              this.callForwarding._updateCallForwardingIconState(this.slots[0],
                this.event);
              sinon.assert.notCalled(
                this.callForwarding._callForwardingHelper.get);
          });

          test('should set the icon state to false when erase the setting ' +
            'successfully', function(done) {
              this.event.action = cfAction.CALL_FORWARD_ACTION_ERASURE;
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
                this.event.action = cfAction.CALL_FORWARD_ACTION_REGISTRATION;
                this.callForwarding._updateCallForwardingIconState(
                  this.slots[0], this.event);
                setTimeout(function() {
                  assert.isTrue(
                    MockSettingsHelper.instances['ril.cf.enabled'].value[0]);
                  done();
                });
              });

              test('CALL_FORWARD_ACTION_ENABLE', function(done) {
                this.event.action = cfAction.CALL_FORWARD_ACTION_ENABLE;
                this.callForwarding._updateCallForwardingIconState(
                  this.slots[0], this.event);
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
