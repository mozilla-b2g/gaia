'use strict';

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/js/mock_simslot.js');
requireApp('system/js/mock_simslot_manager.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
requireApp('system/shared/test/unit/mocks/mock_mobile_operator.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/lockscreen_connection_info_manager.js');

if (!this.MobileOperator) {
  this.MobileOperator = null;
}

if (!this.SettingsListener) {
  this.SettingsListener = null;
}

if (!this.SIMSlotManager) {
  this.SIMSlotManager = null;
}

suite('system/LockScreenConnInfoManager >', function() {
  var subject;
  var realL10n;
  var realMobileOperator;
  var realSIMSlotManager;
  var realIccManager;
  var realSettingsListener;
  var realMozSettings;
  var domConnStates;
  var DUMMYTEXT1 = 'foo';

  setup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = window.MockL10n;

    realMobileOperator = window.MobileOperator;
    window.MobileOperator = MockMobileOperator;

    realIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    realMozSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;

    realSIMSlotManager = window.SIMSlotManager;
    window.SIMSlotManager = MockSIMSlotManager;

    domConnStates = document.createElement('div');
    domConnStates.id = 'lockscreen-conn-states';
    document.body.appendChild(domConnStates);
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    window.MobileOperator = realMobileOperator;
    window.navigator.mozIccManager = realIccManager;
    window.SettingsListener = realSettingsListener;
    window.SIMSlotManager = realSIMSlotManager;

    document.body.removeChild(domConnStates);
    MockSettingsListener.mTeardown();
  });

  suiteTeardown(function() {
    MockSIMSlotManager.mTeardown();
  });

  suite('Single sim devices', function() {
    var mockMobileConnection;
    var domConnstateIDLine;
    var domConnstateL1;
    var domConnstateL2;
    var iccObj;

    suiteSetup(function() {
      mockMobileConnection = MockMobileconnection();

      MockMobileOperator.mOperator = 'operator';
      MockMobileOperator.mCarrier = 'carrier';
      MockMobileOperator.mRegion = 'region';

      MockSIMSlotManager.mInstances =
        [new MockSIMSlot(mockMobileConnection, 0)];
      iccObj = MockSIMSlotManager.mInstances[0].simCard;

      subject = new LockScreenConnInfoManager();
    });

    suiteTeardown(function() {
      MockMobileOperator.mTeardown();
    });

    setup(function() {
      // add a sim card
      mockMobileConnection.iccId = 'iccid1';
      MockNavigatorMozIccManager.addIcc('iccid1');

      subject._initialize(domConnStates);

      var domConnState = domConnStates.children[0];
      domConnstateIDLine = domConnState.children[0];
      domConnstateL1 = domConnState.children[1];
      domConnstateL2 = domConnState.children[2];

      this.sinon.stub(MockSIMSlotManager, 'isMultiSIM').returns(false);
      this.sinon.stub(MockSIMSlotManager, 'noSIMCardOnDevice').returns(false);
    });

    teardown(function() {
      mockMobileConnection.mTeardown();
      MockNavigatorMozIccManager.mTeardown();
    });

    test('2G Mode: should update cell broadcast info on connstate Line 2',
      function() {
        mockMobileConnection.voice = {
          connected: true,
          type: 'gsm'
        };

        subject._cellbroadcastLabel = DUMMYTEXT1;
        subject.updateConnStates();
        assert.equal(domConnstateL2.textContent, DUMMYTEXT1);

        subject._cellbroadcastLabel = null;
    });

    test('3G Mode: should update carrier and region info on connstate Line 2',
      function() {
        mockMobileConnection.voice = {
          connected: true,
          type: 'wcdma'
        };

        var carrier = 'TIM';
        var region = 'SP';
        var exceptedText = 'TIM SP';
        MobileOperator.mCarrier = carrier;
        MobileOperator.mRegion = region;

        subject._cellbroadcastLabel = DUMMYTEXT1;
        subject.updateConnStates();
        assert.equal(domConnstateL2.textContent, exceptedText);

        subject._cellbroadcastLabel = null;
    });

    test('Show no network', function() {
      mockMobileConnection.voice = {
        connected: true,
        state: 'notSearching'
      };
      subject.updateConnStates();
      assert.equal(domConnstateL1.textContent, 'noNetwork');
    });

    test('Show searching', function() {
      mockMobileConnection.voice = {
        connected: false,
        emergencyCallsOnly: false
      };
      subject.updateConnStates();
      assert.equal(domConnstateL1.textContent, 'searching');
    });

    test('Show roaming', function() {
      mockMobileConnection.voice = {
        connected: true,
        emergencyCallsOnly: false,
        roaming: true
      };
      subject.updateConnStates();
      assert.equal(domConnstateL1.textContent,
        'roaming{"operator":"' + MockMobileOperator.mOperator + '"}');
    });

    test('Show localized roaming',
      function() {
        mockMobileConnection.voice = {
          connected: true,
          emergencyCallsOnly: false,
          roaming: true
        };

        var l10nArgs = {
          operator: 'operator'
        };

        var l10nSpy = this.sinon.spy(navigator.mozL10n, 'localize');
        subject.updateConnStates();
        assert.ok(l10nSpy.calledWith(domConnstateL1, 'roaming', l10nArgs),
          'Roaming network name displayed localized with proper string');
    });

    suite('Show correct card states when emergency calls only', function() {
      test('unknown', function() {
        mockMobileConnection.voice = {
          connected: false,
          emergencyCallsOnly: true
        };
        iccObj.cardState = 'unknown';

        subject.updateConnStates();
        assert.equal(domConnstateL1.textContent, 'emergencyCallsOnly');
        assert.equal(domConnstateL2.textContent,
          'emergencyCallsOnly-unknownSIMState');
      });

      test('other card state', function() {
        mockMobileConnection.voice = {
          connected: false,
          emergencyCallsOnly: true
        };
        iccObj.cardState = 'otherCardState';

        subject.updateConnStates();
        assert.equal(domConnstateL1.textContent, 'emergencyCallsOnly');
        assert.equal(domConnstateL2.textContent, '');
      });

      ['pinRequired', 'pukRequired', 'networkLocked',
       'serviceProviderLocked', 'corporateLocked'].forEach(function(cardState) {
        test(cardState, function() {
          mockMobileConnection.voice = {
            connected: false,
            emergencyCallsOnly: true
          };
          iccObj.cardState = cardState;

          subject.updateConnStates();
          assert.equal(domConnstateL1.textContent, 'emergencyCallsOnly');
          assert.equal(domConnstateL2.textContent,
            'emergencyCallsOnly-' + cardState);
        });
      });
    });
  });

  suite('Multiple sims devices', function() {
    var domConnStateList;
    var mockMobileConnections = [];
    var iccObj1;
    var iccObj2;

    suiteSetup(function() {
      mockMobileConnections = [
        MockMobileconnection(),
        MockMobileconnection()
      ];

      MockMobileOperator.mOperator = 'operator';
      MockMobileOperator.mCarrier = 'carrier';
      MockMobileOperator.mRegion = 'region';

      MockSIMSlotManager.mInstances =
        [new MockSIMSlot(mockMobileConnections[0], 0),
         new MockSIMSlot(mockMobileConnections[1], 1)];

      iccObj1 = MockSIMSlotManager.mInstances[0].simCard;
      iccObj2 = MockSIMSlotManager.mInstances[1].simCard;

      subject = new LockScreenConnInfoManager();
    });

    suiteTeardown(function() {
      MockMobileOperator.mTeardown();
    });

    setup(function() {
      mockMobileConnections[0].iccId = 'iccid1';
      mockMobileConnections[0].voice = {};
      MockNavigatorMozIccManager.addIcc('iccid1');

      mockMobileConnections[1].iccId = 'iccid2';
      mockMobileConnections[1].voice = {};
      MockNavigatorMozIccManager.addIcc('iccid2');

      subject._initialize(domConnStates);

      domConnStateList = [];
      Array.prototype.forEach.call(domConnStates.children,
        function(domConnState) {
          domConnState.domConnstateIDLine = domConnState.children[0];
          domConnState.domConnstateL1 = domConnState.children[1];
          domConnState.domConnstateL2 = domConnState.children[2];
          domConnStateList.push(domConnState);
      });

      this.sinon.stub(SIMSlotManager, 'isMultiSIM').returns(true);
    });

    teardown(function() {
      mockMobileConnections[0].mTeardown();
      mockMobileConnections[1].mTeardown();
      MockNavigatorMozIccManager.mTeardown();
    });

    suite('No sim card', function() {
      setup(function() {
        this.sinon.stub(SIMSlotManager, 'noSIMCardOnDevice').returns(true);
      });

      test('Should only show one conn state', function() {
        subject.updateConnStates();

        assert.equal(domConnStateList[0].domConnstateL1.textContent,
          'emergencyCallsOnly-noSIM');
        assert.equal(domConnStateList[1].domConnstateL1.textContent, '');
        assert.equal(domConnStateList[1].domConnstateL2.textContent, '');
      });

      test('Should show emergency call text', function() {
        mockMobileConnections[0].voice.emergencyCallsOnly = true;
        subject.updateConnStates();

        assert.equal(domConnStateList[0].domConnstateL1.textContent,
          'emergencyCallsOnly');
        assert.equal(domConnStateList[0].domConnstateL2.textContent,
          'emergencyCallsOnly-noSIM');
        assert.equal(domConnStateList[1].domConnstateL1.textContent, '');
        assert.equal(domConnStateList[1].domConnstateL2.textContent, '');
      });
    });

    suite('One sim card inserted', function() {
      suiteSetup(function() {
        mockMobileConnections[0].voice = {
          connected: true,
          type: 'gsm'
        };
        mockMobileConnections[1].voice = {};
      });

      setup(function() {
        navigator.mozIccManager.removeIcc('iccid2');
        MockSIMSlotManager.mInstances[1].isAbsent = function() { return true; };
      });

      test('Should show sim ID', function() {
        subject.updateConnStates();

        var simIDLine = domConnStateList[0].domConnstateIDLine;
        assert.isFalse(simIDLine.hidden);
        assert.equal(simIDLine.textContent, 'SIM 1');
      });

      test('Should show only one conn state', function() {
        subject.updateConnStates();

        assert.isFalse(domConnStateList[0].hidden);
        assert.isTrue(domConnStateList[1].hidden);
      });

      test('Should show airplane mode on connstate 1 Line 1 when in ' +
        'airplane mode', function() {
          subject._airplaneMode = true;
          subject.updateConnStates();

          assert.isFalse(domConnStateList[0].hidden);
          assert.isTrue(domConnStateList[0].domConnstateIDLine.hidden);
          assert.equal(domConnStateList[0].domConnstateL1.textContent,
            'airplaneMode');
          assert.equal(domConnStateList[0].domConnstateL2.textContent, '');

          subject._airplaneMode = false;
      });
    });

    suite('Two sim cards inserted', function() {
      setup(function() {
        MockSIMSlotManager.mInstances[0].conn.voice = {
          connected: true,
          type: 'gsm'
        };
        MockSIMSlotManager.mInstances[1].conn.voice = {
          connected: true,
          type: 'gsm'
        };
        this.sinon.stub(SIMSlotManager, 'noSIMCardOnDevice').returns(false);
      });

      test('Should show sim IDs', function() {
        subject.updateConnStates();

        var simIDLine1 = domConnStateList[0].domConnstateIDLine;
        var simIDLine2 = domConnStateList[1].domConnstateIDLine;
        assert.isFalse(simIDLine1.hidden);
        assert.isFalse(simIDLine2.hidden);
        assert.equal(simIDLine1.textContent, 'SIM 1');
        assert.equal(simIDLine2.textContent, 'SIM 2');
      });

      test('Should show operator names on Line 1', function() {
        subject.updateConnStates();

        var connState1line1 = domConnStateList[0].domConnstateL1;
        var connState2line1 = domConnStateList[1].domConnstateL1;
        assert.equal(connState1line1.textContent, MockMobileOperator.mOperator);
        assert.equal(connState2line1.textContent, MockMobileOperator.mOperator);
      });

      test('Should show carrier and region on Line 2', function() {
        subject.updateConnStates();

        var connState1line2 = domConnStateList[0].domConnstateL2;
        var connState2line2 = domConnStateList[1].domConnstateL2;
        assert.equal(connState1line2.textContent,
          MockMobileOperator.mCarrier + ' ' + MockMobileOperator.mRegion);
        assert.equal(connState2line2.textContent,
          MockMobileOperator.mCarrier + ' ' + MockMobileOperator.mRegion);
      });
    });
  });
});
