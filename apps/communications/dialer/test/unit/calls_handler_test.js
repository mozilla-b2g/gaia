'use strict';

requireApp('communications/dialer/test/unit/mock_moztelephony.js');
requireApp('communications/dialer/test/unit/mock_call.js');
requireApp('communications/dialer/test/unit/mock_handled_call.js');
requireApp('communications/dialer/test/unit/mock_call_screen.js');
requireApp('communications/dialer/test/unit/mock_l10n.js');
requireApp('communications/dialer/test/unit/mock_contacts.js');
requireApp('communications/dialer/test/unit/mock_tone_player.js');
requireApp('communications/dialer/test/unit/mock_bluetooth_helper.js');
requireApp('communications/dialer/test/unit/mock_utils.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_audio.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_settings_url.js');

// The CallsHandler binds stuff when evaluated so we load it
// after the mocks and we don't want it to show up as a leak.
if (!this.CallsHandler) {
  this.CallsHandler = null;
}

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
  'Audio'
]).init();

suite('calls handler', function() {
  var realMozTelephony;
  var realMozApps;

  mocksHelperForCallsHandler.attachTestHelpers();

  suiteSetup(function(done) {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockMozTelephony;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    requireApp('communications/dialer/js/calls_handler.js', done);
  });

  suiteTeardown(function() {
    MockMozTelephony.mSuiteTeardown();
    navigator.moztelephony = realMozTelephony;
    navigator.mozApps = realMozApps;
  });

  setup(function() {
    this.sinon.useFakeTimers();
  });

  teardown(function() {
    MockMozTelephony.mTeardown();
  });

  suite('> telephony.oncallschanged handling', function() {
    suite('> receiving a first incoming call', function() {
      var mockCall;
      var mockHC;

      setup(function() {
        mockCall = new MockCall('12334', 'incoming');
        mockHC = telephonyAddCall.call(this, mockCall);
      });

      test('should instanciate a handled call', function() {
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(HandledCall.calledWith(mockCall));
      });

      test('should insert the handled call node in the CallScreen', function() {
        var insertSpy = this.sinon.spy(MockCallScreen, 'insertCall');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(insertSpy.calledWith(mockHC.node));
      });

      test('should render the CallScreen in incoming mode', function() {
        var renderSpy = this.sinon.spy(MockCallScreen, 'render');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(renderSpy.calledWith('incoming'));
      });

      test('should toggle the CallScreen', function() {
        var toggleSpy = this.sinon.spy(MockCallScreen, 'toggle');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(toggleSpy.calledOnce);
      });

      test('should unmute', function() {
        var unmuteSpy = this.sinon.spy(MockCallScreen, 'unmute');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(unmuteSpy.calledOnce);
      });

      test('should switch sound to default out', function() {
        var toDefaultSpy = this.sinon.spy(MockCallScreen, 'switchToDefaultOut');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(toDefaultSpy.calledOnce);
      });

      test('should ring if the setting is enabled', function() {
        var playSpy = this.sinon.spy(MockAudio.prototype, 'play');

        MockSettingsListener.mCallbacks['audio.volume.notification'](7);
        CallsHandler.setup();
        MockMozTelephony.mTriggerCallsChanged();

        assert.isTrue(playSpy.called);
      });

      test('should vibrate if the setting is enabled', function() {
        var vibrateSpy = this.sinon.spy(navigator, 'vibrate');

        MockSettingsListener.mCallbacks['vibration.enabled'](true);
        CallsHandler.setup();
        MockMozTelephony.mTriggerCallsChanged();

        this.sinon.clock.tick(1000);
        assert.isTrue(vibrateSpy.called);
      });
    });

    suite('> hanging up the last incoming call', function() {
      setup(function() {
        var mockCall = new MockCall('12334', 'incoming');
        var mockHC = telephonyAddCall.call(this, mockCall, {trigger: true});

        MockMozTelephony.calls = [];
      });

      test('should toggle the CallScreen', function() {
        var toggleSpy = this.sinon.spy(MockCallScreen, 'toggle');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(toggleSpy.calledOnce);
      });
    });

    suite('> receiving an extra incoming call', function() {
      var extraCall;
      var extraHC;

      setup(function() {
        var firstCall = new MockCall('543552', 'incoming');
        extraCall = new MockCall('12334', 'incoming');

        telephonyAddCall.call(this, firstCall, {trigger: true});
        extraHC = telephonyAddCall.call(this, extraCall);
      });

      test('should instanciate another handled call', function() {
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(HandledCall.calledWith(extraCall));
      });

      test('should insert the handled call node in the CallScreen', function() {
        var insertSpy = this.sinon.spy(MockCallScreen, 'insertCall');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(insertSpy.calledWith(extraHC.node));
      });

      test('should hide the handled call node', function() {
        var hideSpy = this.sinon.spy(extraHC, 'hide');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(hideSpy.calledOnce);
      });

      test('should show the call waiting UI', function() {
        var showSpy = this.sinon.spy(MockCallScreen, 'showIncoming');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(showSpy.calledOnce);
      });

      test('should play the call waiting tone', function() {
        var playSpy = this.sinon.spy(MockTonePlayer, 'playSequence');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(playSpy.calledOnce);
      });

      test('should show the contact information', function() {
        MockMozTelephony.mTriggerCallsChanged();
        assert.equal(CallScreen.incomingNumber.textContent, 'test name');
        assert.isTrue(MockUtils.mCalledGetPhoneNumberAdditionalInfo);
        assert.equal(CallScreen.incomingNumberAdditionalInfo.textContent,
                     extraCall.number);
      });

      test('should show the number of a unknown contact', function() {
        // 111 is a special case for unknown contacts in MockContacts
        extraCall.number = '111';
        MockMozTelephony.mTriggerCallsChanged();
        assert.equal(CallScreen.incomingNumber.textContent, extraCall.number);
        assert.isTrue(MockUtils.mCalledGetPhoneNumberAdditionalInfo);
        assert.equal(CallScreen.incomingNumberAdditionalInfo.textContent, '');
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
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(hangupSpy.calledOnce);
      });

      test('should still instanciate a handled call', function() {
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(HandledCall.calledWith(overflowCall));
      });

      test('should not insert the handled call node in the CallScreen',
      function() {
        var insertSpy = this.sinon.spy(MockCallScreen, 'insertCall');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(insertSpy.notCalled);
      });

      suite('when a conference call is ongoing', function() {
        setup(function() {
          MockMozTelephony.calls = [overflowCall];
          MockMozTelephony.conferenceGroup.calls = [firstCall, extraCall];
        });

        test('should not hangup the call directly', function() {
          var hangupSpy = this.sinon.spy(overflowCall, 'hangUp');
          MockMozTelephony.mTriggerGroupCallsChanged();
          MockMozTelephony.mTriggerCallsChanged();
          assert.isTrue(hangupSpy.notCalled);
        });

        test('should insert the handled call node in the CallScreen',
        function() {
          var insertSpy = this.sinon.spy(MockCallScreen, 'insertCall');
          MockMozTelephony.mTriggerGroupCallsChanged();
          MockMozTelephony.mTriggerCallsChanged();
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
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(showSpy.calledOnce);
      });

      test('should play the call waiting tone', function() {
        var playSpy = this.sinon.spy(MockTonePlayer, 'playSequence');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(playSpy.calledOnce);
      });

      test('should display the hold-and-answer button only', function() {
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(MockCallScreen.mHoldAndAnswerOnly);
      });

      test('should do the same after answering another call', function() {
        MockMozTelephony.mTriggerCallsChanged();
        var showSpy = this.sinon.spy(MockCallScreen, 'showIncoming');
        var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
        var holdSpy = this.sinon.spy(mockCall, 'hold');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(showSpy.calledOnce);
        CallsHandler.holdAndAnswer();
        assert.isTrue(hideSpy.calledOnce);
        assert.isTrue(holdSpy.calledOnce);
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

        MockMozTelephony.calls = [firstCall];
      });

      test('should hide the call waiting UI', function() {
        var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
        MockMozTelephony.mTriggerCallsChanged();
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

        MockMozTelephony.calls = [];
        MockMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                  secondConfCall];
      });

      test('should not hide the handled calls', function() {
        var firstHideSpy = this.sinon.spy(firstHC, 'hide');
        var secondHideSpy = this.sinon.spy(secondHC, 'hide');

        MockMozTelephony.mTriggerGroupCallsChanged();
        MockMozTelephony.mTriggerCallsChanged();

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

        MockMozTelephony.calls = [];
        MockMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                  secondConfCall];

        MockMozTelephony.mTriggerGroupCallsChanged();
        MockMozTelephony.mTriggerCallsChanged();

        MockMozTelephony.calls = [firstConfCall];
        MockMozTelephony.conferenceGroup.calls = [secondConfCall];

        MockMozTelephony.mTriggerGroupCallsChanged();
        MockMozTelephony.mTriggerCallsChanged();

        MockMozTelephony.calls = [];
        MockMozTelephony.conferenceGroup.calls = [];
      });

      test('should toggle the CallScreen', function() {
        var toggleSpy = this.sinon.spy(MockCallScreen, 'toggle');
        MockMozTelephony.mTriggerCallsChanged();
        MockMozTelephony.mTriggerGroupCallsChanged();
        assert.isTrue(toggleSpy.calledOnce);
      });
    });
  });

  suite('> Public methods', function() {
    suite('> CallsHandler.answer()', function() {
      var mockCall;

      setup(function() {
        mockCall = new MockCall('12334', 'incoming');
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
    });

    suite('> CallsHandler.end()', function() {
      suite('> ending a simple call', function() {
        var mockCall;

        setup(function() {
          mockCall = new MockCall('543552', 'incoming');
          telephonyAddCall.call(this, mockCall, {trigger: true});
          MockMozTelephony.active = mockCall;
        });

        test('should hangup the active call', function() {
          var hangUpSpy = this.sinon.spy(mockCall, 'hangUp');
          CallsHandler.end();
          assert.isTrue(hangUpSpy.calledOnce);
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

          MockMozTelephony.calls = [];
          MockMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                    secondConfCall];

          MockMozTelephony.active = MockMozTelephony.conferenceGroup;
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

          telephonyAddCall.call(this, firstCall, {trigger: true});
          telephonyAddCall.call(this, secondCall, {trigger: true});
          MockMozTelephony.active = secondCall;
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
      });

      suite('> refusing an incoming call', function() {
        var mockCall;

        setup(function() {
          mockCall = new MockCall('543552', 'incoming');

          telephonyAddCall.call(this, mockCall, {trigger: true});
        });

        test('should hang up the last incoming call', function() {
          var hangUpSpy = this.sinon.spy(mockCall, 'hangUp');
          CallsHandler.end();
          assert.isTrue(hangUpSpy.calledOnce);
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
          MockMozTelephony.active = call;

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

            telephonyAddCall.call(this, connectedCall, {trigger: true});
            MockMozTelephony.active = connectedCall;
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
      });

      suite('when there is an ongoing conference call', function() {
          setup(function() {
            var firstConfCall = new MockCall('432423', 'incoming');
            telephonyAddCall.call(this, firstConfCall, {trigger: true});
            var secondConfCall = new MockCall('432423555', 'incoming');
            telephonyAddCall.call(this, secondConfCall, {trigger: true});

            MockMozTelephony.calls = [];
            MockMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                      secondConfCall];

            MockMozTelephony.active = MockMozTelephony.conferenceGroup;

            var incomingCall = new MockCall('12334', 'incoming');
            telephonyAddCall.call(this, incomingCall, {trigger: true});
          });

          test('should put the group on hold', function() {
            var holdSpy = this.sinon.spy(MockMozTelephony.conferenceGroup,
                                         'hold');
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
            MockMozTelephony.active = call;
            call.secondNumber = '12345';
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
          MockMozTelephony.active = call;

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
            MockMozTelephony.active = connectedCall;
            telephonyAddCall.call(this, incomingCall, {trigger: true});
          });

          test('should hang up the active call', function() {
            var hangUpSpy = this.sinon.spy(MockMozTelephony.active, 'hangUp');
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
            MockMozTelephony.active = mockCall;
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

          MockMozTelephony.calls = [];
          MockMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                    secondConfCall];

          MockMozTelephony.active = MockMozTelephony.conferenceGroup;

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

    suite('> CallsHandler.ignore()', function() {
      var firstCall;
      var waitingCall;

      setup(function() {
        firstCall = new MockCall('543552', 'incoming');
        waitingCall = new MockCall('12334', 'incoming');

        telephonyAddCall.call(this, firstCall, {trigger: true});
        MockMozTelephony.active = firstCall;
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
        MockMozTelephony.active = mockCall;
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
          MockMozTelephony.active = mockCall;
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
            MockMozTelephony.active = null;
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

          MockMozTelephony.calls = [];
          MockMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                    secondConfCall];

          MockMozTelephony.active = MockMozTelephony.conferenceGroup;
          MockMozTelephony.mTriggerCallsChanged();
        });

        test('should _not_ hold the active conference call', function() {
          var holdSpy = this.sinon.spy(MockMozTelephony.conferenceGroup,
                                       'hold');
          CallsHandler.toggleCalls();
          assert.isFalse(holdSpy.called);
        });

        suite('when the conference call is holded', function() {
          setup(function() {
            MockMozTelephony.active = null;
          });

          test('should resume the conference call', function() {
            var resumeSpy = this.sinon.spy(MockMozTelephony.conferenceGroup,
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
          MockMozTelephony.active = extraCall;
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
          MockMozTelephony.active = mockCall;
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

          MockMozTelephony.calls = [];
          MockMozTelephony.conferenceGroup.calls = [firstConfCall,
                                                    secondConfCall];

          var extraCall = new MockCall('12334', 'incoming');
          telephonyAddCall.call(this, extraCall, {trigger: true});

          MockMozTelephony.active = MockMozTelephony.conferenceGroup;
        });

        test('should hold the active conference call', function() {
          var holdSpy = this.sinon.spy(MockMozTelephony.conferenceGroup,
                                       'hold');
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
        MockMozTelephony.active = activeCall;
      });

      test('should get active call', function() {
        var activeHandlerCall = CallsHandler.activecall;
          assert.equal(CallsHandler.activeCall.call, activeCall);
      });
    });

    suite('CallsHandler.mergeActiveCallWith', function() {
      suite('without a conference call ongoing', function() {
        var inactiveCall;
        var activeCall;
        var addSpy;

        setup(function() {
          inactiveCall = new MockCall('543552', 'incoming');
          activeCall = new MockCall('12334', 'connected');
          telephonyAddCall.call(this, activeCall, {trigger: true});
          telephonyAddCall.call(this, inactiveCall, {trigger: true});
          MockMozTelephony.active = activeCall;
          addSpy = this.sinon.spy(MockMozTelephony.conferenceGroup, 'add');
        });

        test('should call telephony.conferenceGroup.add()', function() {
          CallsHandler.mergeActiveCallWith(inactiveCall);
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

          MockMozTelephony.calls = [overflowCall];
          MockMozTelephony.conferenceGroup.calls = [firstCall, extraCall];

          MockMozTelephony.active = MockMozTelephony.conferenceGroup;

          addSpy = this.sinon.spy(MockMozTelephony.conferenceGroup, 'add');
        });

        test('should call telephony.conferenceGroup.add()', function() {
          CallsHandler.mergeActiveCallWith(overflowCall);
          assert.isTrue(addSpy.calledWith(overflowCall));
        });
      });
    });

    suite('> CallsHandler.mergeConferenceGroupWithActiveCall', function() {
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

        MockMozTelephony.calls = [overflowCall];
        MockMozTelephony.conferenceGroup.calls = [firstCall, extraCall];

        MockMozTelephony.active = overflowCall;

        addSpy = this.sinon.spy(MockMozTelephony.conferenceGroup, 'add');
      });

      test('should call telephony.conferenceGroup.add()', function() {
        CallsHandler.mergeConferenceGroupWithActiveCall();
        assert.isTrue(addSpy.calledWith(overflowCall));
      });
    });

    suite('> CallsHandler.switchToSpeaker', function() {
      test('should turn off bluetooth', function() {
        var disconnectScoSpy = this.sinon.spy(
          MockBluetoothHelperInstance, 'disconnectSco');
        CallsHandler.switchToSpeaker();
        assert.isTrue(disconnectScoSpy.calledOnce);
      });

      test('should set speaker to enabled', function() {
        CallsHandler.switchToSpeaker();
        assert.isTrue(MockMozTelephony.speakerEnabled);
      });
    });

    suite('> CallsHandler.switchToDefaultOut', function() {
      test('should turn on bluetooth', function() {
        var connectScoSpy = this.sinon.spy(
          MockBluetoothHelperInstance, 'connectSco');
        CallsHandler.switchToDefaultOut();
        assert.isTrue(connectScoSpy.calledOnce);
      });

      test('should disable the speaker', function() {
        CallsHandler.switchToDefaultOut();
        assert.isFalse(MockMozTelephony.speakerEnabled);
      });
    });

    suite('> CallsHandler.switchToReceiver', function() {
      test('should turn off bluetooth', function() {
        var disconnectScoSpy = this.sinon.spy(
          MockBluetoothHelperInstance, 'disconnectSco');
        CallsHandler.switchToReceiver();
        assert.isTrue(disconnectScoSpy.calledOnce);
      });

      test('should disable the speaker', function() {
        CallsHandler.switchToReceiver();
        assert.isFalse(MockMozTelephony.speakerEnabled);
      });
    });

    suite('> CallsHandler.toggleSpeaker', function() {
      test('should call switchToSpeaker when toggle on', function() {
        MockMozTelephony.speakerEnabled = false;
        this.sinon.stub(CallsHandler, 'switchToSpeaker');
        CallsHandler.toggleSpeaker();
        assert.isTrue(CallsHandler.switchToSpeaker.calledOnce);
      });

      test('should call switchToDefaultOut when toggle off', function() {
        MockMozTelephony.speakerEnabled = true;
        this.sinon.stub(CallsHandler, 'switchToDefaultOut');
        CallsHandler.toggleSpeaker();
        assert.isTrue(CallsHandler.switchToDefaultOut.calledOnce);
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
        assert.isTrue(toDefaultSpy.calledOnce);
      });
    });

    suite('> connecting to bluetooth headset', function() {
      test('should show the bluetooth menu button when connected if a' +
           'bluetooth receiver is available', function() {
        this.sinon.stub(
          MockBluetoothHelperInstance, 'getConnectedDevicesByProfile')
          .yields(['dummyDevice']);
        var setIconStub = this.sinon.stub(MockCallScreen, 'setBTReceiverIcon')
                    .throws('should pass true to setBTReceiverIcon');
        setIconStub.withArgs(true);
        CallsHandler.setup();
        assert.isTrue(setIconStub.calledOnce);
      });

      test('should show the speaker button when connected if no bluetooth' +
           'receiver is available', function() {
        this.sinon.stub(
          MockBluetoothHelperInstance, 'getConnectedDevicesByProfile')
          .yields([]);
        var setIconStub = this.sinon.stub(MockCallScreen, 'setBTReceiverIcon')
                    .throws('should pass false to setBTReceiverIcon');
        setIconStub.withArgs(false);
        CallsHandler.setup();
        assert.isTrue(setIconStub.calledOnce);
      });

      test('should switch sound to BT receiver when connected', function() {
        CallsHandler.setup();
        var BTSpy = this.sinon.spy(MockCallScreen, 'switchToDefaultOut');
        MockBluetoothHelperInstance.onscostatuschanged({status: true});
        assert.isTrue(BTSpy.calledOnce);
      });
    });

    suite('> bluetooth commands', function() {
      var call1 = {number: 111111};
      var call2 = {number: 222222};
      var call3 = {number: 333333};

      suite('> CHLD=3 conference call', function() {
        test('should log a warning without enough connected calls',
        function(done) {
          MockMozTelephony.calls = [call1];

          window.postMessage({type: 'BT', command: 'CHLD=3'}, '*');

          var addSpy = this.sinon.spy(MockMozTelephony.conferenceGroup, 'add');
          var consoleWarnStub = this.sinon.stub(console, 'warn', function() {
            assert.isTrue(
              consoleWarnStub.calledWith('Cannot join conference call.'));
            assert.isFalse(addSpy.calledOnce);
            done();
          });
        });

        test('should merge into group call if there are two individual calls',
        function(done) {
          MockMozTelephony.calls = [call1, call2];
          window.postMessage({type: 'BT', command: 'CHLD=3'}, '*');

          var addStub = this.sinon.stub(MockMozTelephony.conferenceGroup, 'add',
          function() {
            assert.isTrue(addStub.calledWith(call1, call2));
            done();
          });
        });

        test('should merge individual call into group if group call exists',
        function(done) {
          MockMozTelephony.calls = [call1];
          MockMozTelephony.conferenceGroup.calls = [call2, call3];
          MockMozTelephony.conferenceGroup.state = 'connected';

          window.postMessage({type: 'BT', command: 'CHLD=3'}, '*');

          var addStub = this.sinon.stub(MockMozTelephony.conferenceGroup, 'add',
          function() {
            assert.isTrue(addStub.calledWith(call1));
            done();
          });
        });
      });
    });
  });

  suite('> inter app communication', function() {
    var connectStub;
    var thenStub;
    var portStub;

    setup(function() {
      portStub = this.sinon.stub();

      thenStub = this.sinon.stub();

      connectStub = this.sinon.stub();
      connectStub.returns({then: thenStub });

      var result = { connect: connectStub };

      // Pretend vibration is enabled
      MockSettingsListener.mCallbacks['vibration.enabled'](true);

      CallsHandler.setup();
      MockNavigatormozApps.mTriggerLastRequestSuccess(result);
    });

    test('should listen to "dialercomms" channel', function() {
      assert.isTrue(connectStub.calledWith('dialercomms'));
    });

    test('should listen to messages on the "dialercomms" channel', function() {
      thenStub.yield([portStub]);
      assert.isFunction(portStub.onmessage);
    });

    suite('> when receiving messages', function() {
      var pauseSpy;
      var vibrateSpy;

      var mockCall;
      var mockHC;

      setup(function() {
        pauseSpy = this.sinon.spy(MockAudio.prototype, 'pause');
        thenStub.yield([portStub]);

        vibrateSpy = this.sinon.spy(navigator, 'vibrate');

        portStub.onmessage({data: 'stop_ringtone'});

        mockCall = new MockCall('12334', 'incoming');
        mockHC = telephonyAddCall.call(this, mockCall);
      });

      test('should stop ringtone', function() {
        assert.isTrue(pauseSpy.called);
      });

      test('should stop vibration', function() {
        MockMozTelephony.mTriggerCallsChanged();
        this.sinon.clock.tick(1000);
        assert.isFalse(vibrateSpy.called);
      });
    });
  });
});
