'use strict';

requireApp('communications/dialer/test/unit/mock_moztelephony.js');
requireApp('communications/dialer/test/unit/mock_call.js');
requireApp('communications/dialer/test/unit/mock_handled_call.js');
requireApp('communications/dialer/test/unit/mock_call_screen.js');
requireApp('communications/dialer/test/unit/mock_handled_call.js');
requireApp('communications/dialer/test/unit/mock_l10n.js');
requireApp('communications/dialer/test/unit/mock_contacts.js');
requireApp('communications/dialer/test/unit/mock_tone_player.js');
requireApp('communications/dialer/test/unit/mock_swiper.js');
requireApp('communications/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('sms/shared/test/unit/mocks/mock_settings_url.js');

// The CallsHandler binds stuff when evaluated so we load it
// after the mocks and we don't want it to show up as a leak.
if (!this.CallsHandler) {
  this.CallsHandler = null;
}

var mocksHelperForTelephonyHelper = new MocksHelper([
  'HandledCall',
  'SettingsListener',
  'CallScreen',
  'LazyL10n',
  'Contacts',
  'TonePlayer',
  'SettingsURL',
  'Swiper'
]).init();

suite('calls handler', function() {
  var realMozTelephony;

  mocksHelperForTelephonyHelper.attachTestHelpers();

  suiteSetup(function(done) {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockMozTelephony;

    requireApp('communications/dialer/js/calls_handler.js', done);
  });

  suiteTeardown(function() {
    navigator.moztelephony = realMozTelephony;
  });

  teardown(function() {
    MockMozTelephony.mTeardown();
  });

  // Should be called in the context of a suite
  function telephonyAddCall(mockCall, opt) {
    MockMozTelephony.calls.push(mockCall);

    var handledCall = new MockHandledCall(mockCall);

    // not already stubed
    if (!('restore' in HandledCall)) {
      this.sinon.stub(window, 'HandledCall');
    }
    HandledCall.withArgs(mockCall).returns(handledCall);

    if (opt && opt.trigger) {
      MockMozTelephony.mTriggerCallsChanged();
    }

    return handledCall;
  };

  suite('telephony.oncallschanged handling', function() {
    suite('receiving a first incoming call', function() {
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

      test('should update the CallScreen\'s calls count', function() {
        MockMozTelephony.mTriggerCallsChanged();
        assert.equal(MockCallScreen.mCallsCount, 1);
      });

      test('should unmute', function() {
        var unmuteSpy = this.sinon.spy(MockCallScreen, 'unmute');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(unmuteSpy.calledOnce);
      });

      test('should turn speaker off', function() {
        var speakerSpy = this.sinon.spy(MockCallScreen, 'turnSpeakerOff');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(speakerSpy.calledOnce);
      });
    });

    suite('receiving an extra incoming call', function() {
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

      test('should update the CallScreen\'s calls count', function() {
        MockMozTelephony.mTriggerCallsChanged();
        assert.equal(MockCallScreen.mCallsCount, 2);
      });
    });

    suite('receiving a third call', function() {
      var overflowCall;
      var overflowHC;
      var hangupSpy;

      setup(function() {
        var firstCall = new MockCall('543552', 'incoming');
        var extraCall = new MockCall('12334', 'incoming');
        overflowCall = new MockCall('424242', 'incoming');

        telephonyAddCall.call(this, firstCall, {trigger: true});
        telephonyAddCall.call(this, extraCall, {trigger: true});

        overflowHC = telephonyAddCall.call(this, overflowCall);
        hangupSpy = this.sinon.spy(overflowCall, 'hangUp');
      });

      test('should hangup the call directly', function() {
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
    });

    suite('extra call ending', function() {
      var hideSpy;

      setup(function() {
        var firstCall = new MockCall('543552', 'incoming');
        var extraCall = new MockCall('12334', 'incoming');

        telephonyAddCall.call(this, firstCall, {trigger: true});

        var extraHC = telephonyAddCall.call(this, extraCall, {trigger: true});
        hideSpy = this.sinon.spy(extraHC, 'hide');

        MockMozTelephony.calls = [firstCall];
      });

      test('should hide the call', function() {
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(hideSpy.calledOnce);
      });

      test('should hide the call waiting UI', function() {
        var hideSpy = this.sinon.spy(MockCallScreen, 'hideIncoming');
        MockMozTelephony.mTriggerCallsChanged();
        assert.isTrue(hideSpy.calledOnce);
      });

      test('should update the CallScreen\'s calls count', function() {
        MockMozTelephony.mTriggerCallsChanged();
        assert.equal(MockCallScreen.mCallsCount, 1);
      });
    });
  });

  suite('Public methods', function() {
    suite('CallsHandler.answer()', function() {
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

    suite('CallsHandler.end()', function() {
      suite('ending a simple call', function() {
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

      suite('ending one of two calls', function() {
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

      suite('refusing an incoming call', function() {
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

    suite('CallsHandler.holdAndAnswer()', function() {
      suite('handledCalls.length < 2', function() {
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

      suite('the first call is connected and the second call is incoming',
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

      suite('the first call is held and the second call is incoming',
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
      });
    });

    suite('CallsHandler.endAndAnswer()', function() {
      suite('handledCalls.length < 2', function() {
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

      suite('the first call is connected and the second call is incoming',
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
            CallsHandler.holdAndAnswer();
            assert.isTrue(hideSpy.calledOnce);
          });
      });

      suite('the first call is held and the second call is incoming',
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
            CallsHandler.holdAndAnswer();
            assert.isTrue(hideSpy.calledOnce);
          });
      });
    });

    suite('CallsHandler.ignore()', function() {
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

    suite('CallsHandler.toggleCalls()', function() {
      suite('toggling a simple call', function() {
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

        suite('when the call is holded', function() {
          setup(function() {
            MockMozTelephony.active = null;
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

      suite('toggling between 2 calls', function() {
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
    });
  });
});
