/* globals CallScreen, CallsHandler, FontSizeManager, HandledCall,
           MockBluetoothHelperInstance, MockCall, MockCallScreen, MockLazyL10n,
           MockMozL10n, MockNavigatormozApps, MockNavigatorMozIccManager,
           MockNavigatormozSetMessageHandler, MockNavigatorMozTelephony,
           MockNavigatorWakeLock, MocksHelper, MockTonePlayer, MockUtils,
           telephonyAddCall, telephonyAddCdmaCall, MockAudioContext,
           MockNavigatorMozMobileConnections, AudioCompetingHelper */

'use strict';

require('/js/audio_competing_helper.js');
require('/test/unit/mock_call_screen.js');
require('/shared/test/unit/mocks/mock_simple_phone_matcher.js');
require('/shared/test/unit/mocks/mock_bluetooth_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_audio.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_settings_url.js');
require('/shared/test/unit/mocks/mock_navigator_wake_lock.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/dialer/mock_call.js');
require('/shared/test/unit/mocks/dialer/mock_handled_call.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');
require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/dialer/mock_tone_player.js');
require('/shared/test/unit/mocks/dialer/mock_utils.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/dialer/mock_font_size_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

var mocksHelperForCallsHandler = new MocksHelper([
  'HandledCall',
  'SettingsListener',
  'CallScreen',
  'LazyL10n',
  'Contacts',
  'TonePlayer',
  'SettingsURL',
  'BluetoothHelper',
  'Utils',
  'Audio',
  'AudioContext',
  'SimplePhoneMatcher',
  'FontSizeManager'
]).init();

suite('calls handler', function() {
  var realMozTelephony;
  var realMozApps;
  var realWakeLock;
  var realMozIccManager;
  var realSetMessageHandler;
  var realMozL10n;
  var realMozMobileConnections;

  mocksHelperForCallsHandler.attachTestHelpers();

  suiteSetup(function(done) {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    realWakeLock = navigator.requestWakeLock;
    navigator.requestWakeLock = MockNavigatorWakeLock.requestWakeLock;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    require('/js/calls_handler.js', done);
  });

  suiteTeardown(function() {
    MockNavigatorMozTelephony.mSuiteTeardown();
    navigator.moztelephony = realMozTelephony;
    navigator.mozApps = realMozApps;
    navigator.requestWakeLock = realWakeLock;
    navigator.mozIccManager = realMozIccManager;
    navigator.mozSetMessageHandler = realSetMessageHandler;
    navigator.mozL10n = realMozL10n;
    navigator.mozMobileConnections = realMozMobileConnections;
  });

  setup(function() {
    this.sinon.useFakeTimers();
    MockNavigatormozSetMessageHandler.mSetup();
    var conn1 = new window.MockMobileconnection();
    conn1.voice = { type: 'edge' };
    MockNavigatorMozMobileConnections.mAddMobileConnection(conn1, 1);
  });

  teardown(function() {
    MockNavigatorMozIccManager.mTeardown();
    MockNavigatorMozTelephony.mTeardown();
    MockNavigatormozSetMessageHandler.mTeardown();
    MockNavigatorMozMobileConnections.mTeardown();
  });

  suite('> telephony.oncallschanged handling', function() {
    suite('> receiving a first incoming call', function() {
      var mockCall;
      var mockHC;

      setup(function() {
        mockCall = new MockCall('12334', 'incoming');
        mockCall.addEventListener(
          'statechange', CallsHandler.updatePlaceNewCall);
        mockCall.addEventListener(
          'statechange', CallsHandler.updateMergeAndOnHoldStatus);
        mockHC = telephonyAddCall.call(this, mockCall);
      });

      test('should instanciate a handled call', function() {
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(HandledCall.calledWith(mockCall));
      });

      test('should insert the handled call node in the CallScreen', function() {
        var insertSpy = this.sinon.spy(MockCallScreen, 'insertCall');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(insertSpy.calledWith(mockHC.node));
      });

      test('should render the CallScreen in incoming mode', function() {
        var renderSpy = this.sinon.spy(MockCallScreen, 'render');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(renderSpy.calledWith('incoming'));
      });

      test('should toggle the CallScreen', function() {
        var toggleSpy = this.sinon.spy(MockCallScreen, 'toggle');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(toggleSpy.calledOnce);
      });

      test('should toggle the showPlaceNewCallButton', function() {
        this.sinon.spy(MockCallScreen, 'showPlaceNewCallButton');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.showPlaceNewCallButton);
      });

      test('should unmute', function() {
        var unmuteSpy = this.sinon.spy(MockCallScreen, 'unmute');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(unmuteSpy.calledOnce);
      });

      test('should switch sound to default out', function() {
        var toDefaultSpy = this.sinon.spy(MockCallScreen, 'switchToDefaultOut');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(toDefaultSpy.calledOnce);
      });

      test('should disable the place new call button while establishing',
      function() {
        this.sinon.spy(MockCallScreen, 'disablePlaceNewCall');
        mockCall.mChangeState('dialing');
        sinon.assert.calledOnce(MockCallScreen.disablePlaceNewCall);
      });

      test('should enable the place new call button when established',
      function() {
        this.sinon.spy(MockCallScreen, 'enablePlaceNewCall');
        mockCall.mChangeState('connected');
        sinon.assert.calledOnce(MockCallScreen.enablePlaceNewCall);
      });

      test('should show the on hold button while establishing', function() {
        this.sinon.spy(MockCallScreen, 'showOnHold');
        mockCall.mChangeState('dialing');
        sinon.assert.calledOnce(MockCallScreen.showOnHold);
      });

      test('should disable the on hold button while establishing', function() {
        this.sinon.spy(MockCallScreen, 'disableOnHold');
        mockCall.mChangeState('dialing');
        sinon.assert.calledOnce(MockCallScreen.disableOnHold);
      });

      test('should show the on hold button when established', function() {
        this.sinon.spy(MockCallScreen, 'showOnHold');
        mockCall.mChangeState('connected');
        sinon.assert.calledOnce(MockCallScreen.showOnHold);
      });

      test('should enable the on hold button when established', function() {
        this.sinon.spy(MockCallScreen, 'enableOnHold');
        mockCall.mChangeState('connected');
        sinon.assert.calledOnce(MockCallScreen.enableOnHold);
      });

      test('should hide the merge button while establishing', function() {
        this.sinon.spy(MockCallScreen, 'hideMerge');
        mockCall.mChangeState('dialing');
        sinon.assert.calledOnce(MockCallScreen.hideMerge);
      });

      test('should hide the merge button when established', function() {
        this.sinon.spy(MockCallScreen, 'hideMerge');
        mockCall.mChangeState('connected');
        sinon.assert.calledOnce(MockCallScreen.hideMerge);
      });

      suite('screen management', function() {
        setup(function() {
          this.sinon.spy(navigator, 'requestWakeLock');
          MockNavigatorMozTelephony.mTriggerCallsChanged();
        });

        test('should turn the screen on', function() {
          sinon.assert.called(navigator.requestWakeLock, 'screen');
        });

        test('and release it when we pick up the call', function() {
          mockCall._connect();
          var lock = MockNavigatorWakeLock.mLastWakeLock;
          assert.equal(lock.topic, 'screen');
          assert.isTrue(lock.released);
        });
      });

      suite('in CDMA Network', function() {
        test('should not toggle no-add-call in CDMA network', function() {
          MockNavigatorMozMobileConnections[1].voice = {
            type: 'evdoa'
          };
          this.sinon.spy(MockCallScreen, 'showPlaceNewCallButton');

          MockNavigatorMozTelephony.mTriggerCallsChanged();
          sinon.assert.calledOnce(MockCallScreen.showPlaceNewCallButton);
        });
      });
    });

    suite('> hanging up the last incoming call', function() {
      setup(function() {
        var mockCall = new MockCall('12334', 'incoming');
        telephonyAddCall.call(this, mockCall, {trigger: true});

        MockNavigatorMozTelephony.calls = [];
      });

      test('should toggle the CallScreen', function() {
        var toggleSpy = this.sinon.spy(MockCallScreen, 'toggle');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(toggleSpy.calledOnce);
      });

      test('should not call TonePlayer.setChannel()', function() {
        var setChannelSpy = this.sinon.spy(MockTonePlayer, 'setChannel');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(setChannelSpy.notCalled);
      });
    });

    suite('> receiving an extra incoming call', function() {
      var extraCall;
      var extraHC;

      setup(function() {
        var firstCall = new MockCall('543552', 'incoming');
        extraCall = new MockCall('12334', 'incoming');
        extraCall.addEventListener(
          'statechange', CallsHandler.updatePlaceNewCall);
        extraCall.addEventListener(
          'statechange', CallsHandler.updateMergeAndOnHoldStatus);

        telephonyAddCall.call(this, firstCall, {trigger: true});
        extraHC = telephonyAddCall.call(this, extraCall);
      });

      test('should instanciate another handled call', function() {
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(HandledCall.calledWith(extraCall));
      });

      test('should insert the handled call node in the CallScreen', function() {
        var insertSpy = this.sinon.spy(MockCallScreen, 'insertCall');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(insertSpy.calledWith(extraHC.node));
      });

      test('should hide the handled call node', function() {
        var hideSpy = this.sinon.spy(extraHC, 'hide');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(hideSpy.calledOnce);
      });

      test('should show the call waiting UI', function() {
        var showSpy = this.sinon.spy(MockCallScreen, 'showIncoming');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(showSpy.calledOnce);
      });

      test('should play the call waiting tone', function() {
        var playSpy = this.sinon.spy(MockTonePlayer, 'playSequence');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(playSpy.calledOnce);
      });

      test('should show the contact information', function() {
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.equal(CallScreen.incomingNumber.textContent, 'test name');
        assert.isTrue(MockUtils.mCalledGetPhoneNumberAndType);
        assert.equal(CallScreen.incomingNumberAdditionalInfo.textContent,
                     'type, 12334');
      });

      test('should show the number of a unknown contact', function() {
        // 111 is a special case in MockContacts to return no contact.
        extraCall.id = { number: '111' };
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.equal(CallScreen.incomingNumber.textContent,
                     extraCall.id.number);
        assert.isTrue(MockUtils.mCalledGetPhoneNumberAndType);
        assert.equal(CallScreen.incomingNumberAdditionalInfo.textContent, '');
      });

      suite('adaptToSpace and ensureFixedBaseline', function() {
        setup(function() {
          this.sinon.spy(FontSizeManager, 'adaptToSpace');
          this.sinon.spy(FontSizeManager, 'ensureFixedBaseline');
        });

        test('should call FontSizeManager.adaptToSpace and ensureFixedBaseline',
        function() {
          MockNavigatorMozTelephony.mTriggerCallsChanged();

          sinon.assert.calledWith(
            FontSizeManager.adaptToSpace, FontSizeManager.SECOND_INCOMING_CALL,
            CallScreen.incomingNumber, false, 'end');
          sinon.assert.calledWith(
            FontSizeManager.ensureFixedBaseline,
            FontSizeManager.SECOND_INCOMING_CALL,
            CallScreen.incomingNumber
          );
        });

        test('should only call FontSizeManager.adaptToSpace if incoming call ' +
             'not a contact', function() {
          // 111 is a special case in MockContacts to return no contact.
          extraCall.id = { number: '111' };
          MockNavigatorMozTelephony.mTriggerCallsChanged();
          sinon.assert.calledWith(
            FontSizeManager.adaptToSpace, FontSizeManager.SECOND_INCOMING_CALL,
            CallScreen.incomingNumber, false, 'end');
          sinon.assert.notCalled(FontSizeManager.ensureFixedBaseline);
        });

        test('should only call FontSizeManager.adaptToSpace if both calls ' +
             'have withheld numbers', function() {
          MockNavigatorMozTelephony.calls = [];

          var firstCall = new MockCall('', 'incoming');
          extraCall = new MockCall('', 'incoming');

          telephonyAddCall.call(this, firstCall, {trigger: true});
          extraHC = telephonyAddCall.call(this, extraCall);

          FontSizeManager.adaptToSpace.reset();
          FontSizeManager.ensureFixedBaseline.reset();

          MockNavigatorMozTelephony.mTriggerCallsChanged();

          sinon.assert.calledWith(
            FontSizeManager.adaptToSpace, FontSizeManager.SECOND_INCOMING_CALL,
            MockCallScreen.incomingNumber, false, 'end');
          sinon.assert.notCalled(FontSizeManager.ensureFixedBaseline);
          assert.equal(
            MockCallScreen.incomingNumber.textContent, 'withheld-number');
        });

        test('should only call FontSizeManager.adaptToSpace if the second ' +
             'call has withheld number', function() {
          MockNavigatorMozTelephony.calls = [];

          var firstCall = new MockCall('543552', 'incoming');
          extraCall = new MockCall('', 'incoming');

          telephonyAddCall.call(this, firstCall, {trigger: true});
          extraHC = telephonyAddCall.call(this, extraCall);

          FontSizeManager.adaptToSpace.reset();
          FontSizeManager.ensureFixedBaseline.reset();

          MockNavigatorMozTelephony.mTriggerCallsChanged();

          sinon.assert.calledWith(
            FontSizeManager.adaptToSpace, FontSizeManager.SECOND_INCOMING_CALL,
            MockCallScreen.incomingNumber, false, 'end');
          sinon.assert.notCalled(FontSizeManager.ensureFixedBaseline);
          assert.equal(
            MockCallScreen.incomingNumber.textContent, 'withheld-number');
        });
      });

      test('should disable the place new call button', function() {
        this.sinon.spy(MockCallScreen, 'disablePlaceNewCall');
        extraCall.mChangeState('alerting');
        sinon.assert.calledOnce(MockCallScreen.disablePlaceNewCall);
      });

      test('should show the on hold button', function() {
        this.sinon.spy(MockCallScreen, 'showOnHold');
        extraCall.mChangeState('alerting');
        sinon.assert.calledOnce(MockCallScreen.showOnHold);
      });

      test('should disable the on hold button', function() {
        this.sinon.spy(MockCallScreen, 'disableOnHold');
        extraCall.mChangeState('alerting');
        sinon.assert.calledOnce(MockCallScreen.disableOnHold);
      });

      test('should hide the merge button', function() {
        this.sinon.spy(MockCallScreen, 'hideMerge');
        extraCall.mChangeState('alerting');
        sinon.assert.calledOnce(MockCallScreen.hideMerge);
      });

      suite('screen management', function() {
        setup(function() {
          this.sinon.spy(navigator, 'requestWakeLock');
          MockNavigatorMozTelephony.mTriggerCallsChanged();
        });

        test('should turn the screen on', function() {
          sinon.assert.called(navigator.requestWakeLock, 'screen');
        });

        test('and release it when we pick up the call', function() {
          extraCall._connect();
          var lock = MockNavigatorWakeLock.mLastWakeLock;
          assert.equal(lock.topic, 'screen');
          assert.isTrue(lock.released);
        });
      });

      suite('DSDS SIM display >', function() {
        setup(function() {
          MockNavigatorMozIccManager.addIcc('12345', {'cardState': 'ready'});
        });

        suite('One SIM >', function() {
          test('should hide the incoming sim', function() {
            MockNavigatorMozTelephony.mTriggerCallsChanged();
            assert.isTrue(CallScreen.incomingSim.hidden);
          });
        });

        suite('Multiple SIMs >', function() {
          setup(function() {
            MockNavigatorMozIccManager.addIcc('424242', {'cardState': 'ready'});
          });

          test('should show the receiving sim', function() {
            MockNavigatorMozTelephony.mTriggerCallsChanged();
            assert.equal(CallScreen.incomingSim.textContent, 'sim-number');
            assert.deepEqual(MockLazyL10n.keys['sim-number'], {n: 2});
          });
        });
      });
    });

    suite('> making an extra outgoing call', function() {
      var extraCall;
      var extraHC;

      setup(function() {
        this.sinon.spy(MockCallScreen, 'disablePlaceNewCall');
        this.sinon.spy(MockCallScreen, 'showOnHold');
        this.sinon.spy(MockCallScreen, 'disableOnHold');
        this.sinon.spy(MockCallScreen, 'hideMerge');
        var firstCall = new MockCall('543552', 'incoming');
        extraCall = new MockCall('12334', 'dialing');

        telephonyAddCall.call(this, firstCall, {trigger: true});
        extraHC = telephonyAddCall.call(this, extraCall, {trigger: true});
      });

      test('should disable the place new call button', function() {
        sinon.assert.calledOnce(MockCallScreen.disablePlaceNewCall);
      });

      test('should show the on hold button', function() {
        sinon.assert.calledOnce(MockCallScreen.showOnHold);
      });

      test('should disable the on hold button', function() {
        sinon.assert.calledOnce(MockCallScreen.disableOnHold);
      });

      test('should hide the merge button', function() {
        sinon.assert.calledOnce(MockCallScreen.hideMerge);
      });
    });

    suite('> receiving a third call', function() {
      var firstCall;
      var extraCall;
      var overflowCall;
      var overflowHC;

      setup(function() {
        firstCall = new MockCall('543552', 'incoming');
        extraCall = new MockCall('12334', 'incoming');
        overflowCall = new MockCall('424242', 'incoming');

        telephonyAddCall.call(this, firstCall, {trigger: true});
        telephonyAddCall.call(this, extraCall, {trigger: true});

        overflowHC = telephonyAddCall.call(this, overflowCall);
      });

      test('should hangup the call directly', function() {
        var hangupSpy = this.sinon.spy(overflowCall, 'hangUp');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(hangupSpy.calledOnce);
      });

      test('should still instanciate a handled call', function() {
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(HandledCall.calledWith(overflowCall));
      });

      test('should not insert the handled call node in the CallScreen',
      function() {
        var insertSpy = this.sinon.spy(MockCallScreen, 'insertCall');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(insertSpy.notCalled);
      });

      suite('when a conference call is ongoing', function() {
        setup(function() {
          MockNavigatorMozTelephony.calls = [overflowCall];
          MockNavigatorMozTelephony.conferenceGroup.calls =
            [firstCall, extraCall];
        });

        test('should not hangup the call directly', function() {
          var hangupSpy = this.sinon.spy(overflowCall, 'hangUp');
          MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
          MockNavigatorMozTelephony.mTriggerCallsChanged();
          assert.isTrue(hangupSpy.notCalled);
        });

        test('should insert the handled call node in the CallScreen',
        function() {
          var insertSpy = this.sinon.spy(MockCallScreen, 'insertCall');
          MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
          MockNavigatorMozTelephony.mTriggerCallsChanged();
          assert.isTrue(insertSpy.calledWith(overflowHC.node));
        });
      });
    });

    suite('> receiving an extra incoming call in CDMA mode', function() {
      var mockCall;

      setup(function() {
        mockCall = new MockCall('543552', 'incoming');

        telephonyAddCall.call(this, mockCall, {trigger: true});
        telephonyAddCdmaCall.call(this, '123456');
      });

      test('should show the call waiting UI', function() {
        var showSpy = this.sinon.spy(MockCallScreen, 'showIncoming');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(showSpy.calledOnce);
      });

      test('should play the call waiting tone', function() {
        var playSpy = this.sinon.spy(MockTonePlayer, 'playSequence');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(playSpy.calledOnce);
      });

      test('should display the hold-and-answer button only', function() {
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(MockCallScreen.mHoldAndAnswerOnly);
      });

      test('should do the same after answering another call', function() {
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        var showSpy = this.sinon.spy(MockCallScreen, 'showIncoming');
        var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
        var holdSpy = this.sinon.spy(mockCall, 'hold');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(showSpy.calledOnce);
        CallsHandler.holdAndAnswer();
        assert.isTrue(hideSpy.calledOnce);
        assert.isTrue(holdSpy.calledOnce);
      });

      test('should toggle no-add-call in CDMA network', function() {
        MockNavigatorMozMobileConnections[1].voice = {
          type: 'evdoa'
        };
        MockNavigatorMozTelephony.calls = [mockCall, '123456789'];
        this.sinon.spy(MockCallScreen, 'hidePlaceNewCallButton');

        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.hidePlaceNewCallButton);
      });
    });

    suite('> extra call ending', function() {
      var hideSpy;

      setup(function() {
        var firstCall = new MockCall('543552', 'incoming');
        var extraCall = new MockCall('12334', 'incoming');

        telephonyAddCall.call(this, firstCall, {trigger: true});

        var extraHC = telephonyAddCall.call(this, extraCall, {trigger: true});
        hideSpy = this.sinon.spy(extraHC, 'hide');

        MockNavigatorMozTelephony.calls = [firstCall];
      });

      test('should hide the call waiting UI', function() {
        var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(hideSpy.calledOnce);
      });
    });

    suite('> conference call creation', function() {
      var firstConfCall, firstHC;
      var secondConfCall, secondHC;

      setup(function() {
        firstConfCall = new MockCall('543552', 'incoming');
        secondConfCall = new MockCall('54353523', 'incoming');

        firstHC = telephonyAddCall.call(this, firstConfCall, {trigger: true});
        secondHC = telephonyAddCall.call(this, secondConfCall, {trigger: true});

        MockNavigatorMozTelephony.calls = [];
        MockNavigatorMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                  secondConfCall];
      });

      test('should not hide the handled calls', function() {
        var firstHideSpy = this.sinon.spy(firstHC, 'hide');
        var secondHideSpy = this.sinon.spy(secondHC, 'hide');

        MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
        MockNavigatorMozTelephony.mTriggerCallsChanged();

        assert.isTrue(firstHideSpy.notCalled);
        assert.isTrue(secondHideSpy.notCalled);
      });
    });

    suite('> people disconnecting from a conference call', function() {
      var firstConfCall, firstHC;
      var secondConfCall, secondHC;

      setup(function() {
        firstConfCall = new MockCall('543552', 'incoming');
        secondConfCall = new MockCall('54353523', 'incoming');

        firstHC = telephonyAddCall.call(this, firstConfCall, {trigger: true});
        secondHC = telephonyAddCall.call(this, secondConfCall, {trigger: true});

        MockNavigatorMozTelephony.calls = [];
        MockNavigatorMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                  secondConfCall];

        MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
        MockNavigatorMozTelephony.mTriggerCallsChanged();

        MockNavigatorMozTelephony.calls = [firstConfCall];
        MockNavigatorMozTelephony.conferenceGroup.calls = [secondConfCall];

        MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
        MockNavigatorMozTelephony.mTriggerCallsChanged();

        MockNavigatorMozTelephony.calls = [];
        MockNavigatorMozTelephony.conferenceGroup.calls = [];
      });

      test('should toggle the CallScreen', function() {
        var toggleSpy = this.sinon.spy(MockCallScreen, 'toggle');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
        assert.isTrue(toggleSpy.calledOnce);
      });
    });

    suite('> hanging up the second call', function() {
      var firstCall;

      setup(function() {
        firstCall = new MockCall('543552', 'held');
        var secondCall = new MockCall('12334', 'incoming');

        telephonyAddCall.call(this, firstCall, {trigger: true});
        telephonyAddCall.call(this, secondCall, {trigger: true});

        MockNavigatorMozTelephony.calls = [firstCall];
      });

      test('should resume the first call', function() {
        this.sinon.spy(firstCall, 'resume');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.called(firstCall.resume);
      });
    });

    suite('> hanging up the second call when the first line is a conference',
          function() {
      var extraCall;

      setup(function() {
        var firstConfCall = new MockCall('543552', 'held');
        var secondConfCall = new MockCall('12334', 'held');
        extraCall = new MockCall('424242', 'incoming');

        /**
         * Don't add all 3 calls at once since |CallsHandler.addCall|
         * would hangup the 3rd call
         */
        telephonyAddCall.call(this, firstConfCall, {trigger: true});
        telephonyAddCall.call(this, secondConfCall, {trigger: true});

        // Merge calls
        MockNavigatorMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                  secondConfCall];
        firstConfCall.group = MockNavigatorMozTelephony.conferenceGroup;
        secondConfCall.group = MockNavigatorMozTelephony.conferenceGroup;
        MockNavigatorMozTelephony.calls = [];
        MockNavigatorMozTelephony.mTriggerGroupCallsChanged();

        // Add extra call
        telephonyAddCall.call(this, extraCall, {trigger: true});
        MockNavigatorMozTelephony.calls = [extraCall];
        MockNavigatorMozTelephony.mTriggerCallsChanged();
      });

      test('should resume the conference call', function() {
        this.sinon.spy(MockNavigatorMozTelephony.conferenceGroup, 'resume');
        MockNavigatorMozTelephony.calls = [];
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.called(MockNavigatorMozTelephony.conferenceGroup.resume);
      });
    });
  });

  suite('> Public methods', function() {
    suite('> CallsHandler.isEstablishingCall()', function() {
      var mockCall;

      test('dialing call', function() {
        mockCall = new MockCall('12334', 'dialing');
        telephonyAddCall.call(this, mockCall);

        assert.isTrue(CallsHandler.isEstablishingCall());
      });

      test('alerting call', function() {
        mockCall = new MockCall('12334', 'alerting');
        telephonyAddCall.call(this, mockCall);

        assert.isTrue(CallsHandler.isEstablishingCall());
      });

      test('any other call state', function() {
        mockCall = new MockCall('12334', 'other');
        telephonyAddCall.call(this, mockCall);

        assert.isFalse(CallsHandler.isEstablishingCall());
      });
    });

    suite('> CallsHandler.answer()', function() {
      var mockCall;

      setup(function() {
        mockCall = new MockCall('12334', 'incoming');
        mockCall.addEventListener(
          'statechange', CallsHandler.updatePlaceNewCall);
        telephonyAddCall.call(this, mockCall, {trigger: true});
      });

      test('should answer the call', function() {
        var answerSpy = this.sinon.spy(mockCall, 'answer');
        CallsHandler.answer();
        assert.isTrue(answerSpy.calledOnce);
      });

      test('should render the CallScreen in connected mode', function() {
        var renderSpy = this.sinon.spy(MockCallScreen, 'render');
        CallsHandler.answer();
        assert.isTrue(renderSpy.calledWith('connected'));
      });

      test('should enable the place new call button', function() {
        this.sinon.spy(MockCallScreen, 'enablePlaceNewCall');
        CallsHandler.answer();
        sinon.assert.calledOnce(MockCallScreen.enablePlaceNewCall);
      });
    });

    suite('> CallsHandler.end()', function() {
      suite('> ending a simple call', function() {
        var mockCall;

        setup(function() {
          mockCall = new MockCall('543552', 'incoming');
          mockCall.addEventListener(
            'statechange', CallsHandler.updatePlaceNewCall);
          telephonyAddCall.call(this, mockCall, {trigger: true});
          MockNavigatorMozTelephony.active = mockCall;
        });

        test('should hangup the active call', function() {
          var hangUpSpy = this.sinon.spy(mockCall, 'hangUp');
          CallsHandler.end();
          assert.isTrue(hangUpSpy.calledOnce);
        });

        test('should enable the place new call button', function() {
          this.sinon.spy(MockCallScreen, 'enablePlaceNewCall');
          CallsHandler.end();
          sinon.assert.calledOnce(MockCallScreen.enablePlaceNewCall);
        });
      });

      suite('> ending a conference call', function() {
        var firstConfCall;
        var secondConfCall;

        setup(function() {
          firstConfCall = new MockCall('432423', 'incoming');
          telephonyAddCall.call(this, firstConfCall, {trigger: true});
          secondConfCall = new MockCall('432423555', 'incoming');
          telephonyAddCall.call(this, secondConfCall, {trigger: true});

          MockNavigatorMozTelephony.calls = [];
          MockNavigatorMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                    secondConfCall];

          MockNavigatorMozTelephony.active =
            MockNavigatorMozTelephony.conferenceGroup;
        });

        test('should hangup all the calls in the conference group', function() {
          var firstHangUpSpy = this.sinon.spy(firstConfCall, 'hangUp');
          var secondHangUpSpy = this.sinon.spy(secondConfCall, 'hangUp');
          CallsHandler.end();
          assert.isTrue(firstHangUpSpy.calledOnce);
          assert.isTrue(secondHangUpSpy.calledOnce);
        });

        test('should call CallScreen.setEndConferenceCall', function() {
          CallsHandler.end();
          assert.isTrue(MockCallScreen.mSetEndConferenceCall);
        });
      });

      suite('> ending one of two calls', function() {
        var firstCall;
        var secondCall;

        setup(function() {
          firstCall = new MockCall('543552', 'incoming');
          secondCall = new MockCall('12334', 'incoming');
          secondCall.addEventListener(
            'statechange', CallsHandler.updatePlaceNewCall);

          telephonyAddCall.call(this, firstCall, {trigger: true});
          telephonyAddCall.call(this, secondCall, {trigger: true});
          MockNavigatorMozTelephony.active = secondCall;
        });

        test('should hang up the active call', function() {
          var hangUpSpy = this.sinon.spy(secondCall, 'hangUp');
          CallsHandler.end();
          assert.isTrue(hangUpSpy.calledOnce);
        });

        test('should not hang up the first call', function() {
          var hangUpSpy = this.sinon.spy(firstCall, 'hangUp');
          CallsHandler.end();
          assert.isTrue(hangUpSpy.notCalled);
        });

        test('should enable the place new call button', function() {
          this.sinon.spy(MockCallScreen, 'enablePlaceNewCall');
          CallsHandler.end();
          sinon.assert.calledOnce(MockCallScreen.enablePlaceNewCall);
        });
      });

      suite('> refusing an incoming call', function() {
        var mockCall;

        setup(function() {
          mockCall = new MockCall('543552', 'incoming');
          mockCall.addEventListener(
            'statechange', CallsHandler.updatePlaceNewCall);

          telephonyAddCall.call(this, mockCall, {trigger: true});
        });

        test('should hang up the last incoming call', function() {
          var hangUpSpy = this.sinon.spy(mockCall, 'hangUp');
          CallsHandler.end();
          assert.isTrue(hangUpSpy.calledOnce);
        });

        test('should enable the place new call button', function() {
          this.sinon.spy(MockCallScreen, 'enablePlaceNewCall');
          CallsHandler.end();
          sinon.assert.calledOnce(MockCallScreen.enablePlaceNewCall);
        });
      });
    });

    suite('> CallsHandler.holdAndAnswer()', function() {
      suite('when handledCalls.length < 2', function() {
        test('should do nothing when there is no call', function() {
          var hideIncomingSpy = this.sinon.spy(CallScreen, 'hideIncoming');
          CallsHandler.holdAndAnswer();
          assert.isTrue(hideIncomingSpy.notCalled);
        });

        test('should do nothing when there is one call', function() {
          var call = new MockCall('543552', 'connected');
          telephonyAddCall.call(this, call, {trigger: true});
          MockNavigatorMozTelephony.active = call;

          var hideIncomingSpy = this.sinon.spy(CallScreen, 'hideIncoming');
          var holdSpy = this.sinon.spy(call, 'hold');
          CallsHandler.holdAndAnswer();
          assert.isTrue(hideIncomingSpy.notCalled);
          assert.isTrue(holdSpy.notCalled);
        });
      });

      suite('when the first call is connected and the second call is incoming',
        function() {
          var connectedCall;
          var incomingCall;

          setup(function() {
            connectedCall = new MockCall('543552', 'connected');
            incomingCall = new MockCall('12334', 'incoming');
            incomingCall.addEventListener(
              'statechange', CallsHandler.updatePlaceNewCall);

            telephonyAddCall.call(this, connectedCall, {trigger: true});
            MockNavigatorMozTelephony.active = connectedCall;
            telephonyAddCall.call(this, incomingCall, {trigger: true});
          });

          test('should put the first call on hold', function() {
            var holdSpy = this.sinon.spy(connectedCall, 'hold');
            CallsHandler.holdAndAnswer();
            assert.isTrue(holdSpy.calledOnce);
          });

          test('should hide the call waiting UI', function() {
            var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
            CallsHandler.holdAndAnswer();
            assert.isTrue(hideSpy.calledOnce);
          });

          test('should disable the place new call button', function() {
            this.sinon.spy(MockCallScreen, 'disablePlaceNewCall');
            incomingCall.mChangeState('dialing');
            sinon.assert.calledOnce(MockCallScreen.disablePlaceNewCall);
          });
      });

      suite('when there is an ongoing conference call', function() {
          setup(function() {
            var firstConfCall = new MockCall('432423', 'incoming');
            telephonyAddCall.call(this, firstConfCall, {trigger: true});
            var secondConfCall = new MockCall('432423555', 'incoming');
            telephonyAddCall.call(this, secondConfCall, {trigger: true});

            MockNavigatorMozTelephony.calls = [];
            MockNavigatorMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                      secondConfCall];

            MockNavigatorMozTelephony.active =
              MockNavigatorMozTelephony.conferenceGroup;

            var incomingCall = new MockCall('12334', 'incoming');
            telephonyAddCall.call(this, incomingCall, {trigger: true});
          });

          test('should put the group on hold', function() {
            var holdSpy =
              this.sinon.spy(MockNavigatorMozTelephony.conferenceGroup, 'hold');
            CallsHandler.holdAndAnswer();
            assert.isTrue(holdSpy.calledOnce);
          });

          test('should hide the call waiting UI', function() {
            var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
            CallsHandler.holdAndAnswer();
            assert.isTrue(hideSpy.calledOnce);
          });
      });

      suite('when the first call is held and the second call is incoming',
        function() {
          var heldCall;
          var incomingCall;

          setup(function() {
            heldCall = new MockCall('543552', 'held');
            incomingCall = new MockCall('12334', 'incoming');

            telephonyAddCall.call(this, heldCall, {trigger: true});
            telephonyAddCall.call(this, incomingCall, {trigger: true});
          });

          test('should answer the incoming call', function() {
            var answerSpy = this.sinon.spy(incomingCall, 'answer');
            CallsHandler.holdAndAnswer();
            assert.isTrue(answerSpy.calledOnce);
          });

          test('should hide the call waiting UI', function() {
            var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
            CallsHandler.holdAndAnswer();
            assert.isTrue(hideSpy.calledOnce);
          });

          test('should not inform bluetooth to answer non-CDMA call',
          function() {
            var switchCallsSpy = this.sinon.spy(
              MockBluetoothHelperInstance, 'answerWaitingCall');
            CallsHandler.holdAndAnswer();
            assert.equal(switchCallsSpy.notCalled, true);
          });
      });

      suite('> second incoming call in CDMA mode',
        function() {
          var call;

          setup(function() {
            call = new MockCall('543552', 'incoming');

            telephonyAddCall.call(this, call, {trigger: true});
            MockNavigatorMozTelephony.active = call;
            call.secondId = { number: '12345' };
            call.state = 'connected';
          });

          test('should invoke hold to answer the second call', function() {
            var holdSpy = this.sinon.spy(call, 'hold');
            CallsHandler.holdAndAnswer();
            assert.isTrue(holdSpy.calledOnce);
          });

          test('should hide the call waiting UI', function() {
            var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
            CallsHandler.holdAndAnswer();
            assert.isTrue(hideSpy.calledOnce);
          });

          test('should enable the CDMA call waiting UI', function() {
            CallsHandler.holdAndAnswer();
            assert.equal(MockCallScreen.mCdmaCallWaiting, true);
          });

          test('should inform bluetooth of answering second call', function() {
            var switchCallsSpy = this.sinon.spy(
              MockBluetoothHelperInstance, 'answerWaitingCall');
            CallsHandler.holdAndAnswer();
            assert.equal(switchCallsSpy.calledOnce, true);
          });
      });
    });

    suite('> CallsHandler.endAndAnswer()', function() {
      suite('when handledCalls.length < 2', function() {
        test('should do nothing when there is no call', function() {
          var hideIncomingSpy = this.sinon.spy(CallScreen, 'hideIncoming');
          CallsHandler.endAndAnswer();
          assert.isTrue(hideIncomingSpy.notCalled);
        });

        test('should do nothing when there is one call', function() {
          var call = new MockCall('543552', 'connected');
          telephonyAddCall.call(this, call, {trigger: true});
          MockNavigatorMozTelephony.active = call;

          var hideIncomingSpy = this.sinon.spy(CallScreen, 'hideIncoming');
          var hangUpSpy = this.sinon.spy(call, 'hangUp');
          CallsHandler.endAndAnswer();
          assert.isTrue(hideIncomingSpy.notCalled);
          assert.isTrue(hangUpSpy.notCalled);
        });
      });

      suite('when the first call is connected and the second call is incoming',
        function() {
          var connectedCall;
          var incomingCall;

          setup(function() {
            connectedCall = new MockCall('543552', 'connected');
            incomingCall = new MockCall('12334', 'incoming');

            telephonyAddCall.call(this, connectedCall, {trigger: true});
            MockNavigatorMozTelephony.active = connectedCall;
            telephonyAddCall.call(this, incomingCall, {trigger: true});
          });

          test('should hang up the active call', function() {
            var hangUpSpy =
              this.sinon.spy(MockNavigatorMozTelephony.active, 'hangUp');
            CallsHandler.endAndAnswer();
            assert.isTrue(hangUpSpy.calledOnce);
          });

          test('should hide the call waiting UI', function() {
            var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
            CallsHandler.endAndAnswer();
            assert.isTrue(hideSpy.calledOnce);
          });
      });

      suite('when the first call is held and the second call is incoming',
        function() {
          var heldCall;
          var incomingCall;

          setup(function() {
            heldCall = new MockCall('543552', 'held');
            incomingCall = new MockCall('12334', 'incoming');

            telephonyAddCall.call(this, heldCall, {trigger: true});
            telephonyAddCall.call(this, incomingCall, {trigger: true});
          });

          test('should hang up the held call', function() {
            var hangUpSpy = this.sinon.spy(heldCall, 'hangUp');
            CallsHandler.endAndAnswer();
            assert.isTrue(hangUpSpy.calledOnce);
          });

          test('should hide the call waiting UI', function() {
            var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
            CallsHandler.endAndAnswer();
            assert.isTrue(hideSpy.calledOnce);
          });
      });

      suite('> second incoming call in CDMA mode',
        function() {
          var mockCall;

          setup(function() {
            mockCall = new MockCall('543552', 'incoming');

            telephonyAddCall.call(this, mockCall, {trigger: true});
            MockNavigatorMozTelephony.active = mockCall;
            telephonyAddCdmaCall.call(this, '123456');
          });

          test('should invoke hold to answer the second call', function() {
            var holdSpy = this.sinon.spy(mockCall, 'hold');
            CallsHandler.endAndAnswer();
            assert.isTrue(holdSpy.calledOnce);
          });

          test('should hide the call waiting UI', function() {
            var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
            CallsHandler.endAndAnswer();
            assert.isTrue(hideSpy.calledOnce);
          });

          test('should enable the CDMA call waiting UI', function() {
            CallsHandler.endAndAnswer();
            assert.equal(MockCallScreen.mCdmaCallWaiting, true);
          });

          test('should inform bluetooth of answering second call', function() {
            var switchCallsSpy = this.sinon.spy(
              MockBluetoothHelperInstance, 'answerWaitingCall');
            CallsHandler.endAndAnswer();
            assert.equal(switchCallsSpy.calledOnce, true);
          });
      });

      suite('when a conference call is active', function() {
        var firstConfCall;
        var secondConfCall;

        setup(function() {
          firstConfCall = new MockCall('432423', 'incoming');
          telephonyAddCall.call(this, firstConfCall, {trigger: true});
          secondConfCall = new MockCall('432423555', 'incoming');
          telephonyAddCall.call(this, secondConfCall, {trigger: true});

          MockNavigatorMozTelephony.calls = [];
          MockNavigatorMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                    secondConfCall];

          MockNavigatorMozTelephony.active =
            MockNavigatorMozTelephony.conferenceGroup;

          var incomingCall = new MockCall('12334', 'incoming');
          telephonyAddCall.call(this, incomingCall, {trigger: true});
        });

        test('should hangup all the calls in the conference group', function() {
          var firstHangUpSpy = this.sinon.spy(firstConfCall, 'hangUp');
          var secondHangUpSpy = this.sinon.spy(secondConfCall, 'hangUp');
          CallsHandler.endAndAnswer();
          assert.isTrue(firstHangUpSpy.calledOnce);
          assert.isTrue(secondHangUpSpy.calledOnce);
        });

        test('should hide the call waiting UI', function() {
          var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
          CallsHandler.endAndAnswer();
          assert.isTrue(hideSpy.calledOnce);
        });

        test('should call CallScreen.setEndConferenceCall', function() {
          CallsHandler.endAndAnswer();
          assert.isTrue(MockCallScreen.mSetEndConferenceCall);
        });

      });
    });

    suite('> CallsHandler.holdOrResumeSingleCall()', function() {
      var firstCall;

      suite('put ongoing call on hold', function() {
        setup(function() {
          firstCall = new MockCall('543552', 'connected');

          telephonyAddCall.call(this, firstCall, {trigger: true});
          MockNavigatorMozTelephony.active = firstCall;
        });

        test('should call telephony.active.hold()', function() {
          this.sinon.spy(MockNavigatorMozTelephony.active, 'hold');
          CallsHandler.holdOrResumeSingleCall();
          sinon.assert.calledOnce(MockNavigatorMozTelephony.active.hold);
        });

        test('should render the call screen in on hold mode', function() {
          this.sinon.spy(MockCallScreen, 'render');
          CallsHandler.holdOrResumeSingleCall();
          sinon.assert.calledWith(MockCallScreen.render, 'connected-hold');
        });

        test('should disable the mute button', function() {
          this.sinon.spy(MockCallScreen, 'disableMute');
          CallsHandler.holdOrResumeSingleCall();
          sinon.assert.calledOnce(MockCallScreen.disableMute);
        });

        test('should disable the speaker button', function() {
          this.sinon.spy(MockCallScreen, 'disableSpeaker');
          CallsHandler.holdOrResumeSingleCall();
          sinon.assert.calledOnce(MockCallScreen.disableSpeaker);
        });
      });

      suite('resume held 1 to 1 ongoing call', function() {
        setup(function() {
          firstCall = new MockCall('543552', 'held');

          telephonyAddCall.call(this, firstCall, {trigger: true});
        });

        test('should call firstCall.resume()', function() {
          this.sinon.spy(firstCall, 'resume');
          CallsHandler.holdOrResumeSingleCall();
          sinon.assert.calledOnce(firstCall.resume);
        });

        test('should render the call screen in connected mode', function() {
          this.sinon.spy(MockCallScreen, 'render');
          CallsHandler.holdOrResumeSingleCall();
          sinon.assert.calledWith(MockCallScreen.render, 'connected');
        });

        test('should enable the mute button', function() {
          this.sinon.spy(MockCallScreen, 'enableMute');
          CallsHandler.holdOrResumeSingleCall();
          sinon.assert.calledOnce(MockCallScreen.enableMute);
        });

        test('should enable the speaker button', function() {
          this.sinon.spy(MockCallScreen, 'enableSpeaker');
          CallsHandler.holdOrResumeSingleCall();
          sinon.assert.calledOnce(MockCallScreen.enableSpeaker);
        });
      });
    });

    suite('> CallsHandler.ignore()', function() {
      var firstCall;
      var waitingCall;

      setup(function() {
        firstCall = new MockCall('543552', 'incoming');
        waitingCall = new MockCall('12334', 'incoming');

        telephonyAddCall.call(this, firstCall, {trigger: true});
        MockNavigatorMozTelephony.active = firstCall;
        telephonyAddCall.call(this, waitingCall, {trigger: true});
      });

      test('should hang up the waiting call', function() {
        var hangUpSpy = this.sinon.spy(waitingCall, 'hangUp');
        CallsHandler.ignore();
        assert.isTrue(hangUpSpy.calledOnce);
      });

      test('should not hang up the first call', function() {
        var hangUpSpy = this.sinon.spy(firstCall, 'hangUp');
        CallsHandler.ignore();
        assert.isTrue(hangUpSpy.notCalled);
      });

      test('should hide the call waiting UI', function() {
        var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
        CallsHandler.ignore();
        assert.isTrue(hideSpy.calledOnce);
      });
    });

    suite('> CallsHandler.ignore() in CDMA mode', function() {
      var mockCall;

      setup(function() {
        mockCall = new MockCall('543552', 'incoming');

        telephonyAddCall.call(this, mockCall, {trigger: true});
        MockNavigatorMozTelephony.active = mockCall;
        telephonyAddCdmaCall.call(this, '123456', {trigger: true});
      });

      test('should not hang up the only call', function() {
        var hangUpSpy = this.sinon.spy(mockCall, 'hangUp');
        CallsHandler.ignore();
        assert.isTrue(hangUpSpy.notCalled);
      });

      test('should hide the call waiting UI', function() {
        var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
        CallsHandler.ignore();
        assert.isTrue(hideSpy.calledOnce);
      });

      test('should inform bluetooth of ignoring', function() {
        var ignoreSpy = this.sinon.spy(
          MockBluetoothHelperInstance, 'ignoreWaitingCall');
        CallsHandler.ignore();
        assert.isTrue(ignoreSpy.calledOnce);
      });
    });

    suite('> CallsHandler.toggleCalls()', function() {
      suite('> toggling a single call', function() {
        var mockCall;

        setup(function() {
          mockCall = new MockCall('543552', 'incoming');
          telephonyAddCall.call(this, mockCall, {trigger: true});
          MockNavigatorMozTelephony.active = mockCall;
        });

        test('should _not_ hold the active call', function() {
          var holdSpy = this.sinon.spy(mockCall, 'hold');
          CallsHandler.toggleCalls();
          assert.isTrue(holdSpy.notCalled);
        });

        test('should _not_ change the CallScreen render mode', function() {
          var renderSpy = this.sinon.spy(MockCallScreen, 'render');
          CallsHandler.toggleCalls();
          assert.isTrue(renderSpy.notCalled);
        });

        suite('when the call is holded', function() {
          setup(function() {
            MockNavigatorMozTelephony.active = null;
            mockCall.state = 'held';
          });

          test('should resume the call', function() {
            var resumeSpy = this.sinon.spy(mockCall, 'resume');
            CallsHandler.toggleCalls();
            assert.isTrue(resumeSpy.calledOnce);
          });

          test('should render the CallScreen in connected mode', function() {
            var renderSpy = this.sinon.spy(MockCallScreen, 'render');
            CallsHandler.toggleCalls();
            assert.isTrue(renderSpy.calledWith('connected'));
          });
        });
      });

      suite('> toggling a conference call', function() {
        setup(function() {
          var firstConfCall = new MockCall('432423', 'incoming');
          telephonyAddCall.call(this, firstConfCall, {trigger: true});
          var secondConfCall = new MockCall('432423555', 'incoming');
          telephonyAddCall.call(this, secondConfCall, {trigger: true});

          MockNavigatorMozTelephony.calls = [];
          MockNavigatorMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                    secondConfCall];

          MockNavigatorMozTelephony.active =
            MockNavigatorMozTelephony.conferenceGroup;
          MockNavigatorMozTelephony.mTriggerCallsChanged();
        });

        test('should _not_ hold the active conference call', function() {
          var holdSpy =
            this.sinon.spy(MockNavigatorMozTelephony.conferenceGroup, 'hold');
          CallsHandler.toggleCalls();
          assert.isFalse(holdSpy.called);
        });

        suite('when the conference call is holded', function() {
          setup(function() {
            MockNavigatorMozTelephony.active = null;
          });

          test('should resume the conference call', function() {
            var resumeSpy =
              this.sinon.spy(MockNavigatorMozTelephony.conferenceGroup,
                             'resume');
            CallsHandler.toggleCalls();
            assert.isTrue(resumeSpy.calledOnce);
          });

          test('should render the CallScreen in connected mode', function() {
            var renderSpy = this.sinon.spy(MockCallScreen, 'render');
            CallsHandler.toggleCalls();
            assert.isTrue(renderSpy.calledWith('connected'));
          });
        });
      });

      suite('> toggling between 2 calls', function() {
        var extraCall;

        setup(function() {
          var mockCall = new MockCall('543552', 'incoming');
          extraCall = new MockCall('12334', 'incoming');

          telephonyAddCall.call(this, mockCall, {trigger: true});
          telephonyAddCall.call(this, extraCall, {trigger: true});
          MockNavigatorMozTelephony.active = extraCall;
        });

        test('should hold the active call and gecko will resume the other one',
        function() {
          var holdSpy = this.sinon.spy(extraCall, 'hold');
          CallsHandler.toggleCalls();
          assert.isTrue(holdSpy.calledOnce);
        });
      });

      suite('> toggling between 2 calls in CDMA mode', function() {
        var mockCall;

        setup(function() {
          mockCall = new MockCall('543552', 'incoming');

          telephonyAddCall.call(this, mockCall, {trigger: true});
          MockNavigatorMozTelephony.active = mockCall;
          telephonyAddCdmaCall.call(this, '123456');
        });

        test('should hold the active call and gecko will resume the other one',
        function() {
          var holdSpy = this.sinon.spy(mockCall, 'hold');
          CallsHandler.toggleCalls();
          assert.isTrue(holdSpy.calledOnce);
        });

        test('should inform bluetooth of toggling calls', function() {
          var btToggleSpy = this.sinon.spy(
            MockBluetoothHelperInstance, 'toggleCalls');
          CallsHandler.toggleCalls();
          assert.isTrue(btToggleSpy.calledOnce);
        });
      });

      suite('> toggling between 1 call and 1 conference call', function() {
        setup(function() {
          var firstConfCall = new MockCall('432423', 'incoming');
          telephonyAddCall.call(this, firstConfCall, {trigger: true});
          var secondConfCall = new MockCall('432423555', 'incoming');
          telephonyAddCall.call(this, secondConfCall, {trigger: true});

          MockNavigatorMozTelephony.calls = [];
          MockNavigatorMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                    secondConfCall];

          var extraCall = new MockCall('12334', 'incoming');
          telephonyAddCall.call(this, extraCall, {trigger: true});

          MockNavigatorMozTelephony.active =
            MockNavigatorMozTelephony.conferenceGroup;
        });

        test('should hold the active conference call', function() {
          var holdSpy =
            this.sinon.spy(MockNavigatorMozTelephony.conferenceGroup, 'hold');
          CallsHandler.toggleCalls();
          assert.isTrue(holdSpy.calledOnce);
        });
      });
    });

    suite('> CallsHandler.checkCalls()', function() {
      var firstConfCall;
      var secondConfCall;
      setup(function() {
        firstConfCall = new MockCall('432423', 'incoming');
        telephonyAddCall.call(this, firstConfCall, {trigger: true});
        secondConfCall = new MockCall('432423555', 'incoming');
        telephonyAddCall.call(this, secondConfCall, {trigger: true});
      });
    });

    suite('> CallsHandler.activeCall', function() {
      var inactiveCall;
      var activeCall;
      setup(function() {
        inactiveCall = new MockCall('543552', 'incoming');
        activeCall = new MockCall('12334', 'connected');
        telephonyAddCall.call(this, activeCall, {trigger: true});
        telephonyAddCall.call(this, inactiveCall, {trigger: true});
        MockNavigatorMozTelephony.active = activeCall;
      });

      test('should get active call', function() {
        assert.equal(CallsHandler.activeCall.call, activeCall);
      });
    });

    suite('CallsHandler.mergeCalls', function() {
      suite('without a conference call ongoing', function() {
        var inactiveCall;
        var activeCall;
        var addSpy;

        setup(function() {
          inactiveCall = new MockCall('543552', 'incoming');
          activeCall = new MockCall('12334', 'connected');
          telephonyAddCall.call(this, activeCall, {trigger: true});
          telephonyAddCall.call(this, inactiveCall, {trigger: true});
          MockNavigatorMozTelephony.active = activeCall;
          addSpy =
            this.sinon.spy(MockNavigatorMozTelephony.conferenceGroup, 'add');
        });

        test('should call telephony.conferenceGroup.add()', function() {
          CallsHandler.mergeCalls();
          assert.isTrue(addSpy.calledWith(activeCall, inactiveCall));
        });
      });

      suite('with a conference call ongoing', function() {
        var firstCall;
        var extraCall;
        var overflowCall;
        var addSpy;

        setup(function() {
          firstCall = new MockCall('543552', 'incoming');
          extraCall = new MockCall('12334', 'incoming');
          overflowCall = new MockCall('424242', 'incoming');

          telephonyAddCall.call(this, firstCall, {trigger: true});
          telephonyAddCall.call(this, extraCall, {trigger: true});

          telephonyAddCall.call(this, overflowCall);

          MockNavigatorMozTelephony.calls = [overflowCall];
          MockNavigatorMozTelephony.conferenceGroup.calls =
            [firstCall, extraCall];

          MockNavigatorMozTelephony.active =
            MockNavigatorMozTelephony.conferenceGroup;

          addSpy =
            this.sinon.spy(MockNavigatorMozTelephony.conferenceGroup, 'add');
        });

        test('should call telephony.conferenceGroup.add()', function() {
          CallsHandler.mergeCalls();
          assert.isTrue(addSpy.calledWith(overflowCall));
        });
      });
    });

    suite('> CallsHandler.updateAllPhoneNumberDisplays', function() {
      test('should restore phone number for every handled call', function() {
        var firstCall = new MockCall('543552', 'incoming');
        var secondCall = new MockCall('12334', 'incoming');
        var firstHC = telephonyAddCall.call(this, firstCall);
        var secondHC = telephonyAddCall.call(this, secondCall);
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        var firstSpy = this.sinon.spy(firstHC, 'restorePhoneNumber');
        var secondSpy = this.sinon.spy(secondHC, 'restorePhoneNumber');
        CallsHandler.updateAllPhoneNumberDisplays();
        assert.isTrue(firstSpy.calledOnce);
        assert.isTrue(secondSpy.calledOnce);
      });
    });

    suite('> CallsHandler.switchToSpeaker', function() {
      test('should disconnect bluetooth SCO', function() {
        var disconnectScoSpy = this.sinon.spy(
          MockBluetoothHelperInstance, 'disconnectSco');
        CallsHandler.switchToSpeaker();
        assert.isTrue(disconnectScoSpy.calledOnce);
      });

      test('should set speaker to enabled', function() {
        CallsHandler.switchToSpeaker();
        assert.isTrue(MockNavigatorMozTelephony.speakerEnabled);
      });
    });

    suite('> CallsHandler.switchToDefaultOut when visible', function() {
      // switchToDefaultOut() also check callscreen displayed before connecting
      // to SCO, so we make it displayed first.
      setup(function() {
        var mockCall = new MockCall('12334', 'incoming');
        telephonyAddCall.call(this, mockCall, {trigger: true});
      });

      test('should connect bluetooth SCO', function() {
        var connectScoSpy = this.sinon.spy(
          MockBluetoothHelperInstance, 'connectSco');
        CallsHandler.switchToDefaultOut();
        assert.isTrue(connectScoSpy.calledOnce);
      });

      test('should not connect bluetooth SCO', function() {
        var connectScoSpy = this.sinon.spy(
          MockBluetoothHelperInstance, 'connectSco');
        CallsHandler.switchToDefaultOut(true /* do not connect */);
        assert.isTrue(connectScoSpy.notCalled);
      });

      test('should disable the speaker', function() {
        CallsHandler.switchToDefaultOut();
        assert.isFalse(MockNavigatorMozTelephony.speakerEnabled);
      });
    });

    suite('> CallsHandler.switchToDefaultOut when hidden', function() {
      test('should never connect bluetooth SCO', function() {
        var connectScoSpy = this.sinon.spy(
          MockBluetoothHelperInstance, 'connectSco');
        CallsHandler.switchToDefaultOut();
        assert.isTrue(connectScoSpy.notCalled);
        CallsHandler.switchToDefaultOut(true /* do not connect */);
        assert.isTrue(connectScoSpy.notCalled);
      });

      test('should disable the speaker', function() {
        CallsHandler.switchToDefaultOut();
        assert.isFalse(MockNavigatorMozTelephony.speakerEnabled);
      });
    });

    suite('> CallsHandler.switchToReceiver', function() {
      test('should disconnect bluetooth SCO', function() {
        var disconnectScoSpy = this.sinon.spy(
          MockBluetoothHelperInstance, 'disconnectSco');
        CallsHandler.switchToReceiver();
        assert.isTrue(disconnectScoSpy.calledOnce);
      });

      test('should disable the speaker', function() {
        CallsHandler.switchToReceiver();
        assert.isFalse(MockNavigatorMozTelephony.speakerEnabled);
      });
    });

    suite('> CallsHandler.toggleSpeaker', function() {
      test('should call switchToSpeaker when toggle on', function() {
        MockNavigatorMozTelephony.speakerEnabled = false;
        this.sinon.stub(CallsHandler, 'switchToSpeaker');
        CallsHandler.toggleSpeaker();
        assert.isTrue(CallsHandler.switchToSpeaker.calledOnce);
      });

      test('should call switchToDefaultOut when toggle off', function() {
        MockNavigatorMozTelephony.speakerEnabled = true;
        this.sinon.stub(CallsHandler, 'switchToDefaultOut');
        CallsHandler.toggleSpeaker();
        assert.isTrue(CallsHandler.switchToDefaultOut.calledOnce);
      });
    });

    suite('> CallsHandler.isFirstCallOnCdmaNetwork()', function() {
      setup(function() {
        var mockCall = new MockCall('12334', 'incoming', 0);
        telephonyAddCall.call(this, mockCall);
      });

      test('radio type is NOT CDMA', function() {
        MockNavigatorMozMobileConnections[0].voice = {
          type: 'edge'
        };

        MockNavigatorMozTelephony.mTriggerCallsChanged();

        assert.isFalse(CallsHandler.isFirstCallOnCdmaNetwork());
      });

      test('radio type is CDMA', function() {
        ['evdoa', 'evdo0', 'evdob',
         '1xrtt', 'is95a', 'is95b'].forEach(function(type) {
          MockNavigatorMozMobileConnections[0].voice = { type: type };
          MockNavigatorMozTelephony.mTriggerCallsChanged();
          assert.isTrue(CallsHandler.isFirstCallOnCdmaNetwork());
        });
      });
    });
  });

  suite('> headphone and bluetooth support', function() {
    var realACM;
    var acmStub;

    suiteSetup(function() {
      acmStub = {
        headphones: false,
        addEventListener: function() {}
      };

      realACM = navigator.mozAudioChannelManager;
      navigator.mozAudioChannelManager = acmStub;
    });

    suiteTeardown(function() {
      navigator.mozAudioChannelManager = realACM;
    });

    suite('> pluging headphones in', function() {
      var headphonesChange;

      setup(function() {
        acmStub.headphones = true;
        headphonesChange = this.sinon.stub(acmStub, 'addEventListener');
        CallsHandler.setup();
      });

      test('should switch sound to default out', function() {
        var toDefaultSpy = this.sinon.spy(MockCallScreen, 'switchToDefaultOut');
        headphonesChange.yield();
        assert.isTrue(toDefaultSpy.calledWithExactly());
      });
    });

    suite('> connecting to bluetooth headset', function() {
      test('should show the bluetooth menu button when connected if a' +
           'bluetooth receiver is available', function() {
        this.sinon.stub(
          MockBluetoothHelperInstance, 'getConnectedDevicesByProfile')
          .yields(['dummyDevice']);
        var setIconStub = this.sinon.stub(MockCallScreen, 'setBTReceiverIcon');
        CallsHandler.setup();
        sinon.assert.calledOnce(setIconStub);
      });

      test('should show the speaker button when connected if no bluetooth' +
           'receiver is available', function() {
        this.sinon.stub(
          MockBluetoothHelperInstance, 'getConnectedDevicesByProfile')
          .yields([]);
        var setIconStub = this.sinon.stub(MockCallScreen, 'setBTReceiverIcon');
        CallsHandler.setup();
        sinon.assert.calledOnce(setIconStub);
      });

      test('should switch sound to BT receiver when connected', function() {
        CallsHandler.setup();
        var BTSpy = this.sinon.spy(MockCallScreen, 'switchToDefaultOut');
        MockBluetoothHelperInstance.onscostatuschanged({status: true});
        assert.isTrue(BTSpy.calledOnce);
      });
    });

    suite('> bluetooth commands', function() {
      var call1, call2, call3;

      function triggerCommand(command) {
        MockNavigatormozSetMessageHandler.mTrigger(
          'bluetooth-dialer-command', {
            command: command
          }
        );
      }

      setup(function() {
        call1 = new MockCall('111111', 'outgoing');
        call2 = new MockCall('222222', 'incoming');
        call3 = new MockCall('333333', 'incoming');
        CallsHandler.setup();
      });

      suite('> CHUP', function() {
        test('should end the active call', function() {
          MockNavigatorMozTelephony.calls = [call1];
          MockNavigatorMozTelephony.active = call1;

          var hangUpSpy = this.sinon.spy(call1, 'hangUp');
          triggerCommand('CHUP');
          sinon.assert.calledOnce(hangUpSpy);
        });
      });

      suite('> ATA', function() {
        test('should answer the incoming call', function() {
          MockNavigatorMozTelephony.calls = [call1];
          MockNavigatorMozTelephony.mTriggerCallsChanged();

          var answerSpy = this.sinon.spy(call1, 'answer');
          triggerCommand('ATA');
          sinon.assert.calledOnce(answerSpy);
        });
      });

      suite('> CHLD=0', function() {
        test('should hang up the waiting call', function() {
          MockNavigatorMozTelephony.calls = [call1, call2];
          MockNavigatorMozTelephony.mTriggerCallsChanged();

          var hangUpSpy = this.sinon.spy(call2, 'hangUp');
          triggerCommand('CHLD=0');
          sinon.assert.calledOnce(hangUpSpy);
        });
      });

      suite('> CHLD=1', function() {
        test('should end and answer the waiting call', function() {
          MockNavigatorMozTelephony.calls = [call1, call2];
          MockNavigatorMozTelephony.mTriggerCallsChanged();

          var hangUpSpy = this.sinon.spy(call1, 'hangUp');
          var answerSpy = this.sinon.spy(call2, 'answer');

          triggerCommand('CHLD=1');
          sinon.assert.calledOnce(hangUpSpy);
          sinon.assert.calledOnce(answerSpy);
        });
      });

      suite('> CHLD=2', function() {
        test('should hold and answer the waiting call', function() {
          MockNavigatorMozTelephony.calls = [call1, call2];
          MockNavigatorMozTelephony.mTriggerCallsChanged();

          var answerSpy = this.sinon.spy(call2, 'answer');
          triggerCommand('CHLD=2');
          sinon.assert.calledOnce(answerSpy);
        });
      });

      suite('> CHLD=3 conference call', function() {
        function triggerCHLD() {
          triggerCommand('CHLD=3');
        }

        test('should log a warning without enough connected calls',
        function(done) {
          MockNavigatorMozTelephony.calls = [call1];

          var addSpy =
            this.sinon.spy(MockNavigatorMozTelephony.conferenceGroup, 'add');
          var consoleWarnStub = this.sinon.stub(console, 'warn', function() {
            assert.isTrue(
              consoleWarnStub.calledWith('Cannot join conference call.'));
            assert.isFalse(addSpy.calledOnce);
            done();
          });

          triggerCHLD();
        });

        test('should merge into group call if there are two individual calls',
        function(done) {
          MockNavigatorMozTelephony.calls = [call1, call2];

          var addStub =
            this.sinon.stub(MockNavigatorMozTelephony.conferenceGroup, 'add',
            function() {
              assert.isTrue(addStub.calledWith(call1, call2));
              done();
            });

          triggerCHLD();
        });

        test('should merge individual call into group if group call exists',
        function(done) {
          MockNavigatorMozTelephony.calls = [call1];
          MockNavigatorMozTelephony.conferenceGroup.calls = [call2, call3];
          MockNavigatorMozTelephony.conferenceGroup.state = 'connected';


          var addStub =
            this.sinon.stub(MockNavigatorMozTelephony.conferenceGroup, 'add',
            function() {
              assert.isTrue(addStub.calledWith(call1));
              done();
            });

          triggerCHLD();
        });
      });
    });

    suite('> headset commands', function() {
      var mockCall;

      setup(function() {
        CallsHandler.setup();
        mockCall = new MockCall('12334', 'incoming');
      });

      function triggerHeadset(clock) {
        MockNavigatormozSetMessageHandler.mTrigger('headset-button',
                                                   'headset-button-press');
        clock.tick(10);
        MockNavigatormozSetMessageHandler.mTrigger('headset-button',
                                                   'headset-button-release');
      }

      test('should end the active call', function() {
        MockNavigatorMozTelephony.calls = [mockCall];
        MockNavigatorMozTelephony.active = mockCall;

        var hangUpSpy = this.sinon.spy(mockCall, 'hangUp');
        triggerHeadset(this.sinon.clock);
        sinon.assert.calledOnce(hangUpSpy);
      });

      test('should answer an incoming call', function() {
        MockNavigatorMozTelephony.calls = [mockCall];
        MockNavigatorMozTelephony.mTriggerCallsChanged();

        var answerSpy = this.sinon.spy(mockCall, 'answer');
        triggerHeadset(this.sinon.clock);
        sinon.assert.calledOnce(answerSpy);
      });

      test('should answer a waiting call', function() {
        var waitingCall = new MockCall('88888', 'incoming');
        MockNavigatorMozTelephony.calls = [mockCall, waitingCall];
        MockNavigatorMozTelephony.mTriggerCallsChanged();

        var answerSpy = this.sinon.spy(waitingCall, 'answer');
        triggerHeadset(this.sinon.clock);
        sinon.assert.calledOnce(answerSpy);
      });
    });
  });

  suite('> active calls getters', function() {
    var mockCalls;

    setup(function() {
      mockCalls = MockNavigatorMozTelephony.calls = [
        new MockCall('99999', 'incoming'),
        new MockCall('88888', 'incoming')
      ];
      MockNavigatorMozTelephony.active = mockCalls[0];
      MockNavigatorMozTelephony.mTriggerCallsChanged();
    });

    test('getActiveCall should return active call', function() {
      assert.equal(CallsHandler.activeCall.call.id.number,
                   MockNavigatorMozTelephony.active.id.number);
    });

    suite('> getActiveCallForContactImage', function() {
      test('should return active call if it is the only one', function() {
        MockNavigatorMozTelephony.calls = [mockCalls[0]];
        MockNavigatorMozTelephony.active = mockCalls[0];
        MockNavigatorMozTelephony.mTriggerCallsChanged();

        assert.equal(CallsHandler.activeCallForContactImage.call.id.number,
                     MockNavigatorMozTelephony.active.id.number);
      });

      test('should return first already connected call', function() {
        assert.equal(CallsHandler.activeCallForContactImage.call.id.number,
                     MockNavigatorMozTelephony.active.id.number);
      });

      test('should return null if no active call', function() {
        MockNavigatorMozTelephony.active = null;
        assert.equal(CallsHandler.activeCallForContactImage, null);
      });

      test('should return null if in group call', function() {
        MockNavigatorMozTelephony.calls = mockCalls;
        MockNavigatorMozTelephony.conferenceGroup.calls =
          mockCalls;
        MockNavigatorMozTelephony.active =
          MockNavigatorMozTelephony.conferenceGroup;

        MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
        MockNavigatorMozTelephony.mTriggerCallsChanged();

        assert.equal(CallsHandler.activeCallForContactImage, null);
      });

      test('should return null if in group call and has incoming', function() {
        MockNavigatorMozTelephony.calls =
          [mockCalls[0], new MockCall('1111', 'incoming')];
        MockNavigatorMozTelephony.conferenceGroup.calls =
          mockCalls;
        MockNavigatorMozTelephony.active =
          MockNavigatorMozTelephony.conferenceGroup;

        MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
        MockNavigatorMozTelephony.mTriggerCallsChanged();

        assert.equal(CallsHandler.activeCallForContactImage, null);
      });

      test('should return first non-group call', function() {
        var mockCall = new MockCall('2222', 'incoming');

        MockNavigatorMozTelephony.calls =
          [mockCalls[0], mockCall];
        MockNavigatorMozTelephony.conferenceGroup.calls =
          mockCalls;
        MockNavigatorMozTelephony.active = mockCall;

        MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
        MockNavigatorMozTelephony.mTriggerCallsChanged();

        assert.equal(CallsHandler.activeCallForContactImage.call.id.number,
                     MockNavigatorMozTelephony.active.id.number);
      });
    });
  });

  suite('> Audio competing event listening', function() {
    var gsmcall = null;

    setup(function() {
      AudioCompetingHelper.init('test');
      this.sinon.spy(AudioCompetingHelper, 'clearListeners');

      gsmcall = new MockCall('543552', 'connected');
      telephonyAddCall.call(this, gsmcall);

      CallsHandler.setup();
    });

    test('should call clearListeners', function() {
      sinon.assert.called(AudioCompetingHelper.clearListeners);
    });

    test('should call onMozInterrupBegin', function() {
      this.sinon.spy(gsmcall, 'hold');
      this.sinon.spy(MockAudioContext.prototype, 'addEventListener');

      MockNavigatorMozTelephony.active = gsmcall;
      AudioCompetingHelper.compete();

      sinon.assert.calledWith(MockAudioContext.prototype.addEventListener,
                              'mozinterruptbegin');
      MockAudioContext.prototype.addEventListener.yield();
      sinon.assert.called(gsmcall.hold);
      AudioCompetingHelper.leaveCompetition();
    });

    test('should call forceAnAudioCompetitionWin', function() {
      this.sinon.spy(AudioCompetingHelper, 'compete');
      this.sinon.spy(AudioCompetingHelper, 'leaveCompetition');
      this.sinon.spy(MockAudioContext.prototype, 'addEventListener');

      var gsmcall2 = new MockCall('543552', 'connected');
      telephonyAddCall.call(this, gsmcall2);

      AudioCompetingHelper.compete();

      sinon.assert.calledWith(MockAudioContext.prototype.addEventListener,
                              'mozinterruptbegin');
      MockAudioContext.prototype.addEventListener.yield();
      sinon.assert.calledOnce(AudioCompetingHelper.leaveCompetition);
      sinon.assert.calledTwice(AudioCompetingHelper.compete);
    });
  });
});
