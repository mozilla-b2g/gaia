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

  suiteSetup(function(done) {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockMozTelephony;

    fakeDOM = document.createElement('div');
    fakeDOM.innerHTML = '<section id="group-call" hidden>' +
                            '<div class="numberWrapper">' +
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
                          '</section>' +
                          '<article id="group-call-details">' +
                          '</article>';
    document.body.appendChild(fakeDOM);
    fakeGroupLine = document.getElementById('group-call');
    fakeGroupLabel = document.getElementById('group-call-label');
    fakeGroupDetails = document.getElementById('group-call-details');

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

      test('should display the group line', function() {
        assert.isTrue(fakeGroupLine.hidden);
        flush();
        assert.isFalse(fakeGroupLine.hidden);
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
        });
      });

      suite('when there are no more calls in the conference', function() {
        setup(function() {
          flush();

          MockMozTelephony.calls = [firstCall, secondCall];
          MockMozTelephony.conferenceGroup.calls = [];
        });

        test('should hide the group line', function() {
          assert.isFalse(fakeGroupLine.hidden);
          flush();
          assert.isTrue(fakeGroupLine.hidden);
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
  });
});
