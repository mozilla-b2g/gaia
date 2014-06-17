/* globals CallScreen, MockCall, MockCallScreen, MockCallsHandler, MockLazyL10n,
           MockNavigatorMozTelephony, MocksHelper, telephonyAddCall */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/dialer/mock_call.js');
require('/shared/test/unit/mocks/dialer/mock_handled_call.js');
require('/shared/test/unit/mocks/dialer/mock_calls_handler.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');
require('/test/unit/mock_call_screen.js');

// The ConferenceGroupHandler binds stuff when evaluated so we load it
// after the mocks and we don't want it to show up as a leak.
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
  var fakeTotalDurationChildNode;

  suiteSetup(function(done) {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    fakeDOM = document.createElement('div');
    fakeDOM.innerHTML = '<section id="group-call" hidden>' +
                            '<div class="numberWrapper">' +
                            '<div id="group-show"></div>' +
                            '<div id="group-call-label" ' +
                              'class="number font-light"></div>' +
                          '</div>' +
                          '<div class="fake-number font-light"></div>' +
                          '<div id="group-call-summary" ' +
                            'class="additionalContactInfo font-light"></div>' +
                          '<div class="duration">' +
                            '<span class="font-light"></span>' +
                            '<div class="total-duration"></div>' +
                            '<div class="direction"></div>' +
                          '</div>' +
                          '<button class="merge-button" data-l10n-id="merge">' +
                            'Merge</button>' +
                        '</section>' +
                        '<form id="group-call-details" role="dialog" ' +
                          'data-type="action" class="overlay">' +
                          '<header></header>' +
                          '<menu>' +
                            '<ul id="group-call-details-list">' +
                            '</ul>' +
                            '<button id="group-hide" data-l10n-id="close">' +
                              'Close' +
                            '</button>' +
                          '</menu>' +
                        '</form>';

    document.body.appendChild(fakeDOM);
    fakeGroupLine = document.getElementById('group-call');
    fakeGroupLabel = document.getElementById('group-call-label');
    fakeGroupDetails = document.getElementById('group-call-details');
    fakeMergeButton = document.querySelector('.merge-button');
    fakeDurationChildNode =
        document.querySelector('#group-call > .duration > span');
    fakeTotalDurationChildNode =
        document.querySelector('#group-call > .duration > .total-duration');

    require('/js/conference_group_handler.js', done);
  });

  suiteTeardown(function() {
    fakeDOM.parentNode.removeChild(fakeDOM);
    navigator.moztelephony = realMozTelephony;
  });

  teardown(function() {
    MockNavigatorMozTelephony.mTeardown();
  });

  suite('telephony.conferenceGroup.oncallschanged handling', function() {
    var firstCall, firstHC;
    var secondCall, secondHC;
    var thirdCall, thirdHC;

    function flush() {
      MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
      MockNavigatorMozTelephony.mTriggerCallsChanged();
    }

    setup(function() {
      firstCall = new MockCall('543552', 'incoming');
      firstHC = telephonyAddCall.call(this, firstCall, {trigger: true});

      secondCall = new MockCall('54212152', 'incoming');
      secondHC = telephonyAddCall.call(this, secondCall, {trigger: true});
    });

    suite('when the conference call is created', function() {
      setup(function() {
        MockNavigatorMozTelephony.calls = [];
        MockNavigatorMozTelephony.conferenceGroup.calls =
          [firstCall, secondCall];
      });

      test('should update the group label', function() {
        flush();
        assert.equal(fakeGroupLabel.textContent, 'conferenceCall');
        assert.deepEqual(MockLazyL10n.keys.conferenceCall, {n: 2});
      });

      suite('when a new called is merged in the conference', function() {
        setup(function() {
          flush();

          thirdCall = new MockCall('54329890', 'incoming');
          thirdHC = telephonyAddCall.call(this, thirdCall, {trigger: true});

          MockNavigatorMozTelephony.calls = [];
          MockNavigatorMozTelephony.conferenceGroup.calls =
            [firstCall, secondCall, thirdCall];
        });

        test('should update the group label', function() {
          flush();
          assert.equal(fakeGroupLabel.textContent, 'conferenceCall');
          assert.deepEqual(MockLazyL10n.keys.conferenceCall, {n: 3});
        });

        test('should update single line status', function() {
          MockCallScreen.mUpdateSingleLineCalled = false;
          flush();
          assert.isTrue(MockCallScreen.mUpdateSingleLineCalled);
        });

        suite('when a call is unmerged from the conference', function() {
          setup(function() {
            flush();

            MockNavigatorMozTelephony.calls = [thirdCall];
            MockNavigatorMozTelephony.conferenceGroup.calls =
              [firstCall, secondCall];
          });

          test('should update the group label', function() {
            flush();
            assert.equal(fakeGroupLabel.textContent, 'conferenceCall');
            assert.deepEqual(MockLazyL10n.keys.conferenceCall, {n: 2});
          });
        });

        suite('when a call is disconnected from the conference', function() {
          setup(function() {
            flush();

            MockNavigatorMozTelephony.calls = [];
            MockNavigatorMozTelephony.conferenceGroup.calls =
              [firstCall, secondCall];
          });

          test('should update the group label', function() {
            flush();
            assert.equal(fakeGroupLabel.textContent, 'conferenceCall');
            assert.deepEqual(MockLazyL10n.keys.conferenceCall, {n: 2});
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

          MockNavigatorMozTelephony.calls = [firstCall, secondCall];
          MockNavigatorMozTelephony.conferenceGroup.calls = [];
        });

        test('should hide the overlay of group details', function() {
          MockCallScreen.showGroupDetails();
          assert.isTrue(MockCallScreen.mGroupDetailsShown);
          flush();
          assert.isFalse(MockCallScreen.mGroupDetailsShown);
        });

        test('should update the calls display', function() {
          MockCallScreen.mUpdateSingleLineCalled = false;
          flush();
          assert.isTrue(MockCallScreen.mUpdateSingleLineCalled);
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

      MockNavigatorMozTelephony.calls = [];
      MockNavigatorMozTelephony.conferenceGroup.calls = [firstCall, secondCall];

      MockNavigatorMozTelephony.mTriggerGroupCallsChanged();
      MockNavigatorMozTelephony.mTriggerCallsChanged();
    });

    test('should start timer when connected', function() {
      assert.isFalse(MockCallScreen.mCalledCreateTicker);

      MockNavigatorMozTelephony.conferenceGroup.state = 'connected';
      MockNavigatorMozTelephony.mTriggerGroupStateChange();

      assert.isTrue(MockCallScreen.mCalledCreateTicker);
    });

    test('should display the group line when connected to a group', function() {
      fakeGroupLine.classList.add('held');
      fakeGroupLine.classList.add('ended');

      MockNavigatorMozTelephony.conferenceGroup.state = 'connected';
      MockNavigatorMozTelephony.mTriggerGroupStateChange();

      assert.isFalse(fakeGroupLine.classList.contains('held'));
      assert.isFalse(fakeGroupLine.classList.contains('ended'));
      assert.isFalse(fakeGroupLine.hidden);
    });

    test('should set photo when connected', function() {
      MockNavigatorMozTelephony.conferenceGroup.state = 'connected';
      MockNavigatorMozTelephony.mTriggerGroupStateChange();

      assert.isTrue(MockCallScreen.mSetCallerContactImageCalled);
    });

    test('should set photo when resuming', function() {
      MockNavigatorMozTelephony.conferenceGroup.state = 'resuming';
      MockNavigatorMozTelephony.mTriggerGroupStateChange();

      assert.isTrue(MockCallScreen.mSetCallerContactImageCalled);
    });

    test('should stop timer when groupcall ends', function() {
      assert.isFalse(MockCallScreen.mCalledStopTicker);

      MockNavigatorMozTelephony.conferenceGroup.state = '';
      MockNavigatorMozTelephony.mTriggerGroupStateChange();

      assert.isTrue(MockCallScreen.mCalledStopTicker);
    });

    test('should add the held class once held', function() {
      assert.isFalse(fakeGroupLine.classList.contains('held'));

      MockNavigatorMozTelephony.conferenceGroup.state = 'held';
      MockNavigatorMozTelephony.mTriggerGroupStateChange();

      assert.isTrue(fakeGroupLine.classList.contains('held'));
    });

    test('should remove the held class while resuming', function() {
      MockNavigatorMozTelephony.conferenceGroup.state = 'held';
      MockNavigatorMozTelephony.mTriggerGroupStateChange();

      assert.isTrue(fakeGroupLine.classList.contains('held'));

      MockNavigatorMozTelephony.conferenceGroup.state = 'resuming';
      MockNavigatorMozTelephony.mTriggerGroupStateChange();

      assert.isFalse(fakeGroupLine.classList.contains('held'));
    });

    test('should call CallsHandler.checkCalls when exiting conference call',
    function() {
      var checkCallsSpy = this.sinon.spy(MockCallsHandler, 'checkCalls');
      MockNavigatorMozTelephony.conferenceGroup.state = '';
      MockNavigatorMozTelephony.mTriggerGroupStateChange();

      assert.isTrue(checkCallsSpy.calledOnce);
    });

    test('should show call ended when exiting conference call', function() {
      MockNavigatorMozTelephony.conferenceGroup.state = '';
      MockNavigatorMozTelephony.mTriggerGroupStateChange();
      assert.equal(fakeDurationChildNode.textContent, 'callEnded');
    });

    test('should show call the duration when exiting conference call',
      function() {
      var totalCallDuration = '12:34';
      fakeDurationChildNode.textContent = totalCallDuration;
      MockNavigatorMozTelephony.conferenceGroup.state = '';
      MockNavigatorMozTelephony.mTriggerGroupStateChange();
      assert.deepEqual(fakeTotalDurationChildNode.textContent,
                       totalCallDuration);
    });

    test('should hide the group line after leaving conference call',
    function() {
      fakeGroupLine.hidden = false;
      this.sinon.useFakeTimers();

      MockNavigatorMozTelephony.conferenceGroup.state = '';
      MockNavigatorMozTelephony.mTriggerGroupStateChange();

      assert.isFalse(fakeGroupLine.hidden);
      assert.isTrue(fakeGroupLine.classList.contains('ended'));

      this.sinon.clock.tick(2000);
      assert.isTrue(fakeGroupLine.hidden);
    });
  });

  suite('telephony.conferenceGroup.onerror handling', function() {
    test('error when merging calls', function() {
      var showStatusSpy = this.sinon.spy(CallScreen, 'showStatusMessage');
      MockNavigatorMozTelephony.conferenceGroup.onerror({name: 'addError'});
      assert.isTrue(showStatusSpy.calledWith('conferenceAddError'));
    });

    test('error when unmerging calls', function() {
      var showStatusSpy = this.sinon.spy(CallScreen, 'showStatusMessage');
      MockNavigatorMozTelephony.conferenceGroup.onerror({name: 'removeError'});
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
