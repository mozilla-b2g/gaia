'use strict';

var CallsHandler = (function callsHandler() {
  // Changing this will probably require markup changes
  var CALLS_LIMIT = 2;

  var handledCalls = [];

  var toneInterval = null; // Timer used to play the waiting tone
  var telephony = window.navigator.mozTelephony;
  telephony.oncallschanged = onCallsChanged;

  var displayed = false;
  var closing = false;

  // Setting up the SimplePhoneMatcher
  // XXX: check bug-926169
  // this is used to keep all tests passing while introducing multi-sim APIs
  var conn = window.navigator.mozMobileConnection ||
             window.navigator.mozMobileConnections &&
             window.navigator.mozMobileConnections[0];

  var settings = window.navigator.mozSettings;

  if (conn && conn.voice && conn.voice.network && conn.voice.network.mcc) {
    SimplePhoneMatcher.mcc = conn.voice.network.mcc;
  }

  var btHelper = new BluetoothHelper();

  var screenLock;

  /* === Setup === */
  function setup() {
    if (telephony) {
      // Somehow the muted property appears to true after initialization.
      // Set it to false.
      telephony.muted = false;
    }

    var acm = navigator.mozAudioChannelManager;
    if (acm) {
      acm.addEventListener('headphoneschange', function onheadphoneschange() {
        if (acm.headphones) {
          CallScreen.turnSpeakerOff();
        }
      });
    }

    btHelper.onscostatuschanged = function onscostatuschanged(evt) {
      if (evt.status) {
        CallScreen.turnSpeakerOff();
      }
    };

    navigator.mozSetMessageHandler('headset-button', handleHSCommand);
    navigator.mozSetMessageHandler('bluetooth-dialer-command', handleBTCommand);
  }

  /* === Handled calls === */
  var highPriorityWakeLock = null;
  function onCallsChanged() {
    // Acquire or release the high-priority wake lock, as necessary.  This
    // (mostly) prevents this process from being killed while we're on a call.
    if (!highPriorityWakeLock && telephony.calls.length > 0) {
      highPriorityWakeLock = navigator.requestWakeLock('high-priority');
    }
    if (highPriorityWakeLock && telephony.calls.length == 0) {
      highPriorityWakeLock.unlock();
      highPriorityWakeLock = null;
    }

    // Adding any new calls to handledCalls
    telephony.calls.forEach(function callIterator(call) {
      var alreadyAdded = handledCalls.some(function hcIterator(hc) {
        return (hc.call == call);
      });

      if (!alreadyAdded) {
        addCall(call);
      }
    });

    // Removing any ended calls to handledCalls
    for (var index = (handledCalls.length - 1); index >= 0; index--) {
      var hc = handledCalls[index];

      var stillHere = telephony.calls.some(function hcIterator(call) {
        return (call == hc.call);
      });

      stillHere = stillHere ||
        telephony.conferenceGroup.calls.some(function hcIterator(call) {
        return (call == hc.call);
      });

      if (!stillHere) {
        removeCall(index);
      }
    }

    if (cdmaCallWaiting()) {
      handleCallWaiting(telephony.calls[0]);
    }

    if (handledCalls.length === 0) {
      exitCallScreen(false);
    } else if (!displayed && !closing) {
      toggleScreen();
    }
  }

  function addCall(call) {
    // Once we already have 1 call, we need to care about incoming
    // calls and insert new dialing calls.
    if (handledCalls.length &&
      (call.state != 'incoming') && (call.state != 'dialing')) {
      return;
    }

    // No more room
    if (telephony.calls.length > CALLS_LIMIT) {
      new HandledCall(call);
      call.hangUp();
      return;
    }

    // First incoming or outgoing call, reset mute and speaker.
    if (handledCalls.length == 0) {
      CallScreen.unmute();
      CallScreen.turnSpeakerOff();
    }

    // Find an available node for displaying the call
    var hc = new HandledCall(call);
    handledCalls.push(hc);
    CallScreen.insertCall(hc.node);

    if (call.state === 'incoming') {
      // This is the initial incoming call, need to ring !
      if (handledCalls.length === 1) {
        handleFirstIncoming(call);
      }
    }

    if (handledCalls.length > 1) {
      // New incoming call, signaling the user.
      if (call.state === 'incoming') {
        hc.hide();
        handleCallWaiting(call);

      // User performed another outgoing call. show its status.
      } else {
        hc.show();
      }
    } else {
      if (window.location.hash.startsWith('#locked') &&
          (call.state == 'incoming')) {
        CallScreen.render('incoming-locked');
      } else {
        CallScreen.render(call.state);
      }
    }
  }

  function removeCall(index) {
    var removedCall = handledCalls[index];
    handledCalls.splice(index, 1);

    if (handledCalls.length === 0) {
      exitCallScreen(true);
      return;
    }

    // Only hiding the incoming bar if we have another one to display.
    // Let handledCall catches disconnect event itself.
    CallScreen.hideIncoming();

    var remainingCall = handledCalls[0];
    if (remainingCall.call.state == 'incoming') {
      // The active call ended, showing the incoming call
      remainingCall.show();

      // This is the difference between an endAndAnswer() and
      // the active call being disconnected while a call is waiting
      setTimeout(function nextTick() {
        if (remainingCall.call.state == 'incoming') {
          CallScreen.render('incoming');
        }
      });

      return;
    }

    // The remaining call was held, resume it
    if (remainingCall.call.group) {
      remainingCall.call.group.resume();
    } else {
      remainingCall.call.resume();
    }
  }

  function handleFirstIncoming(call) {
    screenLock = navigator.requestWakeLock('screen');

    call.addEventListener('statechange', function callStateChange() {
      call.removeEventListener('statechange', callStateChange);

      if (screenLock) {
        screenLock.unlock();
        screenLock = null;
      }
    });
  }

  function handleCallWaiting(call) {
    LazyL10n.get(function localized(_) {
      var number = (call.secondNumber ? call.secondNumber : call.number);

      if (!number) {
        CallScreen.incomingNumber.textContent = _('withheld-number');
        return;
      }

      Contacts.findByNumber(number,
                            function lookupContact(contact, matchingTel) {
        if (contact && contact.name) {
          CallScreen.incomingNumber.textContent = contact.name;
          CallScreen.incomingNumberAdditionalInfo.textContent =
            Utils.getPhoneNumberAdditionalInfo(matchingTel);
          return;
        }

        CallScreen.incomingNumber.textContent = number;
        CallScreen.incomingNumberAdditionalInfo.textContent = '';
      });
    });

    if (cdmaCallWaiting()) {
      CallScreen.holdAndAnswerOnly = true;
    }

    CallScreen.showIncoming();
    playWaitingTone(call);
  }

  /* === Call Screen === */
  function toggleScreen() {
    displayed = !displayed;

    CallScreen.toggle(function transitionend() {
      // We did animate the call screen off the viewport
      // now closing the window.
      if (!displayed) {
        closeWindow();
      }
    });
  }

  function updateKeypadEnabled() {
    if (telephony.active) {
      CallScreen.enableKeypad();
    } else {
      CallScreen.disableKeypad();
    }
  }

  function exitCallScreen(animate) {
    if (closing) {
      return;
    }

    closing = true;

    // If the screen is not displayed yet we close the window directly
    if (animate && displayed) {
      toggleScreen();
    } else {
      closeWindow();
    }
  }

  function closeWindow() {
    closing = false;
    window.close();
  }

  function updateAllPhoneNumberDisplays() {
    handledCalls.forEach(function(call) {
      call.restorePhoneNumber();
    });
  }
  window.addEventListener('resize', updateAllPhoneNumberDisplays);

  /* === Bluetooth Headset support ===*/
  function handleBTCommand(message) {
    var command = message['command'];
    switch (command) {
      case 'CHUP':
        end();
        break;
      case 'ATA':
        answer();
        break;
      case 'CHLD=0':
        hangupWaitingCalls();
        break;
      case 'CHLD=1':
        // End the active call and answer the other one
        if ((handledCalls.length === 1) && !cdmaCallWaiting()) {
          end();
        } else {
          endAndAnswer();
        }
        break;
      case 'CHLD=2':
        // Hold the active call and answer the other one
        if ((handledCalls.length === 1) && !cdmaCallWaiting()) {
          holdOrResumeSingleCall();
        } else {
          holdAndAnswer();
        }
        break;
      default:
        var partialCommand = command.substring(0, 3);
        if (partialCommand === 'VTS') {
          KeypadManager.press(command.substring(4));
        }
        break;
    }
  }

  /* Headset command support */
  var lastHeadsetPress = 0;

  function handleHSCommand(message) {
    /**
     * See bug 853132: plugging / unplugging some headphones might send a
     * 'headset-button-press' / 'headset-button-release' message
     * => if these two events happen in the same second, it's a click;
     * => if these two events are too distant, ignore them.
     */
    switch (message) {
      case 'headset-button-press':
        lastHeadsetPress = Date.now();
        return;
        break;
      case 'headset-button-release':
        if ((Date.now() - lastHeadsetPress) > 1000)
          return;
        break;
      default:
        return;
    }

    if (telephony.active) {
      end();
    } else if ((handledCalls.length > 1) || cdmaCallWaiting()) {
      holdAndAnswer();
    } else {
      answer();
    }
  }

  /* === User Actions === */
  function answer() {
    // We should always have only 1 call here
    if (!handledCalls.length) {
      return;
    }

    handledCalls[0].call.answer();

    CallScreen.render('connected');
  }

  function holdAndAnswer() {
    if ((handledCalls.length < 2) && !cdmaCallWaiting()) {
      return;
    }

    if (telephony.active) {
      // connected, incoming
      telephony.active.hold(); // the incoming call is answered by gecko

      // Check for CDMA mode before calling bluetooth CDMA-specific functions
      if (cdmaCallWaiting()) {
        btHelper.answerWaitingCall();
      }
    } else if (handledCalls.length >= 2) {
      // held, incoming
      var lastCall = handledCalls[handledCalls.length - 1].call;
      lastCall.answer(); // the previous call is held by gecko
    } else {
      // Held call in CDMA mode, hold to answer to the second call
      handledCalls[0].call.hold();
    }

    CallScreen.hideIncoming();

    if (cdmaCallWaiting()) {
      /* In CDMA mode we need to update the displayed call to reflect the fact
       * that we're not aware anymore to which number we're connected. We also
       * need to stop the call waiting tone as the call state doesn't change
       * after answering and thus doesn't trigger the stop callback. */
      handledCalls[0].updateCallNumber();
      CallScreen.cdmaCallWaiting = true;
      stopWaitingTone();
    }
  }

  function endAndAnswer() {
    if ((handledCalls.length < 2) && !cdmaCallWaiting()) {
      return;
    }

    if (telephony.active == telephony.conferenceGroup) {
      endConferenceCall();
      CallScreen.hideIncoming();
      return;
    }

    if (cdmaCallWaiting()) {
      /* We're in CDMA mode, there's no way to hang the existing call nor to
       * know if we're connected to the second call hence we treat this as an
       * hold-and-answer scenario. */
      handledCalls[0].call.hold();
      stopWaitingTone();
      btHelper.answerWaitingCall();
    } else {
      var callToEnd = telephony.active ||           // connected, incoming
        handledCalls[handledCalls.length - 2].call; // held, incoming

      if (callToEnd) {
        callToEnd.hangUp(); // the incoming call is answered by gecko
      }
    }

    CallScreen.hideIncoming();

    if (cdmaCallWaiting()) {
      /* In CDMA mode we need to update the displayed call to reflect the fact
       * that we're not aware anymore to which number we're connected. We also
       * need to stop the call waiting tone as the call state doesn't change
       * after answering and thus doesn't trigger the stop callback. */
      handledCalls[0].updateCallNumber();
      CallScreen.cdmaCallWaiting = true;
    }
  }

  function toggleCalls() {
    if (CallScreen.incomingContainer.classList.contains('displayed') &&
        !cdmaCallWaiting()) {
      /* In CDMA call waiting mode only one call is displayed but we can still
       * switch between calls if a second one is present. */
      return;
    }

    var openLines = telephony.calls.length +
      (telephony.conferenceGroup.calls.length ? 1 : 0);

    if (openLines < 2 && !cdmaCallWaiting()) {
      // Putting a call on Hold when there are no other
      // calls in progress has been disabled until a less
      // accidental user-interface is implemented.
      // See bug 894232 and bug 882056 for more background.
      // We can now hold a call only from BT devices.
      if (!telephony.active) {
        holdOrResumeSingleCall();
      }
      return;
    }

    telephony.active.hold();
    btHelper.toggleCalls();
  }

  function holdOrResumeSingleCall() {
    var openLines = telephony.calls.length +
      (telephony.conferenceGroup.calls.length ? 1 : 0);

    if (openLines !== 1) {
      return;
    }

    if (telephony.calls.length && telephony.calls[0].state === 'incoming') {
      return;
    }

    if (telephony.active) {
      telephony.active.hold();
      CallScreen.render('connected-hold');
    } else {
      var line = telephony.calls.length ?
        telephony.calls[0] : telephony.conferenceGroup;

      line.resume();
      CallScreen.render('connected');
    }
  }

  // Hang up the held call or the second incomming call
  function hangupWaitingCalls() {
    handledCalls.forEach(function(handledCall) {
      var callState = handledCall.call.state;
      if (callState === 'held' ||
        (callState === 'incoming' && handledCalls.length > 1)) {
        handledCall.call.hangUp();
      }
    });
  }

  function ignore() {
    /* On CDMA there's no way to hangup an incoming call so we just skip this
     * step and hide the incoming call. */
    if (cdmaCallWaiting()) {
      stopWaitingTone();
      btHelper.ignoreWaitingCall();
    } else {
      var ignoreIndex = handledCalls.length - 1;
      handledCalls[ignoreIndex].call.hangUp();
    }

    CallScreen.hideIncoming();
  }

  function endConferenceCall() {
    var callsToEnd = telephony.conferenceGroup.calls;
    CallScreen.setEndConferenceCall();
    for (var i = (callsToEnd.length - 1); i >= 0; i--) {
      var call = callsToEnd[i];
      call.hangUp();
    }
  }

  function end() {
    // If a conference call is active we end all the calls in it
    if (telephony.active == telephony.conferenceGroup) {
      endConferenceCall();
      return;
    }

    // If there is an active call we end this one
    if (telephony.active) {
      telephony.active.hangUp();
      return;
    }

    // If not we're rejecting the last incoming call
    if (!handledCalls.length) {
      exitCallScreen(true);
      return;
    }

    var lastCallIndex = handledCalls.length - 1;
    handledCalls[lastCallIndex].call.hangUp();
  }

  function unmute() {
    telephony.muted = false;
  }

  function turnSpeakerOn() {
    if (!telephony.speakerEnabled) {
      telephony.speakerEnabled = true;
      if (settings) {
        settings.createLock().set({'telephony.speaker.enabled': true});
      }
    }
  }

  function turnSpeakerOff() {
    if (telephony.speakerEnabled) {
      telephony.speakerEnabled = false;
      if (settings) {
        settings.createLock().set({'telephony.speaker.enabled': false});
      }
    }
  }

  function toggleMute() {
    telephony.muted = !telephony.muted;
  }

  function toggleSpeaker() {
    if (telephony.speakerEnabled)
      turnSpeakerOff();
    else
      turnSpeakerOn();
  }

  /**
   * Plays the ANSI call waiting tone for a 10 seconds window
   *
   * @param {Object} call The call object to which the wait tone is referred to.
   */
  function playWaitingTone(call) {
    // ANSI call waiting tone for a 10 sec window
    var sequence = [[440, 440, 100],
                    [0, 0, 100],
                    [440, 440, 100]];

    toneInterval = window.setInterval(function playTone() {
      TonePlayer.playSequence(sequence);
    }, 10000);
    TonePlayer.playSequence(sequence);

    call.addEventListener('statechange', function callStateChange() {
      call.removeEventListener('statechange', callStateChange);
      window.clearInterval(toneInterval);
    });
  }

  /**
   * Stops playing the waiting tone
   */
  function stopWaitingTone() {
    window.clearInterval(toneInterval);
  }

  function activeCall() {
    var telephonyActiveCall = telephony.active;
    var activeCall = null;
    for (var i = 0; i < handledCalls.length; i++) {
      var handledCall = handledCalls[i];
      if (telephonyActiveCall === handledCall.call) {
        activeCall = handledCall;
        break;
      }
    }
    return activeCall;
  }

  /**
   * Detects if we're in CDMA call waiting mode
   *
   * @return {Boolean} Returns true if we're in CDMA call waiting mode.
   */
  function cdmaCallWaiting() {
    return ((telephony.calls.length == 1) &&
            (telephony.calls[0].state == 'connected') &&
            telephony.calls[0].secondNumber);
  }

  function mergeActiveCallWith(call) {
    if (telephony.active == telephony.conferenceGroup) {
      telephony.conferenceGroup.add(call);
    } else {
      telephony.conferenceGroup.add(telephony.active, call);
    }
  }

  function mergeConferenceGroupWithActiveCall() {
    telephony.conferenceGroup.add(telephony.active);
  }

  return {
    setup: setup,

    answer: answer,
    holdAndAnswer: holdAndAnswer,
    endAndAnswer: endAndAnswer,
    toggleCalls: toggleCalls,
    ignore: ignore,
    end: end,
    updateKeypadEnabled: updateKeypadEnabled,
    toggleMute: toggleMute,
    toggleSpeaker: toggleSpeaker,
    unmute: unmute,
    turnSpeakerOn: turnSpeakerOn,
    turnSpeakerOff: turnSpeakerOff,

    checkCalls: onCallsChanged,
    mergeActiveCallWith: mergeActiveCallWith,
    mergeConferenceGroupWithActiveCall: mergeConferenceGroupWithActiveCall,
    updateAllPhoneNumberDisplays: updateAllPhoneNumberDisplays,

    get activeCall() {
      return activeCall();
    }
  };
})();
