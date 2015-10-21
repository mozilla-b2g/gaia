/* globals CallsHandler, FontSizeManager, HandledCall,
           l10nAssert, MockBluetoothHelperInstance, MockCall,
           MockCallScreen, MockConferenceGroupHandler,
           MockL10n, MockNavigatormozApps, MockNavigatorMozIccManager,
           MockNavigatorMozMobileConnections, MockNavigatormozSetMessageHandler,
           MockNavigatorMozTelephony, MockNavigatorWakeLock, MocksHelper,
           MockTonePlayer, telephonyAddCall, telephonyAddCdmaCall */

'use strict';

require('/test/unit/mock_call_screen.js');
require('/test/unit/mock_conference_group_handler.js');
require('/test/unit/mock_conference_group_ui.js');
require('/shared/test/unit/l10n_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
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
  'ConferenceGroupHandler',
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
    navigator.mozL10n = MockL10n;

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
        mockHC = telephonyAddCall.call(this, mockCall);
      });

      test('should instantiate a handled call', function() {
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(HandledCall.calledWith(mockCall));
      });

      test('should insert the handled call node in the CallScreen', function() {
        this.sinon.spy(MockCallScreen, 'insertCall');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledWith(MockCallScreen.insertCall, mockHC.node);
      });

      test('should render the CallScreen in incoming mode', function() {
        this.sinon.spy(MockCallScreen, 'render');
        this.sinon.spy(MockCallScreen, 'setCallerContactImage');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledWith(MockCallScreen.render, 'incoming');
        sinon.assert.calledOnce(MockCallScreen.setCallerContactImage);
      });

      test('should toggle the showPlaceNewCallButton', function() {
        this.sinon.spy(MockCallScreen, 'showPlaceNewCallButton');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.showPlaceNewCallButton);
      });

      test('should unmute', function() {
        this.sinon.spy(MockCallScreen, 'unmute');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.unmute);
      });

      test('should switch sound to default out', function() {
        this.sinon.spy(MockCallScreen, 'switchToDefaultOut');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.switchToDefaultOut);
      });

      test('should disable the place new call button while establishing',
      function() {
        this.sinon.spy(MockCallScreen, 'disablePlaceNewCallButton');
        mockCall.mChangeState('dialing');
        sinon.assert.calledOnce(MockCallScreen.disablePlaceNewCallButton);
      });

      test('should enable the place new call button when established',
      function() {
        this.sinon.spy(MockCallScreen, 'enablePlaceNewCallButton');
        mockCall.mChangeState('connected');
        sinon.assert.calledOnce(MockCallScreen.enablePlaceNewCallButton);
      });

      test('should show the on hold button while establishing', function() {
        this.sinon.spy(MockCallScreen, 'showOnHoldButton');
        mockCall.mChangeState('dialing');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.showOnHoldButton);
      });

      test('should disable the on hold button while establishing', function() {
        this.sinon.spy(MockCallScreen, 'disableOnHoldButton');
        mockCall.mChangeState('dialing');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.disableOnHoldButton);
      });

      test('should show the on hold button when established', function() {
        this.sinon.spy(MockCallScreen, 'showOnHoldButton');
        mockCall.mChangeState('connected');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.showOnHoldButton);
      });

      test('should enable the on hold button when established', function() {
        this.sinon.spy(MockCallScreen, 'enableOnHoldButton');
        mockCall.mChangeState('connected');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.enableOnHoldButton);
      });

      test('should hide the merge button while establishing', function() {
        this.sinon.spy(MockCallScreen, 'hideMergeButton');
        mockCall.mChangeState('dialing');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.hideMergeButton);
      });

      test('should hide the merge button when established', function() {
        this.sinon.spy(MockCallScreen, 'hideMergeButton');
        mockCall.mChangeState('connected');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.hideMergeButton);
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
          mockCall.answer();
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

    // This suite indirectly tests `exitCallScreenIfNoCalls()`. We should unit
    // test this directly instead and rely on integration tests for most of what
    // we're currently doing here.
    suite('> hanging up the last incoming call, `exitCallScreenIfNoCalls()`',
    function() {
      setup(function() {
        var mockCall = new MockCall('12334', 'incoming');
        telephonyAddCall.call(this, mockCall, {trigger: true});

        MockNavigatorMozTelephony.calls = [];

        this.sinon.spy(window, 'close');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
      });

      test('should close the callscreen app after a delay', function() {
        sinon.assert.notCalled(window.close);
        this.sinon.clock.tick(MockCallScreen.callEndPromptTime);
        sinon.assert.calledOnce(window.close);
      });

      test('should only set 1 timer for app close delay', function() {
        this.sinon.clock.tick(MockCallScreen.callEndPromptTime/2);
        sinon.assert.notCalled(window.close);
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        this.sinon.clock.tick(MockCallScreen.callEndPromptTime);
        sinon.assert.calledOnce(window.close);
      });

      test('should not close the callscreen app if a new call comes',
      function() {
        this.sinon.clock.tick(MockCallScreen.callEndPromptTime/2);

        var mockCall = new MockCall('43321', 'incoming');
        telephonyAddCall.call(this, mockCall, {trigger: true});
        MockNavigatorMozTelephony.mTriggerCallsChanged();

        this.sinon.clock.tick(MockCallScreen.callEndPromptTime);
        sinon.assert.notCalled(window.close);
      });

      test('should set \'no-handled-calls\' class on `body`', function() {
        assert.isTrue(document.body.classList.contains('no-handled-calls'));
      });

      test('should unset \'no-handled-calls\' class on `body` if new call come',
      function() {
        this.sinon.clock.tick(MockCallScreen.callEndPromptTime/2);

        var mockCall = new MockCall('43321', 'incoming');
        telephonyAddCall.call(this, mockCall, {trigger: true});
        MockNavigatorMozTelephony.mTriggerCallsChanged();

        this.sinon.clock.tick(MockCallScreen.callEndPromptTime);
        assert.isFalse(document.body.classList.contains('no-handled-calls'));
      });
    });

    suite('> receiving an extra incoming call', function() {
      var firstCall;
      var extraCall;
      var extraHC;

      setup(function() {
        firstCall = new MockCall('543552', 'incoming');
        extraCall = new MockCall('12334', 'incoming');
        extraCall.addEventListener(
          'statechange', CallsHandler.updatePlaceNewCall);

        telephonyAddCall.call(this, firstCall, {trigger: true});
        extraHC = telephonyAddCall.call(this, extraCall);
      });

      test('should instantiate another handled call', function() {
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(HandledCall.calledWith(extraCall));
      });

      test('should insert the handled call node in the CallScreen', function() {
        this.sinon.spy(MockCallScreen, 'insertCall');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledWith(MockCallScreen.insertCall, extraHC.node);
      });

      test('should hide the handled call node', function() {
        this.sinon.spy(extraHC, 'hide');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(extraHC.hide);
      });

      test('should show the call waiting UI', function() {
        this.sinon.spy(MockCallScreen, 'showIncoming');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.showIncoming);
      });

      test('should play the call waiting tone', function() {
        this.sinon.spy(MockTonePlayer, 'playSequence');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockTonePlayer.playSequence);
      });

      test('should show the contact information', function() {
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.equal(MockCallScreen.incomingNumber.textContent, 'test name');
        assert.equal(MockCallScreen.incomingNumberAdditionalTelType.textContent,
                     'type, carrier');
        assert.equal(MockCallScreen.incomingNumberAdditionalTel.textContent,
                     '12334');
      });

      test('should show the number of a unknown contact', function() {
        // 111 is a special case in MockContacts to return no contact.
        extraCall.id = { number: '111' };
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.equal(MockCallScreen.incomingNumber.textContent,
                     extraCall.id.number);
        assert.equal(MockCallScreen.incomingNumberAdditionalTelType.textContent,
                     '');
        assert.equal(MockCallScreen.incomingNumberAdditionalTel.textContent,
                     '');
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
            MockCallScreen.incomingNumber, false, 'end');
          sinon.assert.calledWith(
            FontSizeManager.ensureFixedBaseline,
            FontSizeManager.SECOND_INCOMING_CALL,
            MockCallScreen.incomingNumber
          );
        });

        test('should only call FontSizeManager.adaptToSpace if incoming call ' +
             'not a contact', function() {
          // 111 is a special case in MockContacts to return no contact.
          extraCall.id = { number: '111' };
          MockNavigatorMozTelephony.mTriggerCallsChanged();
          sinon.assert.calledWith(
            FontSizeManager.adaptToSpace, FontSizeManager.SECOND_INCOMING_CALL,
            MockCallScreen.incomingNumber, false, 'end');
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
          l10nAssert(MockCallScreen.incomingNumber, 'withheld-number');
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
          l10nAssert(MockCallScreen.incomingNumber, 'withheld-number');
        });
      });

      test('should disable the place new call button', function() {
        this.sinon.spy(MockCallScreen, 'disablePlaceNewCallButton');
        extraCall.mChangeState('alerting');
        sinon.assert.calledOnce(MockCallScreen.disablePlaceNewCallButton);
      });

      test('should show the on hold button', function() {
        this.sinon.spy(MockCallScreen, 'showOnHoldButton');
        extraCall.mChangeState('alerting');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.showOnHoldButton);
      });

      test('should disable the on hold button', function() {
        this.sinon.spy(MockCallScreen, 'disableOnHoldButton');
        extraCall.mChangeState('alerting');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.disableOnHoldButton);
      });

      test('should hide the merge button', function() {
        this.sinon.spy(MockCallScreen, 'hideMergeButton');
        extraCall.mChangeState('alerting');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.hideMergeButton);
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
          extraCall.answer();
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
            assert.isTrue(MockCallScreen.incomingSim.hidden);
          });
        });

        suite('Multiple SIMs >', function() {
          setup(function() {
            MockNavigatorMozIccManager.addIcc('424242', {'cardState': 'ready'});
          });

          test('should show the receiving sim', function() {
            MockNavigatorMozTelephony.mTriggerCallsChanged();

            l10nAssert(
              MockCallScreen.incomingSim, {
                id: 'sim-number',
                args: { n: 2 }
              }
            );
          });
        });
      });
    });

    suite('> making an extra outgoing call', function() {
      var firstCall;
      var extraCall;
      var extraHC;

      setup(function() {
        this.sinon.spy(MockCallScreen, 'disablePlaceNewCallButton');
        this.sinon.spy(MockCallScreen, 'showOnHoldButton');
        this.sinon.spy(MockCallScreen, 'hideOnHoldButton');
        this.sinon.spy(MockCallScreen, 'disableOnHoldButton');
        this.sinon.spy(MockCallScreen, 'hideMergeButton');
        firstCall = new MockCall('543552', 'incoming');
        extraCall = new MockCall('12334', 'dialing');

        telephonyAddCall.call(this, firstCall);
        extraHC = telephonyAddCall.call(this, extraCall, {trigger: true});
      });

      test('should disable the place new call button', function() {
        sinon.assert.calledOnce(MockCallScreen.disablePlaceNewCallButton);
      });

      test('should show the on hold button', function() {
        sinon.assert.calledOnce(MockCallScreen.showOnHoldButton);
      });

      test('should disable the on hold button', function() {
        sinon.assert.calledOnce(MockCallScreen.disableOnHoldButton);
      });

      test('should hide the merge button', function() {
        sinon.assert.calledOnce(MockCallScreen.hideMergeButton);
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
        this.sinon.spy(overflowCall, 'hangUp');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(overflowCall.hangUp);
      });

      test('should still instantiate a handled call', function() {
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(HandledCall.calledWith(overflowCall));
      });

      test('should not insert the handled call node in the CallScreen',
      function() {
        this.sinon.spy(MockCallScreen, 'insertCall');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.notCalled(MockCallScreen.insertCall);
      });

      suite('when a conference call is ongoing', function() {
        setup(function() {
          MockNavigatorMozTelephony.calls = [overflowCall];
          MockNavigatorMozTelephony.conferenceGroup.calls =
            [firstCall, extraCall];
        });

        test('should not hangup the call directly', function() {
          this.sinon.spy(overflowCall, 'hangUp');
          MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
          MockNavigatorMozTelephony.mTriggerCallsChanged();
          sinon.assert.notCalled(overflowCall.hangUp);
        });

        test('should insert the handled call node in the CallScreen',
        function() {
          this.sinon.spy(MockCallScreen, 'insertCall');
          MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
          MockNavigatorMozTelephony.mTriggerCallsChanged();
          sinon.assert.calledWith(MockCallScreen.insertCall, overflowHC.node);
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
        this.sinon.spy(MockCallScreen, 'showIncoming');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.showIncoming);
      });

      test('should play the call waiting tone', function() {
        this.sinon.spy(MockTonePlayer, 'playSequence');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockTonePlayer.playSequence);
      });

      test('should display the hold-and-answer button only', function() {
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        assert.isTrue(MockCallScreen.mHoldAndAnswerOnly);
      });

      test('should do the same after answering another call', function() {
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        this.sinon.spy(MockCallScreen, 'showIncoming');
        this.sinon.spy(MockCallScreen, 'hideIncoming');
        this.sinon.spy(mockCall, 'hold');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.showIncoming);
        CallsHandler.holdAndAnswer();
        sinon.assert.calledOnce(MockCallScreen.hideIncoming);
        sinon.assert.calledOnce(mockCall.hold);
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
      setup(function() {
        var firstCall = new MockCall('543552', 'incoming');
        var extraCall = new MockCall('12334', 'incoming');

        telephonyAddCall.call(this, firstCall, {trigger: true});

        telephonyAddCall.call(this, extraCall, {trigger: true});

        MockNavigatorMozTelephony.calls = [firstCall];
      });

      test('should hide the call waiting UI', function() {
        this.sinon.spy(MockCallScreen, 'hideIncoming');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        sinon.assert.calledOnce(MockCallScreen.hideIncoming);
      });

      test('should not close the callscreen app', function() {
        this.sinon.spy(window, 'close');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        this.sinon.clock.tick(MockCallScreen.callEndPromptTime);
        sinon.assert.notCalled(window.close);
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
        this.sinon.spy(firstHC, 'hide');
        this.sinon.spy(secondHC, 'hide');

        MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
        MockNavigatorMozTelephony.mTriggerCallsChanged();

        sinon.assert.notCalled(firstHC.hide);
        sinon.assert.notCalled(secondHC.hide);
      });
    });

    suite('> conference call hangups', function() {
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

        this.sinon.spy(window, 'close');
      });

      test('should not close CallScreen when first party disconnects',
      function() {
        MockNavigatorMozTelephony.calls = [firstConfCall];
        MockNavigatorMozTelephony.conferenceGroup.calls = [secondConfCall];
        MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
        MockNavigatorMozTelephony.mTriggerCallsChanged();

        this.sinon.clock.tick(MockCallScreen.callEndPromptTime);
        sinon.assert.notCalled(window.close);
      });

      test('should close CallScreen when last party disconnects',
      function() {
        MockNavigatorMozTelephony.calls = [];
        MockNavigatorMozTelephony.conferenceGroup.calls = [];
        MockNavigatorMozTelephony.mTriggerCallsChanged();

        this.sinon.clock.tick(MockCallScreen.callEndPromptTime);
        sinon.assert.calledOnce(window.close);
      });
    });
  });

  suite('> Public methods', function() {
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

      test('should enable the place new call button', function() {
        this.sinon.spy(MockCallScreen, 'enablePlaceNewCallButton');
        CallsHandler.answer();
        sinon.assert.calledOnce(MockCallScreen.enablePlaceNewCallButton);
      });
    });

    suite('> CallsHandler.end()', function() {
      suite('> ending a simple call', function() {
        var mockCall;

        setup(function() {
          mockCall = new MockCall('543552', 'incoming');
          this.sinon.spy(mockCall, 'hangUp');
          mockCall.addEventListener(
            'statechange', CallsHandler.updatePlaceNewCall);
          telephonyAddCall.call(this, mockCall, {trigger: true});
          MockNavigatorMozTelephony.active = mockCall;
        });

        test('should hangup the active call', function() {
          CallsHandler.end();
          sinon.assert.calledOnce(mockCall.hangUp);
        });

        test('should hangup the held call', function() {
          MockNavigatorMozTelephony.active = null;
          CallsHandler.end();
          sinon.assert.calledOnce(mockCall.hangUp);
        });

        test('should enable the place new call button', function() {
          this.sinon.spy(MockCallScreen, 'enablePlaceNewCallButton');
          CallsHandler.end();
          sinon.assert.calledOnce(MockCallScreen.enablePlaceNewCallButton);
        });
      });

      suite('> ending a conference call', function() {
        var firstConfCall;
        var secondConfCall;
        var mockPromise;

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

          mockPromise = Promise.resolve();
          this.sinon.stub(MockNavigatorMozTelephony.conferenceGroup, 'hangUp')
                         .returns(mockPromise);
        });

        teardown(function() {
          MockConferenceGroupHandler.mTeardown();
        });

        test('should hangup all the calls in the conference group', function() {
          CallsHandler.end();
          sinon.assert.calledOnce(
            MockNavigatorMozTelephony.conferenceGroup.hangUp);
        });

        test('should hangup all the calls in the held conference group',
        function() {
          MockNavigatorMozTelephony.active = null;
          CallsHandler.end();
          sinon.assert.calledOnce(
            MockNavigatorMozTelephony.conferenceGroup.hangUp);
        });

        test('should call ConferenceGroupHandler.signalConferenceEnded()',
        function(done) {
          this.sinon.spy(MockConferenceGroupHandler, 'signalConferenceEnded');
          CallsHandler.end();
          mockPromise.then(function() {
            sinon.assert.calledOnce(
              MockConferenceGroupHandler.signalConferenceEnded);
          }).then(done, done);
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
          this.sinon.spy(MockCallScreen, 'enablePlaceNewCallButton');
          CallsHandler.end();
          sinon.assert.calledOnce(MockCallScreen.enablePlaceNewCallButton);
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
          this.sinon.spy(MockCallScreen, 'enablePlaceNewCallButton');
          CallsHandler.end();
          sinon.assert.calledOnce(MockCallScreen.enablePlaceNewCallButton);
        });
      });
    });

    suite('> CallsHandler.holdAndAnswer()', function() {
      suite('when handledCalls.length < 2', function() {
        test('should do nothing when there is no call', function() {
          var hideIncomingSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
          CallsHandler.holdAndAnswer();
          assert.isTrue(hideIncomingSpy.notCalled);
        });

        test('should do nothing when there is one call', function() {
          var call = new MockCall('543552', 'connected');
          telephonyAddCall.call(this, call, {trigger: true});
          MockNavigatorMozTelephony.active = call;

          var hideIncomingSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
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
            this.sinon.spy(MockCallScreen, 'disablePlaceNewCallButton');
            incomingCall.mChangeState('dialing');
            sinon.assert.calledOnce(MockCallScreen.disablePlaceNewCallButton);
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
            call.answer();
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
          var hideIncomingSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
          CallsHandler.endAndAnswer();
          assert.isTrue(hideIncomingSpy.notCalled);
        });

        test('should do nothing when there is one call', function() {
          var call = new MockCall('543552', 'connected');
          telephonyAddCall.call(this, call, {trigger: true});
          MockNavigatorMozTelephony.active = call;

          this.sinon.spy(MockCallScreen, 'hideIncoming');
          this.sinon.spy(call, 'hangUp');
          CallsHandler.endAndAnswer();
          sinon.assert.notCalled(MockCallScreen.hideIncoming);
          sinon.assert.notCalled(call.hangUp);
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
            this.sinon.spy(MockNavigatorMozTelephony.active, 'hangUp');
            CallsHandler.endAndAnswer();
            sinon.assert.calledOnce(MockNavigatorMozTelephony.active.hangUp);
          });

          test('should hide the call waiting UI', function() {
            this.sinon.spy(MockCallScreen, 'hideIncoming');
            CallsHandler.endAndAnswer();
            sinon.assert.calledOnce(MockCallScreen.hideIncoming);
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
            this.sinon.spy(heldCall, 'hangUp');
            CallsHandler.endAndAnswer();
            sinon.assert.calledOnce(heldCall.hangUp);
          });

          test('should hide the call waiting UI', function() {
            this.sinon.spy(MockCallScreen, 'hideIncoming');
            CallsHandler.endAndAnswer();
            sinon.assert.calledOnce(MockCallScreen.hideIncoming);
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
            this.sinon.spy(mockCall, 'hold');
            CallsHandler.endAndAnswer();
            sinon.assert.calledOnce(mockCall.hold);
          });

          test('should hide the call waiting UI', function() {
            this.sinon.spy(MockCallScreen, 'hideIncoming');
            CallsHandler.endAndAnswer();
            sinon.assert.calledOnce(MockCallScreen.hideIncoming);
          });

          test('should enable the CDMA call waiting UI', function() {
            CallsHandler.endAndAnswer();
            assert.equal(MockCallScreen.mCdmaCallWaiting, true);
          });

          test('should inform bluetooth of answering second call', function() {
            this.sinon.spy(MockBluetoothHelperInstance, 'answerWaitingCall');
            CallsHandler.endAndAnswer();
            sinon.assert.calledOnce(
              MockBluetoothHelperInstance.answerWaitingCall);
          });
      });

      suite('when a conference call is active', function() {
        var firstConfCall;
        var secondConfCall;
        var mockPromise;

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

          mockPromise = Promise.resolve();
          this.sinon.stub(MockNavigatorMozTelephony.conferenceGroup, 'hangUp')
                         .returns(mockPromise);
        });

        teardown(function() {
          MockConferenceGroupHandler.mTeardown();
        });

        test('should hangup all the calls in the conference group', function() {
          CallsHandler.endAndAnswer();
          sinon.assert.calledOnce(
            MockNavigatorMozTelephony.conferenceGroup.hangUp);
        });

        test('should hide the call waiting UI', function(done) {
          CallsHandler.endAndAnswer();
          mockPromise.then(function() {
            assert.isTrue(MockCallScreen.mHideIncomingCalled);
          }).then(done, done);
        });

        test('should call ConferenceGroupHandler.signalConferenceEnded()',
        function(done) {
          this.sinon.spy(MockConferenceGroupHandler, 'signalConferenceEnded');
          CallsHandler.endAndAnswer();
          mockPromise.then(function() {
            sinon.assert.calledOnce(
              MockConferenceGroupHandler.signalConferenceEnded);
          }).then(done, done);
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

        suite('when the call is held', function() {
          setup(function() {
            MockNavigatorMozTelephony.active = null;
            mockCall._hold();
          });

          test('should resume the call', function() {
            var resumeSpy = this.sinon.spy(mockCall, 'resume');
            CallsHandler.toggleCalls();
            assert.isTrue(resumeSpy.calledOnce);
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

    suite('CallsHandler.updateMergeAndOnHoldStatus', function() {
      suite('1 establishing call', function() {
        var mockCall;
        setup(function() {
          mockCall = new MockCall('111111111', 'dialing');
          telephonyAddCall.call(this, mockCall, {trigger: true});
          this.sinon.spy(MockCallScreen, 'showOnHoldButton');
          this.sinon.spy(MockCallScreen, 'hideOnHoldButton');
          this.sinon.spy(MockCallScreen, 'enableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'disableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'setShowIsHeld');
          this.sinon.spy(MockCallScreen, 'showMergeButton');
          this.sinon.spy(MockCallScreen, 'hideMergeButton');
          this.sinon.spy(MockCallScreen, 'showOnHoldAndMergeContainer');
          this.sinon.spy(MockCallScreen, 'hideOnHoldAndMergeContainer');
        });

        test('should show the hold/merge container', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showOnHoldAndMergeContainer);
        });

        test('should disable the on hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.disableOnHoldButton);
        });

        test('should hide the merge button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideMergeButton);
        });

        test('should show the on hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showOnHoldButton);
        });

        test('should disable the on hold button active state', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledWith(MockCallScreen.setShowIsHeld, false);
        });

        test('should hide the hold and merge buttons if the call is not ' +
             'switchable',
        function() {
          mockCall.switchable = false;

          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideOnHoldAndMergeContainer);
        });
      });

      suite('1 established call', function() {
        var mockCall;

        setup(function() {
          mockCall = new MockCall('111111111', 'connected');
          telephonyAddCall.call(this, mockCall, {trigger: true});
          this.sinon.spy(MockCallScreen, 'showOnHoldButton');
          this.sinon.spy(MockCallScreen, 'hideOnHoldButton');
          this.sinon.spy(MockCallScreen, 'enableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'disableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'setShowIsHeld');
          this.sinon.spy(MockCallScreen, 'showMergeButton');
          this.sinon.spy(MockCallScreen, 'hideMergeButton');
          this.sinon.spy(MockCallScreen, 'showOnHoldAndMergeContainer');
          this.sinon.spy(MockCallScreen, 'hideOnHoldAndMergeContainer');
        });

        test('should show the hold/merge container', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showOnHoldAndMergeContainer);
        });

        test('should enable the on hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.enableOnHoldButton);
        });

        test('should hide the merge button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideMergeButton);
        });

        test('should show the on hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showOnHoldButton);
        });

        test('should disable the on hold button active state', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledWith(MockCallScreen.setShowIsHeld, false);
        });

        test('should hide the hold and merge buttons if the call is not ' +
             'switchable',
        function() {
          mockCall.switchable = false;

          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideOnHoldAndMergeContainer);
        });
      });

      suite('1 held call', function() {
        var mockCall;

        setup(function() {
          mockCall = new MockCall('111111111', 'held');
          telephonyAddCall.call(this, mockCall, {trigger: true});
          this.sinon.spy(MockCallScreen, 'showOnHoldButton');
          this.sinon.spy(MockCallScreen, 'hideOnHoldButton');
          this.sinon.spy(MockCallScreen, 'enableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'disableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'setShowIsHeld');
          this.sinon.spy(MockCallScreen, 'showMergeButton');
          this.sinon.spy(MockCallScreen, 'hideMergeButton');
          this.sinon.spy(MockCallScreen, 'showOnHoldAndMergeContainer');
          this.sinon.spy(MockCallScreen, 'hideOnHoldAndMergeContainer');
        });

        test('should show the hold/merge container', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showOnHoldAndMergeContainer);
        });

        test('should enable the on hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.enableOnHoldButton);
        });

        test('should hide the merge button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideMergeButton);
        });

        test('should show the on hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showOnHoldButton);
        });

        test('should enable the on hold button active state', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledWith(MockCallScreen.setShowIsHeld, true);
        });

        test('should hide the hold and merge buttons if the call is not ' +
             'switchable',
        function() {
          mockCall.switchable = false;

          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideOnHoldAndMergeContainer);
        });
      });

      suite('1 conference established call', function() {
        var conferenceCall1, conferenceCall2;

        setup(function() {
          conferenceCall1 = new MockCall('111111111', 'connected');
          conferenceCall2 = new MockCall('222222222', 'connected');

          telephonyAddCall.call(this, conferenceCall1, {trigger: true});
          telephonyAddCall.call(this, conferenceCall2, {trigger: true});

          MockNavigatorMozTelephony.conferenceGroup.calls =
            [conferenceCall1, conferenceCall2];
          MockNavigatorMozTelephony.calls = [];

          this.sinon.spy(MockCallScreen, 'showOnHoldButton');
          this.sinon.spy(MockCallScreen, 'hideOnHoldButton');
          this.sinon.spy(MockCallScreen, 'enableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'disableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'setShowIsHeld');
          this.sinon.spy(MockCallScreen, 'showMergeButton');
          this.sinon.spy(MockCallScreen, 'hideMergeButton');
          this.sinon.spy(MockCallScreen, 'showOnHoldAndMergeContainer');
          this.sinon.spy(MockCallScreen, 'hideOnHoldAndMergeContainer');
        });

        test('should show the hold/merge container', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showOnHoldAndMergeContainer);
        });

        test('should enable the on hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.enableOnHoldButton);
        });

        test('should hide the merge button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideMergeButton);
        });

        test('should show the on hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showOnHoldButton);
        });

        test('should disable the on hold button active state', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledWith(MockCallScreen.setShowIsHeld, false);
        });

        test('should hide the hold and merge buttons if the call is not ' +
             'switchable',
        function() {
          conferenceCall1.switchable = false;
          conferenceCall2.switchable = false;

          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideOnHoldAndMergeContainer);
        });
      });

      suite('1 conference held call', function() {
        var conferenceCall1, conferenceCall2;

        setup(function() {
          conferenceCall1 = new MockCall('111111111', 'connected');
          conferenceCall2 = new MockCall('222222222', 'connected');

          telephonyAddCall.call(this, conferenceCall1, {trigger: true});
          telephonyAddCall.call(this, conferenceCall2, {trigger: true});

          MockNavigatorMozTelephony.conferenceGroup.calls =
            [conferenceCall1, conferenceCall2];
          MockNavigatorMozTelephony.calls = [];
          MockNavigatorMozTelephony.conferenceGroup.state = 'held';

          this.sinon.spy(MockCallScreen, 'showOnHoldButton');
          this.sinon.spy(MockCallScreen, 'hideOnHoldButton');
          this.sinon.spy(MockCallScreen, 'enableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'disableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'setShowIsHeld');
          this.sinon.spy(MockCallScreen, 'showMergeButton');
          this.sinon.spy(MockCallScreen, 'hideMergeButton');
          this.sinon.spy(MockCallScreen, 'showOnHoldAndMergeContainer');
          this.sinon.spy(MockCallScreen, 'hideOnHoldAndMergeContainer');
        });

        test('should show the hold/merge container', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showOnHoldAndMergeContainer);
        });

        test('should enable the on hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.enableOnHoldButton);
        });

        test('should hide the merge button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideMergeButton);
        });

        test('should show the on hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showOnHoldButton);
        });

        test('should enable the on hold button active state', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledWith(MockCallScreen.setShowIsHeld, true);
        });

        test('should hide the show and merge buttons if the call is not ' +
             'switchable',
        function() {
          conferenceCall1.switchable = false;
          conferenceCall2.switchable = false;

          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideOnHoldAndMergeContainer);
        });
      });

      suite('1 one-to-one established call and 1 establishing call',
      function() {
        setup(function() {
          telephonyAddCall.call(
            this, new MockCall('111111111', 'connected'), {trigger: true});
          telephonyAddCall.call(
            this, new MockCall('222222222', 'dialing'), {trigger: true});

          this.sinon.spy(MockCallScreen, 'showOnHoldButton');
          this.sinon.spy(MockCallScreen, 'hideOnHoldButton');
          this.sinon.spy(MockCallScreen, 'enableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'disableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'setShowIsHeld');
          this.sinon.spy(MockCallScreen, 'showMergeButton');
          this.sinon.spy(MockCallScreen, 'hideMergeButton');
        });

        test('should disable the on hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.disableOnHoldButton);
        });

        test('should hide the merge button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideMergeButton);
        });

        test('should show the on hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showOnHoldButton);
        });

        test('should disable the on hold button active state', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledWith(MockCallScreen.setShowIsHeld, false);
        });
      });

      suite('1 conference established call and 1 establishing call',
      function() {
        var conferenceCall1, conferenceCall2;

        setup(function() {
          conferenceCall1 = new MockCall('111111111', 'incoming');
          conferenceCall2 = new MockCall('222222222', 'incoming');
          telephonyAddCall.call(
            this, new MockCall('333333333', 'dialing'), {trigger: true});

          telephonyAddCall.call(this, conferenceCall1, {trigger: true});
          telephonyAddCall.call(this, conferenceCall2, {trigger: true});

          MockNavigatorMozTelephony.conferenceGroup.calls =
            [conferenceCall1, conferenceCall2];

          this.sinon.spy(MockCallScreen, 'showOnHoldButton');
          this.sinon.spy(MockCallScreen, 'hideOnHoldButton');
          this.sinon.spy(MockCallScreen, 'enableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'disableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'setShowIsHeld');
          this.sinon.spy(MockCallScreen, 'showMergeButton');
          this.sinon.spy(MockCallScreen, 'hideMergeButton');
        });

        test('should disable the on hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.disableOnHoldButton);
        });

        test('should hide the merge button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideMergeButton);
        });

        test('should show the on hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showOnHoldButton);
        });

        test('should disable the on hold button active state', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledWith(MockCallScreen.setShowIsHeld, false);
        });
      });

      suite('2 one-to-one established calls', function() {
        setup(function() {
          telephonyAddCall.call(
            this, new MockCall('111111111', 'connected'), {trigger: true});
          telephonyAddCall.call(
            this, new MockCall('222222222', 'connected'), {trigger: true});

          this.sinon.spy(MockCallScreen, 'showOnHoldButton');
          this.sinon.spy(MockCallScreen, 'hideOnHoldButton');
          this.sinon.spy(MockCallScreen, 'enableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'disableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'setShowIsHeld');
          this.sinon.spy(MockCallScreen, 'showMergeButton');
          this.sinon.spy(MockCallScreen, 'hideMergeButton');
          this.sinon.spy(MockCallScreen, 'showOnHoldAndMergeContainer');
          this.sinon.spy(MockCallScreen, 'hideOnHoldAndMergeContainer');
        });

        test('should show the hold/merge container', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showOnHoldAndMergeContainer);
        });

        test('should hide the on-hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideOnHoldButton);
        });

        test('should do nothing with the active state of the on hold button',
        function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.notCalled(MockCallScreen.setShowIsHeld);
        });

        test('should show the merge button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showMergeButton);
        });

        test('should hide the show and merge buttons if the call is not ' +
             'mergeable',
        function() {
          MockNavigatorMozTelephony.calls[0].mergeable = false;
          MockNavigatorMozTelephony.calls[1].mergeable = false;

          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideOnHoldAndMergeContainer);
        });
      });

      suite('1 one-to-one and 1 conference established calls', function() {
        var singleCall, conferenceCall1, conferenceCall2;

        setup(function() {
          singleCall = new MockCall('111111111', 'incoming');
          conferenceCall1 = new MockCall('222222222', 'incoming');
          conferenceCall2 = new MockCall('333333333', 'incoming');

          telephonyAddCall.call(this, conferenceCall1, {trigger: true});
          telephonyAddCall.call(this, conferenceCall2, {trigger: true});

          telephonyAddCall.call(this, singleCall);

          MockNavigatorMozTelephony.calls = [singleCall];
          MockNavigatorMozTelephony.conferenceGroup.calls =
            [conferenceCall1, conferenceCall2];

          this.sinon.spy(MockCallScreen, 'showOnHoldButton');
          this.sinon.spy(MockCallScreen, 'hideOnHoldButton');
          this.sinon.spy(MockCallScreen, 'enableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'disableOnHoldButton');
          this.sinon.spy(MockCallScreen, 'setShowIsHeld');
          this.sinon.spy(MockCallScreen, 'showMergeButton');
          this.sinon.spy(MockCallScreen, 'hideMergeButton');
          this.sinon.spy(MockCallScreen, 'showOnHoldAndMergeContainer');
          this.sinon.spy(MockCallScreen, 'hideOnHoldAndMergeContainer');
        });

        test('should show the hold/merge container', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showOnHoldAndMergeContainer);
        });

        test('should hide the on-hold button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideOnHoldButton);
        });

        test('should do nothing with the active state of the on hold button',
        function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.notCalled(MockCallScreen.setShowIsHeld);
        });

        test('should show the merge button', function() {
          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.showMergeButton);
        });

        test('should hide the show and merge buttons if the call is not ' +
             'mergeable',
        function() {
          MockNavigatorMozTelephony.calls[0].mergeable = false;
          conferenceCall1.mergeable = false;
          conferenceCall2.mergeable = false;

          CallsHandler.updateMergeAndOnHoldStatus();
          sinon.assert.calledOnce(MockCallScreen.hideOnHoldAndMergeContainer);
        });
      });
    });

    suite('> CallsHandler.updateAllPhoneNumberDisplays', function() {
      var firstCall, secondCall, firstHC, secondHC, firstSpy, secondSpy;

      setup(function() {
        firstCall = new MockCall('543552', 'incoming');
        secondCall = new MockCall('12334', 'incoming');
        firstHC = telephonyAddCall.call(this, firstCall);
        secondHC = telephonyAddCall.call(this, secondCall);
        firstSpy = this.sinon.spy(firstHC, 'restorePhoneNumber');
        secondSpy = this.sinon.spy(secondHC, 'restorePhoneNumber');
        MockNavigatorMozTelephony.mTriggerCallsChanged();
      });

      test('should restore phone number for every 1 to 1 handled call',
      function() {
        CallsHandler.updateAllPhoneNumberDisplays();
        assert.isTrue(firstSpy.calledOnce);
        assert.isTrue(secondSpy.calledOnce);
      });

      test('should not restore the phone number of calls leaving a ' +
           'conference call',
      function() {
        // Data when the conference call is finished because the second call
        //  left the conference.
        MockNavigatorMozTelephony.calls = [firstCall];
        MockNavigatorMozTelephony.conferenceGroup.calls = [];
        secondHC._leftGroup = true;
        MockNavigatorMozTelephony.mTriggerCallsChanged();
        CallsHandler.updateAllPhoneNumberDisplays();
        sinon.assert.calledOnce(firstSpy);
        sinon.assert.notCalled(secondSpy);
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
        MockNavigatorMozTelephony.active = mockCall;
      });

      test('should connect bluetooth SCO', function() {
        this.sinon.spy(MockBluetoothHelperInstance, 'connectSco');
        CallsHandler.switchToDefaultOut();
        sinon.assert.calledOnce(MockBluetoothHelperInstance.connectSco);
      });

      test('should not connect bluetooth SCO', function() {
        this.sinon.spy(MockBluetoothHelperInstance, 'connectSco');
        CallsHandler.switchToDefaultOut(true /* do not connect */);
        sinon.assert.notCalled(MockBluetoothHelperInstance.connectSco);
      });

      test('should disable the speaker', function() {
        CallsHandler.switchToDefaultOut();
        assert.isFalse(MockNavigatorMozTelephony.speakerEnabled);
      });

      test('should not connect bluetooth SCO if no Active call', function() {
        this.sinon.spy(MockBluetoothHelperInstance, 'connectSco');
        MockNavigatorMozTelephony.active = null;
        CallsHandler.switchToDefaultOut(false);
        sinon.assert.notCalled(MockBluetoothHelperInstance.connectSco);
      });
    });

    suite('> CallsHandler.switchToDefaultOut when hidden', function() {
      test('should never connect bluetooth SCO', function() {
        this.sinon.spy(MockBluetoothHelperInstance, 'connectSco');
        CallsHandler.switchToDefaultOut();
        sinon.assert.notCalled(MockBluetoothHelperInstance.connectSco);
        CallsHandler.switchToDefaultOut(true /* do not connect */);
        sinon.assert.notCalled(MockBluetoothHelperInstance.connectSco);
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

        test('should not try to hold a non-switchable call', function() {
          call1.switchable = false;
          MockNavigatorMozTelephony.calls = [call1];
          MockNavigatorMozTelephony.active = call1;
          MockNavigatorMozTelephony.mTriggerCallsChanged();

          this.sinon.spy(call1, 'hold');
          triggerCommand('CHLD=2');
          sinon.assert.notCalled(call1.hold);
        });
      });

      suite('> CHLD=3 conference call', function() {
        function triggerCHLD() {
          triggerCommand('CHLD=3');
        }

        setup(function() {
          this.sinon.spy(MockNavigatorMozTelephony.conferenceGroup, 'add');
        });

        test('should log a warning without enough connected calls',
        function() {
          this.sinon.stub(console, 'warn');
          MockNavigatorMozTelephony.calls = [call1];

          triggerCHLD();
          sinon.assert.calledWith(console.warn, 'Cannot join conference call.');
          sinon.assert.notCalled(MockNavigatorMozTelephony.conferenceGroup.add);
        });

        test('should merge into group call if there are two individual calls',
        function() {
          MockNavigatorMozTelephony.calls = [call1, call2];

          triggerCHLD();
          sinon.assert.calledWith(
            MockNavigatorMozTelephony.conferenceGroup.add,
            call1,
            call2
          );
        });

        test('should merge individual call into group if group call exists',
        function() {
          MockNavigatorMozTelephony.calls = [call1];
          MockNavigatorMozTelephony.conferenceGroup.calls = [call2, call3];
          MockNavigatorMozTelephony.conferenceGroup.state = 'connected';

          triggerCHLD();
          sinon.assert.calledWith(
            MockNavigatorMozTelephony.conferenceGroup.add,
            call1
          );
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

  suite('> busy tone', function() {
    var mockCall;

    setup(function() {
      this.sinon.spy(MockTonePlayer, 'playSequence');
      mockCall = new MockCall('12334', 'incoming');
      MockNavigatorMozTelephony.active = mockCall;
    });

    test('should play the busy tone if we found the line busy', function() {
      var sequence = [[480, 620, 500], [0, 0, 500],
                      [480, 620, 500], [0, 0, 500],
                      [480, 620, 500], [0, 0, 500]];

      MockNavigatorMozTelephony.mTriggerCallsChanged();
      mockCall.error = { name: 'BusyError' };
      mockCall.triggerEvent('error');
      sinon.assert.calledWith(MockTonePlayer.playSequence, sequence);
    });
  });
});
