/* global IccHelper, asyncStorage, CallForwarding,
   MocksHelper, MockNavigatorSettings, MockNavigatorMozMobileConnections,
   MockSettingsHelper */
'use strict';

requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('system/shared/test/unit/mocks/mock_icc_helper.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_settings_helper.js');
requireApp('system/test/unit/mock_asyncStorage.js');
requireApp('system/js/call_forwarding.js');

var mocksForCallForwarding = new MocksHelper([
  'NavigatorMozMobileConnections',
  'IccHelper',
  'asyncStorage',
  'SettingsHelper'
]).init();

suite('system/call_forwarding.js', function() {
  var realMozSettings;
  var realMozMobileConnections;
  var subject;
  mocksForCallForwarding.attachTestHelpers();

  suiteSetup(function() {
    realMozSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    realMozMobileConnections = window.navigator.mozMobileConnections;
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realMozSettings;
    window.navigator.mozMobileConnections = realMozMobileConnections;
  });

  setup(function() {
    subject = new CallForwarding();
  });

  teardown(function() {
    // cleanup all events to make each test isolated
    IccHelper.mEventListeners = {
      'cardstatechange': [],
      'iccinfochange': []
    };
  });

  suite('when IccHelper\'s cardstate is changed', function() {
    setup(function() {
      this.sinon.stub(subject, 'initCallForwardingIconState');
      IccHelper.mEventListeners.cardstatechange[0]();
    });
    test('initCallForwardingIconState would be triggered', function() {
      assert.isTrue(subject.initCallForwardingIconState.called);
    });
  });

  suite('when IccHelper\'s info is changed', function() {
    setup(function() {
      this.sinon.stub(subject, 'initCallForwardingIconState');
      IccHelper.mEventListeners.iccinfochange[0]();
    });
    test('initCallForwardingIconState would be triggered', function() {
      assert.isTrue(subject.initCallForwardingIconState.called);
    });
  });

  suite('when mobileConnection\'s cfstate is changed', function() {
    var stateChangeCallback;

    setup(function() {
      this.sinon.stub(asyncStorage, 'setItem');
      var mobileConnection = window.navigator.mozMobileConnections[0];
      stateChangeCallback = mobileConnection.mEventListeners.cfstatechange[0];
    });

    suite('but cf reason is busy', function() {
      setup(function() {
        stateChangeCallback({
          reason: subject._cfReason.CALL_FORWARD_REASON_MOBILE_BUSY
        });
      });
      test('nothing happened', function() {
        assert.isTrue(!asyncStorage.setItem.called);
      });
    });

    suite('and cf reason is unconditional, but cf action is wrong', function() {
      setup(function() {
        stateChangeCallback({
          reason: subject._cfReason.CALL_FORWARD_REASON_UNCONDITIONAL,
          success: true,
          action: subject._cfAction.CALL_FORWARD_ACTION_DISABLE
        });
      });
      test('will disable call forwarding', function() {
        // assert.isFalse(MockSettingsHelperInstance.set.lastCall.args[0]);
        assert.isFalse(MockSettingsHelper.instances['ril.cf.enabled'].value);
        assert.isFalse(asyncStorage.setItem.lastCall.args[1]);
      });
    });

    suite('and cf reason is registration', function() {
      setup(function() {
        stateChangeCallback({
          reason: subject._cfReason.CALL_FORWARD_REASON_UNCONDITIONAL,
          success: true,
          action: subject._cfAction.CALL_FORWARD_ACTION_REGISTRATION
        });
      });
      test('will enable call forwarding', function() {
        assert.isTrue(MockSettingsHelper.instances['ril.cf.enabled'].value);
        assert.isTrue(asyncStorage.setItem.lastCall.args[1]);
      });
    });

    suite('and cf reason is enable', function() {
      setup(function() {
        stateChangeCallback({
          reason: subject._cfReason.CALL_FORWARD_REASON_UNCONDITIONAL,
          success: true,
          action: subject._cfAction.CALL_FORWARD_ACTION_ENABLE
        });
      });
      test('will enable call forwarding', function() {
        assert.isTrue(MockSettingsHelper.instances['ril.cf.enabled'].value);
        assert.isTrue(asyncStorage.setItem.lastCall.args[1]);
      });
    });
  });

  suite('when settings key is changed', function() {
    var callback;

    setup(function() {
      this.sinon.stub(asyncStorage, 'setItem');
      callback =
        window.navigator.mozSettings.mObservers['ril.cf.carrier.enabled'][0];
    });

    suite('and value is true', function() {
      setup(function() {
        callback({
          settingValue: true
        });
      });
      test('would change related setting to true', function() {
        assert.isTrue(MockSettingsHelper.instances['ril.cf.enabled'].value);
        assert.isTrue(asyncStorage.setItem.lastCall.args[1]);
      });
    });

    suite('and value is false', function() {
      setup(function() {
        callback({
          settingValue: false
        });
      });
      test('would change related setting to false', function() {
        assert.isFalse(MockSettingsHelper.instances['ril.cf.enabled'].value);
        assert.isFalse(asyncStorage.setItem.lastCall.args[1]);
      });
    });
  });

  suite('initCallForwardingIconState', function() {
    setup(function() {
      this.sinon.stub(asyncStorage, 'getItem');
    });

    teardown(function() {
      IccHelper.mProps.iccInfo = {};
      IccHelper.mProps.cardState = null;
    });

    suite('but icon was initialized before', function() {
      setup(function() {
        subject._cfIconStateInitialized = true;
        subject.initCallForwardingIconState();
      });
      test('nothing happened', function() {
        assert.isFalse(asyncStorage.getItem.called);
      });
    });

    suite('but cardState is not ready', function() {
      setup(function() {
        subject.initCallForwardingIconState();
      });
      test('nothing happened', function() {
        assert.isFalse(asyncStorage.getItem.called);
      });
    });

    suite('and cardState is ready but no iccInfo', function() {
      setup(function() {
        IccHelper.mProps.cardState = 'ready';
        subject.initCallForwardingIconState();
      });
      test('nothing happened', function() {
        assert.isFalse(asyncStorage.getItem.called);
      });
    });

    suite('and cardState, iccId are all ready', function() {
      setup(function() {
        IccHelper.mProps.iccInfo.iccid = '123';
        IccHelper.mProps.cardState = 'ready';
        subject.initCallForwardingIconState();
      });
      test('change value successfully', function() {
        assert.isFalse(MockSettingsHelper.instances['ril.cf.enabled'].value);
        assert.isTrue(asyncStorage.getItem.called);
      });
    });
  });
});
