/* globals ConferenceGroupHandler, FontSizeManager, l10nAssert, MockCall,
           MockCallScreen, MockCallsHandler, MockConferenceGroupUI, MockL10n,
           MockMutationObserver, MockNavigatorMozTelephony, MocksHelper,
           telephonyAddCall */

'use strict';

require('/shared/test/unit/l10n_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_mutation_observer.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/dialer/mock_call.js');
require('/shared/test/unit/mocks/dialer/mock_handled_call.js');
require('/shared/test/unit/mocks/dialer/mock_calls_handler.js');
require('/test/unit/mock_call_screen.js');
require('/test/unit/mock_conference_group_ui.js');
require('/shared/test/unit/mocks/dialer/mock_font_size_manager.js');

// The ConferenceGroupHandler binds stuff when evaluated so we load it
// after the mocks and we don't want it to show up as a leak.
var mocksHelperForConferenceGroupHandler = new MocksHelper([
  'HandledCall',
  'CallsHandler',
  'CallScreen',
  'ConferenceGroupUI',
  'FontSizeManager',
  'MutationObserver'
]).init();

suite('conference group handler', function() {
  var realMozTelephony;
  var realMozL10n;

  mocksHelperForConferenceGroupHandler.attachTestHelpers();

  var fakeDOM;
  var fakeGroupLine;
  var fakeGroupLabel;
  var fakeGroupDetails;
  var fakeDurationChildNode;
  var fakeTotalDurationChildNode;
  var fakeMutationObserver;

  suiteSetup(function(done) {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    fakeDOM = document.createElement('div');
    fakeDOM.innerHTML = `<section id="group-call" hidden>
                             <div class="numberWrapper">
                             <div id="group-show"></div>
                             <div id="group-call-label"   +
                               class="number font-light"></div>
                           </div>
                           <div id="group-call-summary"   +
                             class="additionalContactInfo font-light"></div>
                           <div class="duration">
                             <span class="font-light"></span>
                             <div class="total-duration"></div>
                             <div class="direction"></div>
                           </div>
                         </section>
                         <form id="group-call-details" role="dialog"   +
                           data-type="action" class="overlay">
                           <header></header>
                           <menu>
                             <ul id="group-call-details-list">
                             </ul>
                             <button id="group-hide" data-l10n-id="close">
                               Close
                             </button>
                           </menu>
                         </form>`;

    document.body.appendChild(fakeDOM);
    fakeGroupLine = document.getElementById('group-call');
    fakeGroupLabel = document.getElementById('group-call-label');
    fakeGroupDetails = document.getElementById('group-call-details');
    fakeDurationChildNode =
        document.querySelector('#group-call > .duration > span');
    fakeTotalDurationChildNode =
        document.querySelector('#group-call > .duration > .total-duration');

    require('/js/conference_group_handler.js', function() {
      fakeMutationObserver = MockMutationObserver.mLastObserver;
      done();
    });
  });

  suiteTeardown(function() {
    fakeDOM.parentNode.removeChild(fakeDOM);
    navigator.moztelephony = realMozTelephony;
    navigator.mozL10n = realMozL10n;
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

      test('should update the conference group details header', function() {
        this.sinon.spy(MockConferenceGroupUI, 'setGroupDetailsHeader');
        flush();
        sinon.assert.calledWith(
          MockConferenceGroupUI.setGroupDetailsHeader,
          {
            id: 'conferenceCall',
            args: { n: 2 }
          }
        );
      });

      test('should update the group label', function() {
        flush();
        // Check the bdi node rather than the element itself
        l10nAssert(
          fakeGroupLabel.firstChild, {
            id: 'conferenceCall',
            args: { n: 2 }
          }
        );
      });

      test('should update call screen in CDMA network', function() {
        MockCallsHandler.mIsFirstCallOnCdmaNetwork = true;
        this.sinon.spy(MockCallScreen, 'cdmaConferenceCall');

        flush();
        sinon.assert.calledOnce(MockCallScreen.cdmaConferenceCall);
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
          // Check the bdi node rather than the element itself
          l10nAssert(
            fakeGroupLabel.firstChild, {
              id: 'conferenceCall',
              args: { n: 3 }
            }
          );
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
            // Check the bdi node rather than the element itself
            l10nAssert(
              fakeGroupLabel.firstChild, {
                id: 'conferenceCall',
                args: { n: 2 }
              }
            );
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
            // Check the bdi node rather than the element itself
            l10nAssert(
              fakeGroupLabel.firstChild, {
                id: 'conferenceCall',
                args: { n: 2 }
              }
            );
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
          this.sinon.spy(MockConferenceGroupUI, 'hideGroupDetails');
          this.sinon.useFakeTimers();
          flush();
          this.sinon.clock.tick();
          sinon.assert.calledOnce(MockConferenceGroupUI.hideGroupDetails);
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

    test('should remove the held class when connected', function() {
      MockNavigatorMozTelephony.conferenceGroup.state = 'held';
      MockNavigatorMozTelephony.mTriggerGroupStateChange();

      assert.isTrue(fakeGroupLine.classList.contains('held'));

      MockNavigatorMozTelephony.conferenceGroup.state = 'connected';
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
      l10nAssert(fakeDurationChildNode, 'callEnded');
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

  suite('Resizing the call ended string', function() {
    suiteSetup(function() {
      fakeDurationChildNode.removeAttribute('data-l10n-id');
    });

    setup(function() {
      this.sinon.spy(fakeMutationObserver, 'disconnect');
      this.sinon.spy(fakeMutationObserver, 'observe');
      this.sinon.spy(FontSizeManager, 'adaptToSpace');
    });

    teardown(function() {
      fakeDurationChildNode.removeAttribute('data-l10n-id');
      fakeDurationChildNode.textContent = '';
    });

    test('Does not resize the string if no l10n attribute is present',
    function() {
      fakeDurationChildNode.textContent = 'Call ended';
      fakeMutationObserver.mTriggerCallback();
      sinon.assert.notCalled(fakeMutationObserver.disconnect);
      sinon.assert.notCalled(fakeMutationObserver.observe);
      sinon.assert.notCalled(FontSizeManager.adaptToSpace);
    });

    test('Disconnects and reconnects the observer before adjusting the string',
    function() {
      MockCallScreen.mScenario = FontSizeManager.SINGLE_CALL;
      fakeDurationChildNode.setAttribute('data-l10n-id', 'callEnded');
      fakeMutationObserver.mTriggerCallback();
      assert.isTrue(
        fakeMutationObserver.disconnect.calledBefore(
          FontSizeManager.adaptToSpace
        )
      );
      assert.isTrue(
        fakeMutationObserver.observe.calledAfter(
          FontSizeManager.adaptToSpace
        )
      );
      sinon.assert.calledWith(
        FontSizeManager.adaptToSpace, FontSizeManager.SINGLE_CALL,
        fakeGroupLabel, false, 'end');
    });
  });

  suite('public API', function() {
    test('currentDuration', function() {
      fakeDurationChildNode.textContent = '12:34';
      assert.equal(ConferenceGroupHandler.currentDuration, '12:34');
    });

    test('addToGroupDetails()', function() {
      this.sinon.spy(MockConferenceGroupUI ,'addCall');
      ConferenceGroupHandler.addToGroupDetails(fakeGroupLine);
      sinon.assert.calledWith(MockConferenceGroupUI.addCall, fakeGroupLine);
    });

    test('isGroupDetailsShown()', function() {
      this.sinon.spy(MockConferenceGroupUI ,'isGroupDetailsShown');
      ConferenceGroupHandler.isGroupDetailsShown();
      sinon.assert.calledOnce(MockConferenceGroupUI.isGroupDetailsShown);
    });

    test('removeFromGroupDetails()', function() {
      this.sinon.spy(MockConferenceGroupUI ,'removeCall');
      ConferenceGroupHandler.removeFromGroupDetails(fakeGroupLine);
      sinon.assert.calledWith(MockConferenceGroupUI.removeCall, fakeGroupLine);
    });

    test('signalConferenceEnded()', function() {
      this.sinon.spy(MockConferenceGroupUI ,'markCallsAsEnded');
      ConferenceGroupHandler.signalConferenceEnded();
      sinon.assert.calledOnce(MockConferenceGroupUI.markCallsAsEnded);
    });
  });
});
