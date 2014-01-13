'use strict';

requireApp('communications/dialer/test/unit/mock_moztelephony.js');
requireApp('communications/dialer/test/unit/mock_call.js');
requireApp('communications/dialer/test/unit/mock_handled_call.js');
requireApp('communications/dialer/test/unit/mock_call_screen.js');
requireApp('communications/dialer/test/unit/mock_calls_handler.js');
requireApp('communications/dialer/test/unit/mock_l10n.js');

// The ConferenceGroupHandler binds stuff when evaluated so we load it
// after the mocks and we don't want it to show up as a leak.
if (!this.ConferenceGroupHandler) {
  this.ConferenceGroupHandler = null;
}

var mocksHelperForConferenceGroupHandler = new MocksHelper([
  'HandledCall',
  'CallsHandler',
  'LazyL10n',
  'CallScreen'
]).init();

suite('conference group handler', function() {
  var realMozTelephony;

  mocksHelperForConferenceGroupHandler.attachTestHelpers();

  var fakeDOM;
  var fakeGroupLine;
  var fakeGroupLabel;
  var fakeGroupDetails;
  var fakeMergeButton;
  var fakeDurationChildNode;

  suiteSetup(function(done) {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockMozTelephony;

    fakeDOM = document.createElement('div');
    fakeDOM.innerHTML = '<section id="group-call" hidden>' +
                            '<div class="numberWrapper">' +
                              '<div id="group-show"></div>' +
                              '<div id="group-call-label"' +
                                'class="number font-light"></div>' +
                            '</div>' +
                            '<div class="fake-number font-light"></div>' +
                            '<div id="group-call-summary"' +
                              'class="additionalContactInfo"></div>' +
                            '<div class="duration">' +
                              '<span class="font-light"></span>' +
                              '<div class="direction">' +
                                '<div></div>' +
                              '</div>' +
                            '</div>' +
                            '<button class="merge-button"></button>' +
                          '</section>' +
                          '<form id="group-call-details">' +
                            '<header></header>' +
                          '</form>';
    document.body.appendChild(fakeDOM);
    fakeGroupLine = document.getElementById('group-call');
    fakeGroupLabel = document.getElementById('group-call-label');
    fakeGroupDetails = document.getElementById('group-call-details');
    fakeMergeButton = document.querySelector('.merge-button');
    fakeDurationChildNode =
        document.querySelector('#group-call > .duration > span');

    requireApp('communications/dialer/js/conference_group_handler.js', done);
  });

  suiteTeardown(function() {
    fakeDOM.parentNode.removeChild(fakeDOM);
    navigator.moztelephony = realMozTelephony;
  });

  teardown(function() {
    MockMozTelephony.mTeardown();
  });

  suite('telephony.conferenceGroup.oncallschanged handling', function() {
    var firstCall, firstHC;
    var secondCall, secondHC;
    var thirdCall, thirdHC;

    function flush() {
      MockMozTelephony.mTriggerGroupCallsChanged();
      MockMozTelephony.mTriggerCallsChanged();
    }

    setup(function() {
      firstCall = new MockCall('543552', 'incoming');
      firstHC = telephonyAddCall.call(this, firstCall, {trigger: true});

      secondCall = new MockCall('54212152', 'incoming');
      secondHC = telephonyAddCall.call(this, secondCall, {trigger: true});
    });

    suite('when the conference call is created', function() {
      setup(function() {
        MockMozTelephony.calls = [];
        MockMozTelephony.conferenceGroup.calls = [firstCall, secondCall];
      });

      test('should update the group label', function() {
        flush();
        assert.equal(fakeGroupLabel.textContent, 'group-call');
        assert.deepEqual(MockLazyL10n.keys['group-call'], {n: 2});
      });

      suite('when a new called is merged in the conference', function() {
        setup(function() {
          flush();

          thirdCall = new MockCall('54329890', 'incoming');
          thirdHC = telephonyAddCall.call(this, thirdCall, {trigger: true});

          MockMozTelephony.calls = [];
          MockMozTelephony.conferenceGroup.calls = [firstCall, secondCall,
                                                    thirdCall];
        });

        test('should update the group label', function() {
          flush();
          assert.equal(fakeGroupLabel.textContent, 'group-call');
          assert.deepEqual(MockLazyL10n.keys['group-call'], {n: 3});
        });

        test('should update single line status', function() {
          MockCallScreen.mUpdateSingleLineCalled = false;
          flush();
          assert.isTrue(MockCallScreen.mUpdateSingleLineCalled);
        });

        suite('when a call is unmerged from the conference', function() {
          setup(function() {
            flush();

            MockMozTelephony.calls = [thirdCall];
            MockMozTelephony.conferenceGroup.calls = [firstCall, secondCall];
          });

          test('should update the group label', function() {
            flush();
            assert.equal(fakeGroupLabel.textContent, 'group-call');
            assert.deepEqual(MockLazyL10n.keys['group-call'], {n: 2});
          });
        });

        suite('when a call is disconnected from the conference', function() {
          setup(function() {
            flush();

            MockMozTelephony.calls = [];
            MockMozTelephony.conferenceGroup.calls = [firstCall, secondCall];
          });

          test('should update the group label', function() {
            flush();
            assert.equal(fakeGroupLabel.textContent, 'group-call');
            assert.deepEqual(MockLazyL10n.keys['group-call'], {n: 2});
          });

          test('should call CallsHandler.checkCalls if two more phones remains',
          function() {
            var checkCallsSpy = this.sinon.spy(MockCallsHandler, 'checkCalls');
            flush();
            assert.isTrue(checkCallsSpy.calledOnce);
          });
        });
      });

      suite('when there are no more calls in the conference', function() {
        setup(function() {
          flush();

          MockMozTelephony.calls = [firstCall, secondCall];
          MockMozTelephony.conferenceGroup.calls = [];
        });

        test('should hide the overlay of group details', function() {
          MockCallScreen.showGroupDetails();
          assert.isTrue(MockCallScreen.mGroupDetailsShown);
          flush();
          assert.isFalse(MockCallScreen.mGroupDetailsShown);
        });
      });
    });
  });

  suite('telephony.conferenceGroup.onstatechange handling', function() {
    var firstCall, firstHC;
    var secondCall, secondHC;

    setup(function() {
      firstCall = new MockCall('543552', 'incoming');
      firstHC = telephonyAddCall.call(this, firstCall, {trigger: true});

      secondCall = new MockCall('54212152', 'incoming');
      secondHC = telephonyAddCall.call(this, secondCall, {trigger: true});

      MockMozTelephony.calls = [];
      MockMozTelephony.conferenceGroup.calls = [firstCall, secondCall];

      MockMozTelephony.mTriggerGroupCallsChanged();
      MockMozTelephony.mTriggerCallsChanged();
    });

    test('should start timer when connected', function() {
      assert.isFalse(MockCallScreen.mCalledCreateTicker);

      MockMozTelephony.conferenceGroup.state = 'connected';
      MockMozTelephony.mTriggerGroupStateChange();

      assert.isTrue(MockCallScreen.mCalledCreateTicker);
    });

    test('should display the group line when connected to a group', function() {
      fakeGroupLine.classList.add('held');
      fakeGroupLine.classList.add('ended');

      MockMozTelephony.conferenceGroup.state = 'connected';
      MockMozTelephony.mTriggerGroupStateChange();

      assert.isFalse(fakeGroupLine.classList.contains('held'));
      assert.isFalse(fakeGroupLine.classList.contains('ended'));
      assert.isFalse(fakeGroupLine.hidden);
    });

    test('should set photo to default when connected', function() {
      MockMozTelephony.conferenceGroup.state = 'connected';
      MockMozTelephony.mTriggerGroupStateChange();

      assert.isNull(MockCallScreen.mSetCallerContactImageArg);
      assert.isTrue(MockCallScreen.mSetCallerContactImageCalled);
    });

    test('should set photo to default when resuming', function() {
      MockMozTelephony.conferenceGroup.state = 'resuming';
      MockMozTelephony.mTriggerGroupStateChange();

      assert.isNull(MockCallScreen.mSetCallerContactImageArg);
      assert.isTrue(MockCallScreen.mSetCallerContactImageCalled);
    });

    test('should stop timer when groupcall ends', function() {
      assert.isFalse(MockCallScreen.mCalledStopTicker);

      MockMozTelephony.conferenceGroup.state = '';
      MockMozTelephony.mTriggerGroupStateChange();

      assert.isTrue(MockCallScreen.mCalledStopTicker);
    });

    test('should add the held class once held', function() {
      assert.isFalse(fakeGroupLine.classList.contains('held'));

      MockMozTelephony.conferenceGroup.state = 'held';
      MockMozTelephony.mTriggerGroupStateChange();

      assert.isTrue(fakeGroupLine.classList.contains('held'));
    });

    test('should remove the held class while resuming', function() {
      MockMozTelephony.conferenceGroup.state = 'held';
      MockMozTelephony.mTriggerGroupStateChange();

      assert.isTrue(fakeGroupLine.classList.contains('held'));

      MockMozTelephony.conferenceGroup.state = 'resuming';
      MockMozTelephony.mTriggerGroupStateChange();

      assert.isFalse(fakeGroupLine.classList.contains('held'));
    });

    test('should call CallsHandler.checkCalls when exiting conference call',
    function() {
      var checkCallsSpy = this.sinon.spy(MockCallsHandler, 'checkCalls');
      MockMozTelephony.conferenceGroup.state = '';
      MockMozTelephony.mTriggerGroupStateChange();

      assert.isTrue(checkCallsSpy.calledOnce);
    });

    test('should show call ended when exiting conference call', function() {
      MockMozTelephony.conferenceGroup.state = '';
      MockMozTelephony.mTriggerGroupStateChange();
      assert.equal(fakeDurationChildNode.textContent, 'callEnded');
    });

    test('should hide the group line after leaving conference call',
    function() {
      fakeGroupLine.hidden = false;
      this.sinon.useFakeTimers();

      MockMozTelephony.conferenceGroup.state = '';
      MockMozTelephony.mTriggerGroupStateChange();

      assert.isFalse(fakeGroupLine.hidden);
      assert.isTrue(fakeGroupLine.classList.contains('ended'));

      this.sinon.clock.tick(2000);
      assert.isTrue(fakeGroupLine.hidden);
    });
  });

  suite('telephony.conferenceGroup.onerror handling', function() {
    test('error when merging calls', function() {
      var showStatusSpy = this.sinon.spy(CallScreen, 'showStatusMessage');
      MockMozTelephony.conferenceGroup.onerror({name: 'addError'});
      assert.isTrue(showStatusSpy.calledWith('conferenceAddError'));
    });

    test('error when unmerging calls', function() {
      var showStatusSpy = this.sinon.spy(CallScreen, 'showStatusMessage');
      MockMozTelephony.conferenceGroup.onerror({name: 'removeError'});
      assert.isTrue(showStatusSpy.calledWith('conferenceRemoveError'));
    });
  });

  suite('mergeButton', function() {
    test('should call CallsHandler.mergeConferenceGroupWithActiveCall()',
      function() {
      var mergeSpy = this.sinon.spy(MockCallsHandler,
                                    'mergeConferenceGroupWithActiveCall');
      fakeMergeButton.onclick();
      assert.isTrue(mergeSpy.called);
    });
  });
});
