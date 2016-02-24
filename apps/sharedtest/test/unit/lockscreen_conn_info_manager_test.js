/* globals LockScreenConnInfoManager, MobileOperator, MockMobileconnection,
           MockMobileOperator, MockNavigatorMozIccManager,
           MockNavigatorSettings, MockSIMSlot, MockSIMSlotManager, MocksHelper,
           SIMSlotManager */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_simslot.js');
require('/shared/test/unit/mocks/mock_simslot_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_mobile_operator.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/js/lockscreen_connection_info_manager.js');

var mocksHelperForLockScreenConnInfoManager = new MocksHelper([
  'MobileOperator',
  'SettingsListener',
  'SIMSlotManager'
]).init();

suite('system/LockScreenConnInfoManager >', function() {
  var subject;
  var realL10n;
  var realIccManager;
  var realMozSettings;
  var domConnStates;
  var DUMMYTEXT1 = 'foo';

  mocksHelperForLockScreenConnInfoManager.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = window.MockL10n;

    realIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    realMozSettings = window.navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozIccManager = realIccManager;
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    MockNavigatorSettings.mSetup();

    domConnStates = document.createElement('div');
    domConnStates.id = 'lockscreen-conn-states';
  });

  teardown(function() {
    MockNavigatorMozIccManager.mTeardown();
    MockNavigatorSettings.mTeardown();
  });

  suite('Initialization', function() {
    setup(function() {
      subject = new LockScreenConnInfoManager();
    });

    teardown(function() {
      subject.teardown();
    });

    test('Ensure that the UI is immediately updated when starting', function() {
      this.sinon.spy(subject, 'updateConnStates');
      subject._initialize(domConnStates);
      sinon.assert.calledOnce(subject.updateConnStates);
    });
  });

  suite('Update conn states when events', function() {
    var mockMobileConnection;
    var iccObj;

    suiteSetup(function() {
      mockMobileConnection = MockMobileconnection();
    });

    setup(function() {
      MockMobileOperator.mOperator = 'operator';
      MockMobileOperator.mCarrier = 'carrier';
      MockMobileOperator.mRegion = 'region';

      MockSIMSlotManager.mInstances =
        [new MockSIMSlot(mockMobileConnection, 0)];
      iccObj = MockSIMSlotManager.mInstances[0].simCard;

      // add a sim card
      mockMobileConnection.iccId = 'iccid1';
      mockMobileConnection.voice = {};
      MockNavigatorMozIccManager.addIcc('iccid1');

      subject = new LockScreenConnInfoManager();
      subject._initialize(domConnStates);

      this.sinon.stub(MockSIMSlotManager, 'isMultiSIM').returns(false);
      this.sinon.stub(MockSIMSlotManager, 'noSIMCardOnDevice').returns(false);

      this.sinon.stub(subject, 'updateConnStates');
      this.sinon.stub(subject, 'updateConnState');
    });

    teardown(function() {
      subject.teardown();
      mockMobileConnection.mTeardown();
      subject.updateConnStates.restore();
      subject.updateConnState.restore();
    });

    // sim related changes
    test('voicechange', function() {
      mockMobileConnection.triggerEventListeners('voicechange', {});
      sinon.assert.called(subject.updateConnState);
    });

    ['simslot-cardstatechange',
     'simslot-iccinfochange'].forEach(function(eventName) {
      test(eventName, function() {
        var simInfo = {
          conn: mockMobileConnection,
          index: 0
        };
        window.dispatchEvent(new CustomEvent(eventName, { detail: simInfo }));
        sinon.assert.calledWith(subject.updateConnState, simInfo);
      });
    });

    test('cellbroadcastmsgchanged', function() {
      var testLabelName = 'testLabelName';
      window.dispatchEvent(new CustomEvent('cellbroadcastmsgchanged', {
        detail: testLabelName
      }));
      assert.isTrue(subject.updateConnStates.called);
      assert.equal(subject._cellbroadcastLabel, testLabelName);
    });

    test('ril.radio.disabled', function() {
      var airplaneModeEnabled = true;
      MockNavigatorSettings.createLock().set({
        'ril.radio.disabled': airplaneModeEnabled
      });
      assert.isTrue(subject.updateConnStates.called);
      assert.equal(subject._airplaneMode, airplaneModeEnabled);
    });

    test('ril.telephony.defaultServiceId', function() {
      var defaultServiceId = 'iccid1';
      MockNavigatorSettings.createLock().set({
        'ril.telephony.defaultServiceId': defaultServiceId
      });
      assert.isTrue(subject.updateConnStates.called);
      assert.equal(subject._telephonyDefaultServiceId, defaultServiceId);
    });
  });

  suite('Single sim devices', function() {
    var mockMobileConnection;
    var domConnstateIDLine;
    var domConnstateL1;
    var domConnstateL2;
    var iccObj;

    suiteSetup(function() {
      mockMobileConnection = MockMobileconnection();
    });

    setup(function() {
      MockMobileOperator.mOperator = 'operator';
      MockMobileOperator.mCarrier = 'carrier';
      MockMobileOperator.mRegion = 'region';

      MockSIMSlotManager.mInstances =
        [new MockSIMSlot(mockMobileConnection, 0)];
      iccObj = MockSIMSlotManager.mInstances[0].simCard;

      // add a sim card
      mockMobileConnection.iccId = 'iccid1';
      mockMobileConnection.voice = {};
      MockNavigatorMozIccManager.addIcc('iccid1');

      subject = new LockScreenConnInfoManager();
      subject._initialize(domConnStates);

      var domConnState = domConnStates.children[0];
      domConnstateIDLine = domConnState.children[0];
      domConnstateL1 = domConnState.children[1];
      domConnstateL2 = domConnState.children[2];

      this.sinon.stub(MockSIMSlotManager, 'isMultiSIM').returns(false);
      this.sinon.stub(MockSIMSlotManager, 'noSIMCardOnDevice').returns(false);
    });

    teardown(function() {
      subject.teardown();
      mockMobileConnection.mTeardown();
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
        MobileOperator.mCarrier = carrier;
        MobileOperator.mRegion = region;

        subject._cellbroadcastLabel = DUMMYTEXT1;

        var l10nSpy = sinon.spy(navigator.mozL10n, 'setAttributes');

        var l10nArgs = {
          carrier: carrier,
          region: region
        };

        subject.updateConnStates();

        assert.ok(l10nSpy.calledWith(domConnstateL2,
                                     'operator-info',
                                     l10nArgs));

        navigator.mozL10n.setAttributes.restore();

        subject._cellbroadcastLabel = null;
    });

    test('Show no network', function() {
      mockMobileConnection.voice = {
        connected: true,
        state: 'notSearching'
      };
      subject.updateConnStates();
      assert.equal(domConnstateL1.dataset.l10nId, 'noNetwork');
    });

    test('Show searching', function() {
      mockMobileConnection.voice = {
        connected: false,
        emergencyCallsOnly: false
      };
      subject.updateConnStates();
      assert.equal(domConnstateL1.dataset.l10nId, 'searching');
    });

    test('Show roaming', function() {
      mockMobileConnection.voice = {
        connected: true,
        emergencyCallsOnly: false,
        roaming: true
      };

      var l10nSpy = sinon.spy(navigator.mozL10n, 'setAttributes');

      var l10nArgs = {
        operator: MockMobileOperator.mOperator
      };

      subject.updateConnStates();

      assert.ok(l10nSpy.calledWith(domConnstateL1,
                                   'roaming',
                                   l10nArgs));

      navigator.mozL10n.setAttributes.restore();
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

        var l10nSpy = this.sinon.spy(navigator.mozL10n, 'setAttributes');
        subject.updateConnStates();
        assert.ok(l10nSpy.calledWith(domConnstateL1, 'roaming', l10nArgs),
          'Roaming network name displayed localized with proper string');

        navigator.mozL10n.setAttributes.restore();
    });

    suite('Show correct card states when emergency calls only', function() {
      test('unknown', function() {
        mockMobileConnection.voice = {
          connected: false,
          emergencyCallsOnly: true
        };
        iccObj.cardState = 'unknown';

        subject.updateConnStates();
        assert.equal(domConnstateL1.dataset.l10nId, 'emergencyCallsOnly');
        assert.equal(domConnstateL2.dataset.l10nId,
          'emergencyCallsOnly-unknownSIMState');
      });

      test('other card state', function() {
        mockMobileConnection.voice = {
          connected: false,
          emergencyCallsOnly: true
        };
        iccObj.cardState = 'otherCardState';

        subject.updateConnStates();
        assert.equal(domConnstateL1.dataset.l10nId, 'emergencyCallsOnly');
        assert.isFalse(domConnstateL2.hasAttribute('data-l10n-id'));
      });

      ['pinRequired', 'pukRequired', 'networkLocked',
       'serviceProviderLocked', 'corporateLocked', 'network1Locked',
       'network2Locked', 'hrpdNetworkLocked', 'ruimCorporateLocked',
       'ruimServiceProviderLocked'].forEach(function(cardState) {
        test(cardState, function() {
          mockMobileConnection.voice = {
            connected: false,
            emergencyCallsOnly: true
          };
          iccObj.cardState = cardState;

          subject.updateConnStates();
          assert.equal(domConnstateL1.dataset.l10nId, 'emergencyCallsOnly');
          assert.equal(domConnstateL2.dataset.l10nId,
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
    });

    setup(function() {
      MockMobileOperator.mOperator = 'operator';
      MockMobileOperator.mCarrier = 'carrier';
      MockMobileOperator.mRegion = 'region';

      MockSIMSlotManager.mInstances =
        [new MockSIMSlot(mockMobileConnections[0], 0),
         new MockSIMSlot(mockMobileConnections[1], 1)];

      iccObj1 = MockSIMSlotManager.mInstances[0].simCard;
      iccObj2 = MockSIMSlotManager.mInstances[1].simCard;

      mockMobileConnections[0].iccId = 'iccid1';
      mockMobileConnections[0].voice = {};
      MockNavigatorMozIccManager.addIcc('iccid1');

      mockMobileConnections[1].iccId = 'iccid2';
      mockMobileConnections[1].voice = {};
      MockNavigatorMozIccManager.addIcc('iccid2');

      subject = new LockScreenConnInfoManager();
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
      subject.teardown();
      mockMobileConnections[0].mTeardown();
      mockMobileConnections[1].mTeardown();
    });

    suite('No sim card', function() {
      setup(function() {
        this.sinon.stub(SIMSlotManager, 'noSIMCardOnDevice').returns(true);
      });

      test('Should only show one conn state', function() {
        subject.updateConnStates();

        assert.equal(domConnStateList[0].domConnstateL1.dataset.l10nId,
          'emergencyCallsOnly-noSIM');
        assert.isFalse(
          domConnStateList[1].domConnstateL1.hasAttribute('data-l10n-id'));
        assert.isFalse(
          domConnStateList[1].domConnstateL2.hasAttribute('data-l10n-id'));
      });

      test('Should show emergency call text', function() {
        mockMobileConnections[0].voice.emergencyCallsOnly = true;
        subject.updateConnStates();

        assert.equal(domConnStateList[0].domConnstateL1.dataset.l10nId,
          'emergencyCallsOnly');
        assert.equal(domConnStateList[0].domConnstateL2.dataset.l10nId,
          'emergencyCallsOnly-noSIM');
        assert.isFalse(
          domConnStateList[1].domConnstateL1.hasAttribute('data-l10n-id'));
        assert.isFalse(
          domConnStateList[1].domConnstateL2.hasAttribute('data-l10n-id'));
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

        assert.equal(simIDLine.dataset.l10nId, 'lockscreen-sim-id');
        assert.deepEqual(JSON.parse(simIDLine.dataset.l10nArgs), {'n': 1});
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
          assert.equal(domConnStateList[0].domConnstateL1.dataset.l10nId,
            'airplaneMode');
          assert.isFalse(
            domConnStateList[0].domConnstateL2.hasAttribute('data-l10n-id'));

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

        assert.equal(simIDLine1.dataset.l10nId, 'lockscreen-sim-id');
        assert.deepEqual(JSON.parse(simIDLine1.dataset.l10nArgs), {'n': 1});
        assert.equal(simIDLine2.dataset.l10nId, 'lockscreen-sim-id');
        assert.deepEqual(JSON.parse(simIDLine2.dataset.l10nArgs), {'n': 2});
      });

      test('Should hide sim IDs if all sim cards are not connected to networks',
        function() {
          sinon.stub(SIMSlotManager, 'noSIMCardConnectedToNetwork')
            .returns(true);
          subject.updateConnStates();

          var simIDLine1 = domConnStateList[0].domConnstateIDLine;
          var connState1line1 = domConnStateList[0].domConnstateL1;
          var simIDLine2 = domConnStateList[1].domConnstateIDLine;
          assert.isTrue(simIDLine1.hidden);
          assert.isTrue(simIDLine2.hidden);
          assert.equal(
            connState1line1.getAttribute('data-l10n-id'),
            'emergencyCallsOnly');
          SIMSlotManager.noSIMCardConnectedToNetwork.restore();
      });

      test('Should show operator names on Line 1', function() {
        subject.updateConnStates();

        var connState1line1 = domConnStateList[0].domConnstateL1;
        var connState2line1 = domConnStateList[1].domConnstateL1;
        assert.equal(connState1line1.textContent, MockMobileOperator.mOperator);
        assert.equal(connState2line1.textContent, MockMobileOperator.mOperator);
      });

      test('Should show carrier and region on Line 2', function() {
        var l10nSpy = sinon.spy(navigator.mozL10n, 'setAttributes');

        var l10nArgs = {
          carrier: MockMobileOperator.mCarrier,
          region: MockMobileOperator.mRegion
        };

        subject.updateConnStates();

        assert.ok(l10nSpy.calledWith(domConnStateList[0].domConnstateL2,
                                     'operator-info',
                                     l10nArgs));

        assert.ok(l10nSpy.calledWith(domConnStateList[1].domConnstateL2,
                                     'operator-info',
                                     l10nArgs));
      });

      test('Should display "emergency calls only" if target sim is the ' +
        'primary one and is emergency calls only', function() {
          mockMobileConnections[0].voice.emergencyCallsOnly = true;
          subject._telephonyDefaultServiceId = 0;
          subject.updateConnStates();

          var connState1line1 = domConnStateList[0].domConnstateL1;
          assert.equal(connState1line1.dataset.l10nId, 'emergencyCallsOnly');
      });

      test('Should hide the conn state of the target sim if it is not the ' +
        'primary one but is emergency calls only', function() {
          mockMobileConnections[0].voice.emergencyCallsOnly = true;
          subject._telephonyDefaultServiceId = 1;
          subject.updateConnStates();

          assert.isTrue(domConnStateList[0].hidden);
      });
    });
  });
});
