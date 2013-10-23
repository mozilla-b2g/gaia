'use strict';

mocha.globals(['resizeTo']);

requireApp('communications/dialer/test/unit/mock_moztelephony.js');
requireApp('sms/shared/test/unit/mocks/mock_navigator_moz_apps.js');

requireApp('communications/dialer/test/unit/mock_calls_handler.js');
requireApp('communications/dialer/test/unit/mock_l10n.js');

// The CallScreen binds stuff when evaluated so we load it
// after the fake dom and we don't want it to show up as a leak.
if (!this.CallScreen) {
  this.CallScreen = null;
}

var mocksHelperForCallScreen = new MocksHelper([
  'CallsHandler',
  'LazyL10n'
]).init();


suite('call screen', function() {
  var realMozTelephony;
  var realMozApps;

  var screen;
  var calls;
  var groupCalls;
  var groupCallsList;
  var callToolbar;
  var muteButton;
  var speakerButton;
  var statusMessage,
      statusMessageText;
  var lockedHeader,
      lockedClock,
      lockedClockNumbers,
      lockedClockMeridiem,
      lockedDate;
  var incomingContainer;

  mocksHelperForCallScreen.attachTestHelpers();

  suiteSetup(function() {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockMozTelephony;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    navigator.mozL10n = MockMozL10n;
  });

  suiteTeardown(function() {
    MockMozTelephony.mSuiteTeardown();
    navigator.mozTelephony = realMozTelephony;
    navigator.mozApps = realMozApps;
  });

  setup(function(done) {
    screen = document.createElement('div');
    screen.id = 'call-screen';
    document.body.appendChild(screen);

    calls = document.createElement('article');
    calls.id = 'calls';
    screen.appendChild(calls);

    groupCalls = document.createElement('form');
    groupCalls.id = 'group-call-details';
    screen.appendChild(groupCalls);

    groupCallsList = document.createElement('ul');
    groupCallsList.id = 'group-call-details-list';
    groupCalls.appendChild(groupCallsList);

    callToolbar = document.createElement('section');
    callToolbar.id = 'co-advanced';
    screen.appendChild(callToolbar);

    muteButton = document.createElement('button');
    muteButton.id = 'mute';
    callToolbar.appendChild(muteButton);

    speakerButton = document.createElement('button');
    speakerButton.id = 'speaker';
    callToolbar.appendChild(speakerButton);

    statusMessage = document.createElement('div');
    statusMessage.id = 'statusMsg';
    statusMessageText = document.createElement('p');
    statusMessage.appendChild(statusMessageText);
    screen.appendChild(statusMessage);

    lockedHeader = document.createElement('div');
    lockedClock = document.createElement('div');
    lockedHeader.appendChild(lockedClock);
    lockedClockNumbers = document.createElement('span');
    lockedClock.appendChild(lockedClockNumbers);
    lockedClockMeridiem = document.createElement('span');
    lockedClock.appendChild(lockedClockMeridiem);
    lockedDate = document.createElement('div');
    lockedHeader.appendChild(lockedDate);
    screen.appendChild(lockedHeader);

    incomingContainer = document.createElement('article');
    incomingContainer.id = 'incoming-container';
    screen.appendChild(incomingContainer);

    // Replace the existing elements
    // Since we can't make the CallScreen look for them again
    if (CallScreen != null) {
      CallScreen.screen = screen;
      CallScreen.calls = calls;
      CallScreen.callToolbar = callToolbar;
      CallScreen.muteButton = muteButton;
      CallScreen.speakerButton = speakerButton;
      CallScreen.groupCalls = groupCalls;
      CallScreen.groupCallsList = groupCallsList;
      CallScreen.lockedClockNumbers = lockedClockNumbers;
      CallScreen.lockedClockMeridiem = lockedClockMeridiem;
      CallScreen.lockedDate = lockedDate;
      CallScreen.incomingContainer = incomingContainer;
    }

    requireApp('communications/dialer/js/call_screen.js', done);
  });

  teardown(function() {
    MockMozTelephony.mTeardown();
    MockNavigatormozApps.mTeardown();
    screen.parentNode.removeChild(screen);
  });

  suite('calls', function() {
    suite('setters', function() {
      test('singleLine should toggle the class', function() {
        assert.isFalse(calls.classList.contains('single-line'));
        assert.isFalse(calls.classList.contains('big-duration'));

        CallScreen.singleLine = true;
        assert.isTrue(calls.classList.contains('single-line'));
        assert.isTrue(calls.classList.contains('big-duration'));

        CallScreen.singleLine = false;
        assert.isFalse(calls.classList.contains('single-line'));
        assert.isFalse(calls.classList.contains('big-duration'));
      });

      test('cdmaCallWaiting should toggle the appropriate classes', function() {
        assert.isFalse(calls.classList.contains('switch'));
        assert.isFalse(callToolbar.classList.contains('no-add-call'));

        CallScreen.cdmaCallWaiting = true;
        assert.isTrue(calls.classList.contains('switch'));
        assert.isTrue(callToolbar.classList.contains('no-add-call'));

        CallScreen.cdmaCallWaiting = false;
        assert.isFalse(calls.classList.contains('switch'));
        assert.isFalse(callToolbar.classList.contains('no-add-call'));
      });

      test('holdAndAnswerOnly should add the hold-and-answer-only class',
        function() {
          assert.isFalse(
            incomingContainer.classList.contains('hold-and-answer-only'));
          CallScreen.holdAndAnswerOnly = true;
          assert.isTrue(
            incomingContainer.classList.contains('hold-and-answer-only'));
        }
      );
    });

    suite('insertCall', function() {
      test('should insert the node in the calls article', function() {
        var fakeNode = document.createElement('section');
        CallScreen.insertCall(fakeNode);
        assert.equal(fakeNode.parentNode, CallScreen.calls);
      });
    });

    suite('moveToGroup', function() {
      test('should insert the node in the group calls article', function() {
        var fakeNode = document.createElement('section');
        CallScreen.moveToGroup(fakeNode);
        assert.equal(fakeNode.parentNode, CallScreen.groupCallsList);
      });
    });
  });

  suite('toggling', function() {
    test('should toggle the displayed classlist', function() {
      var toggleSpy = this.sinon.spy(screen.classList, 'toggle');
      CallScreen.toggle();
      assert.isTrue(toggleSpy.calledWith('displayed'));
    });

    suite('when a callback is given', function() {
      var addEventListenerSpy;
      var removeEventListenerSpy;
      var spyCallback;

      setup(function() {
        addEventListenerSpy = this.sinon.spy(screen, 'addEventListener');
        removeEventListenerSpy = this.sinon.spy(screen, 'removeEventListener');
        spyCallback = this.sinon.spy();
        CallScreen.toggle(spyCallback);
      });

      test('should listen for transitionend', function() {
        assert.isTrue(addEventListenerSpy.calledWith('transitionend'));
      });

      suite('once the transition ended', function() {
        setup(function() {
          addEventListenerSpy.yield();
        });

        test('should remove the event listener', function() {
          assert.isTrue(removeEventListenerSpy.calledWith('transitionend'));
        });

        test('should trigger the callback', function() {
          assert.isTrue(spyCallback.calledOnce);
        });
      });
    });

    suite('when opening in incoming-locked mode', function() {
      var addEventListenerSpy;
      var spyCallback;

      setup(function() {
        CallScreen.screen.dataset.layout = 'incoming-locked';
        addEventListenerSpy = this.sinon.spy(screen, 'addEventListener');
        spyCallback = this.sinon.spy();

        CallScreen.toggle(spyCallback);
      });

      test('should not listen for transitionend', function() {
        assert.isFalse(addEventListenerSpy.called);
      });

      test('should call the callback', function(done) {
        setTimeout(function() {
          assert.isTrue(spyCallback.called);
          done();
        });
      });
    });
  });

  suite('toggleMute', function() {
    test('should change active-state class', function() {
      var classList = CallScreen.muteButton.classList;
      var originalState = classList.contains('active-state');

      CallScreen.toggleMute();
      assert.notEqual(classList.contains('active-state'), originalState);

      CallScreen.toggleMute();
      assert.equal(classList.contains('active-state'), originalState);
    });

    test('should change muted class', function() {
      var classList = CallScreen.calls.classList;
      var originalState = classList.contains('muted');

      CallScreen.toggleMute();
      assert.notEqual(classList.contains('muted'), originalState);

      CallScreen.toggleMute();
      assert.equal(classList.contains('muted'), originalState);
    });

    test('should call CallsHandler.toggleMute', function() {
      var toggleMuteSpy = this.sinon.spy(MockCallsHandler, 'toggleMute');
      CallScreen.toggleMute();
      assert.isTrue(toggleMuteSpy.calledOnce);
    });
  });

  suite('unmute', function() {
    test('should remove active-state', function() {
      var classList = CallScreen.muteButton.classList;

      CallScreen.unmute();
      assert.isFalse(classList.contains('active-state'));
    });

    test('should remove muted', function() {
      var classList = CallScreen.calls.classList;

      CallScreen.unmute();
      assert.isFalse(classList.contains('muted'));
    });

    test('should call CallsHandler.unmute', function() {
      var unmuteSpy = this.sinon.spy(MockCallsHandler, 'unmute');
      CallScreen.unmute();
      assert.isTrue(unmuteSpy.calledOnce);
    });
  });

  suite('toggleSpeaker', function() {
    test('should change active-state', function() {
      var classList = CallScreen.speakerButton.classList;
      var originalState = classList.contains('active-state');

      CallScreen.toggleSpeaker();
      assert.notEqual(classList.contains('active-state'), originalState);

      CallScreen.toggleSpeaker();
      assert.equal(classList.contains('active-state'), originalState);
    });

    test('should call CallsHandler.toggleSpeaker', function() {
      var toggleSpeakerSpy = this.sinon.spy(MockCallsHandler, 'toggleSpeaker');
      CallScreen.toggleSpeaker();
      assert.isTrue(toggleSpeakerSpy.calledOnce);
    });
  });

  suite('turnSpeakerOn', function() {
    test('should add active-state', function() {
      var classList = CallScreen.speakerButton.classList;

      CallScreen.turnSpeakerOn();
      assert.isTrue(classList.contains('active-state'));
    });

    test('should call CallsHandler.turnSpeakerOn', function() {
      var turnSpeakerOnSpy = this.sinon.spy(MockCallsHandler, 'turnSpeakerOn');
      CallScreen.turnSpeakerOn();
      assert.isTrue(turnSpeakerOnSpy.calledOnce);
    });
  });

  suite('turnSpeakerOff', function() {
    test('should add active-state', function() {
      var classList = CallScreen.speakerButton.classList;

      CallScreen.turnSpeakerOff();
      assert.isFalse(classList.contains('active-state'));
    });

    test('should call CallsHandler.turnSpeakerOff', function() {
      var turnSpeakerOffSpy;
      turnSpeakerOffSpy = this.sinon.spy(MockCallsHandler, 'turnSpeakerOff');
      CallScreen.turnSpeakerOff();
      assert.isTrue(turnSpeakerOffSpy.calledOnce);
    });
  });

  suite('syncSpeakerEnabled', function() {
    test('mozTelephony.speakerEnabled = true', function() {
      var classList = CallScreen.speakerButton.classList;
      navigator.mozTelephony.speakerEnabled = true;
      CallScreen.syncSpeakerEnabled();
      assert.isTrue(classList.contains('active-state'));
    });

    test('mozTelephony.speakerEnabled = false', function() {
      var classList = CallScreen.speakerButton.classList;
      navigator.mozTelephony.speakerEnabled = false;
      CallScreen.syncSpeakerEnabled();
      assert.isFalse(classList.contains('active-state'));
    });
  });

  suite('placeNewCall', function() {
    test('launches the dialer app', function() {
      CallScreen.placeNewCall();
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      assert.equal(MockNavigatormozApps.mAppWasLaunchedWithEntryPoint,
                   'dialer');
    });

    test('requests the contacts tab in the dialer app', function() {
      var requestSpy = this.sinon.spy(MockCallsHandler, 'requestContactsTab');
      CallScreen.placeNewCall();
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      assert.isTrue(requestSpy.calledOnce);
    });

    test('resizes the call screen in status bar mode', function() {
      var resizeSpy = this.sinon.spy(window, 'resizeTo');
      CallScreen.placeNewCall();
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      assert.equal(resizeSpy.firstCall.args[1], 40);
    });
  });

  suite('showStatusMessage', function() {
    var statusMessage,
        bannerClass,
        addEventListenerSpy,
        removeEventListenerSpy;

    setup(function() {
      this.sinon.useFakeTimers();
      statusMessage = CallScreen.statusMessage;
      bannerClass = statusMessage.classList;
      addEventListenerSpy = this.sinon.spy(statusMessage, 'addEventListener');
      removeEventListenerSpy =
        this.sinon.spy(statusMessage, 'removeEventListener');

      CallScreen.showStatusMessage('message');
    });

    test('should show the banner', function() {
      assert.include(bannerClass, 'visible');
    });
    test('should show the text', function() {
      assert.equal(statusMessage.querySelector('p').textContent,
                   'message');
    });

    suite('once the transition ends', function() {
      setup(function() {
        addEventListenerSpy.yield();
      });
      test('should remove the listener', function() {
        assert.isTrue(removeEventListenerSpy.calledWith('transitionend'));
      });

      suite('after STATUS_TIME', function() {
        setup(function(done) {
          this.sinon.clock.tick(2000);
          done();
        });
        test('should hide the banner', function() {
          assert.isFalse(bannerClass.contains('visible'));
        });
      });
    });
  });

  suite('Toggling the group details screen', function() {
    test('should show group details', function() {
      CallScreen.showGroupDetails();
      assert.isTrue(groupCalls.classList.contains('display'));
    });

    test('should hide group details', function() {
      CallScreen.hideGroupDetails();
      assert.isFalse(groupCalls.classList.contains('display'));
    });
  });

  suite('showClock in screen locked status', function() {
    var formatArgs = [],
        currentDate,
        fakeNumber = '12:02',
        fakeMeridiem = 'PM',
        fakeDate = 'Monday, September 16';

    setup(function() {
      this.sinon.stub(navigator.mozL10n, 'DateTimeFormat', function() {
        this.localeFormat = function(date, format) {
          formatArgs.push(arguments);
          if (format === 'shortTimeFormat') {
            return fakeNumber + ' ' + fakeMeridiem;
          }
          return fakeDate;
        };
      });
    });

    test('clock and date should display current clock/date info', function() {
      currentDate = new Date();
      CallScreen.showClock(currentDate);
      var numbersStr = CallScreen.lockedClockNumbers.textContent;
      var meridiemStr = CallScreen.lockedClockMeridiem.textContent;
      var dateStr = CallScreen.lockedDate.textContent;
      // The date parameter here should be equal to clock setup date.
      assert.equal(formatArgs.length, 2);
      assert.equal(formatArgs[0][0], currentDate);
      assert.equal(formatArgs[1][0], currentDate);
      assert.equal(numbersStr, fakeNumber);
      assert.equal(meridiemStr, fakeMeridiem);
      assert.equal(dateStr, fakeDate);
    });
  });

});
