/* globals AudioCompetingHelper, BluetoothHelper, CallScreen,
           ConferenceGroupHandler, Contacts, HandledCall, KeypadManager,
           LazyL10n, SimplePhoneMatcher, TonePlayer, Utils */

'use strict';

/* globals BluetoothHelper, CallScreen, Contacts, FontSizeManager, HandledCall,
           KeypadManager, LazyL10n, SimplePhoneMatcher, TonePlayer, Utils,
           AudioCompetingHelper */

var CallsHandler = (function callsHandler() {
  // Changing this will probably require markup changes
  var CALLS_LIMIT = 2;
  var CDMA_CALLS_LIMIT = 2;

  var handledCalls = [];
  var exitCallScreenTimeout = null;

  var toneInterval = null; // Timer used to play the waiting tone

  // Stores the HandledCall held by the user pressing the 'Hold' button. Null
  // if: there is no call on hold, or the user didn't hold it by pressing
  // the 'Hold' button.
  var callHeldByUser = null;

  var telephony = window.navigator.mozTelephony;
  telephony.oncallschanged = onCallsChanged;

  // Setting up the SimplePhoneMatcher
  // XXX: check bug-926169
  // this is used to keep all tests passing while introducing multi-sim APIs
  var conn = window.navigator.mozMobileConnections &&
             window.navigator.mozMobileConnections[0];

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

    // XXX: Use BTManager.isConnected() through btHelper
    // once bug 929376 is finished.
    btHelper.getConnectedDevicesByProfile(btHelper.profiles.HFP,
    function(result) {
      CallScreen.setBTReceiverIcon(!!(result && result.length));
    });

    btHelper.onhfpstatuschanged = function(evt) {
      CallScreen.setBTReceiverIcon(evt.status);
    };

    var acm = navigator.mozAudioChannelManager;
    if (acm) {
      acm.addEventListener('headphoneschange', function onheadphoneschange() {
        if (acm.headphones) {
          CallScreen.switchToDefaultOut();
        }
      });
    }

    btHelper.onscostatuschanged = function onscostatuschanged(evt) {
      if (evt.status) {
        CallScreen.switchToDefaultOut();
      }
    };

    navigator.mozSetMessageHandler('headset-button', handleHSCommand);
    navigator.mozSetMessageHandler('bluetooth-dialer-command', handleBTCommand);

    AudioCompetingHelper.clearListeners();
    AudioCompetingHelper.addListener('mozinterruptbegin', onMozInterrupBegin);
  }

  /* === Handled calls === */
  var highPriorityWakeLock = null;
  function onCallsChanged() {
    // Acquire or release the high-priority wake lock, as necessary.  This
    // (mostly) prevents this process from being killed while we're on a call.
    if (!highPriorityWakeLock && telephony.calls.length > 0) {
      highPriorityWakeLock = navigator.requestWakeLock('high-priority');
    }
    if (highPriorityWakeLock && telephony.calls.length === 0) {
      highPriorityWakeLock.unlock();
      highPriorityWakeLock = null;
    }

    // Make sure we play the busy tone when appropriate
    if (telephony.active) {
      telephony.active.addEventListener('error', handleBusyErrorAndPlayTone);
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
    function hcIterator(call) {
      return (call == hc.call);
    }

    for (var index = (handledCalls.length - 1); index >= 0; index--) {
      var hc = handledCalls[index];

      var stillHere = telephony.calls.some(hcIterator) ||
                      telephony.conferenceGroup.calls.some(hcIterator);

      if (!stillHere) {
        removeCall(index);
      }
    }

    if (cdmaCallWaiting()) {
      handleCallWaiting(telephony.calls[0]);
    } else {
      if (isCdma3WayCall()) {
        CallScreen.hidePlaceNewCallButton();
      } else if (handledCalls.length !== 0) {
        CallScreen.showPlaceNewCallButton();
      }
    }

    // Update the state of the hold/merge button depending on the calls' state
    updateMergeAndOnHoldStatus();

    CallScreen.setCallerContactImage();
    exitCallScreenIfNoCalls(CallScreen.callEndPromptTime);
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
      HandledCall(call);
      call.hangUp();
      return;
    }

    // First incoming or outgoing call, reset mute and speaker.
    if (handledCalls.length === 0) {
      CallScreen.unmute();

      /**
       * Do not connect bluetooth SCO for first incoming/outgoing call.
       *
       * Bluetooth certification test requires SCO be connected after
       * user answers incoming call. Gecko bluetooth would connect SCO
       * automatically once 1) user answers incoming call or
       * 2) user dials outgoing call.
       */
      CallScreen.switchToDefaultOut(true /* do not connect */);
    }

    // Find an available node for displaying the call
    var hc = new HandledCall(call);
    handledCalls.push(hc);
    CallScreen.insertCall(hc.node);

    if (call.state === 'incoming') {
      turnScreenOn(call);
    }

    if (handledCalls.length > 1) {
      // New incoming call, signaling the user.
      if (call.state === 'incoming') {
        hc.hide();
        handleCallWaiting(call);

      // User performed another outgoing call. show its status.
      } else {
        updatePlaceNewCall();
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
    handledCalls.splice(index, 1);

    if (handledCalls.length === 0) {
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

    // The remaining call was held, resume it if not held by the user.
    var remainingCallOrGroup = remainingCall.call.group || remainingCall.call;
    if (callHeldByUser !== remainingCallOrGroup) {
      remainingCallOrGroup.resume();
    } else {
      CallScreen.render('connected-hold');
    }
  }

  function turnScreenOn(call) {
    screenLock = navigator.requestWakeLock('screen');

    call.addEventListener('statechange', function callStateChange() {
      call.removeEventListener('statechange', callStateChange);

      if (screenLock) {
        screenLock.unlock();
        screenLock = null;
      }
    });
  }

  /**
   * Play the busy tone in response to the corresponding error being triggered
   * at the end of a call. Once the tone has finished this will also
   * automatically close the callscreen.
   *
   * @param evt {Object} The event delivered in the TelephonyCall.onerror
   *        event-handler.
   */
  function handleBusyErrorAndPlayTone(evt) {
    if (evt.call.error.name === 'BusyError') {
      // ANSI call waiting tone for a 3 seconds window.
      var sequence = [[480, 620, 500], [0, 0, 500],
                      [480, 620, 500], [0, 0, 500],
                      [480, 620, 500], [0, 0, 500]];
      var sequenceDuration = sequence.reduce(function(prev, curr) {
        return prev + curr[2];
      }, 0);

      TonePlayer.playSequence(sequence);
      exitCallScreenIfNoCalls(sequenceDuration);
    }
  }

  function handleCallWaiting(call) {
    LazyL10n.get(function localized(_) {
      var number = call.secondId ? call.secondId.number : call.id.number;

      if (!number) {
        CallScreen.incomingNumber.textContent = _('withheld-number');
        FontSizeManager.adaptToSpace(FontSizeManager.SECOND_INCOMING_CALL,
          CallScreen.incomingNumber, false, 'end');
        return;
      }

      if (navigator.mozIccManager.iccIds.length > 1) {
        CallScreen.incomingSim.textContent = _('sim-number',
                                               { n: call.serviceId + 1 });
      } else {
        CallScreen.incomingSim.hidden = true;
      }

      Contacts.findByNumber(number,
                            function lookupContact(contact, matchingTel) {
        if (contact && contact.name) {
          CallScreen.incomingInfo.classList.add('additionalInfo');
          CallScreen.incomingNumber.textContent = contact.name;
          CallScreen.incomingNumberAdditionalTelType.textContent =
            Utils.getPhoneNumberAdditionalInfo(matchingTel);
          CallScreen.incomingNumberAdditionalTel.textContent = number;
        } else {
          CallScreen.incomingNumber.textContent = number;
          CallScreen.incomingNumberAdditionalTelType.textContent = '';
          CallScreen.incomingNumberAdditionalTel.textContent = '';
        }

        FontSizeManager.adaptToSpace(
          FontSizeManager.SECOND_INCOMING_CALL, CallScreen.incomingNumber,
          false, 'end');
        if (contact && contact.name) {
          FontSizeManager.ensureFixedBaseline(
            FontSizeManager.SECOND_INCOMING_CALL, CallScreen.incomingNumber);
        }
      });
    });

    if (cdmaCallWaiting()) {
      CallScreen.holdAndAnswerOnly = true;
    }

    CallScreen.showIncoming();
    playWaitingTone(call);
  }

  /**
   * Checks now and also in CallScreen.callEndPromptTime seconds if there
   * are no currently handled calls, and if not, exits the app. Resets
   * this timer on each successive invocation.
   *
   * @param timeout {Integer} A duration in ms after which the callscreen
   *        should be closed.
   */
  function exitCallScreenIfNoCalls(timeout) {
    if (handledCalls.length === 0) {
      // Prevent the user from doing anything while we're waiting for the exit
      // timer to fire. This prevents them from taking any actions that would
      // require there to be a handled call.
      document.body.classList.toggle('no-handled-calls', true);

      if (exitCallScreenTimeout !== null) {
        clearTimeout(exitCallScreenTimeout);
        exitCallScreenTimeout = null;
      }
      exitCallScreenTimeout = setTimeout(function(evt) {
        exitCallScreenTimeout = null;
        if (handledCalls.length === 0) {
          window.close();
        } else {
          document.body.classList.toggle('no-handled-calls', false);
        }
      }, timeout);
    }
  }

  function updateAllPhoneNumberDisplays() {
    handledCalls.forEach(function(call) {
      if (!call._leftGroup) {
        call.restorePhoneNumber();
      }
    });
  }
  window.addEventListener('resize', updateAllPhoneNumberDisplays);

  /**
   * Return the number of calls currently present in one state or another.
   * This includes all regular calls irrespective of their state plus a
   * conference group call if one is present.
   *
   * @returns {Integer} The number of calls currently present.
   */
  function openLines() {
    return telephony.calls.length +
      (telephony.conferenceGroup.calls.length ? 1 : 0);
  }

  /* === Bluetooth Headset support ===*/
  function handleBTCommand(message) {
    var command = message.command;
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
          holdOrResumeCallByUser();
        } else {
          holdAndAnswer();
        }
        break;
      case 'CHLD=3':
        // Join/Establish conference call. Since we can have at most 2 calls
        // by spec, we can use telephony.calls[n] directly.
        if (!telephony.conferenceGroup.state && telephony.calls.length == 2) {
          telephony.conferenceGroup.add(
            telephony.calls[0], telephony.calls[1]);
          break;
        }
        if (telephony.conferenceGroup.state && telephony.calls.length == 1) {
          telephony.conferenceGroup.add(telephony.calls[0]);
          break;
        }
        console.warn('Cannot join conference call.');
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
      case 'headset-button-release':
        if ((Date.now() - lastHeadsetPress) > 1000) {
          return;
        }
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
      endConferenceCall().then(function() {
        CallScreen.hideIncoming();
      }, function() {});
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

      var callToAnswer;
      handledCalls.some(function(handledCall) {
        if (handledCall.call !== callToEnd) {
          callToAnswer = handledCall.call;
          return true;
        }
      });

      if (callToEnd && callToAnswer) {
        callToEnd.addEventListener('disconnected', function ondisconnected() {
          callToEnd.removeEventListener('disconnected', ondisconnected);
          // Answer the incoming call after hanging up the active call
          callToAnswer.answer();
        });

        callToEnd.hangUp(); // hangup the active call
      } else if (callToEnd) {
        callToEnd.hangUp(); // hangup the active call
      } else if (callToAnswer) {
        callToAnswer.answer(); // answer the incoming call
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

    if (openLines() < 2 && !cdmaCallWaiting()) {
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
    callHeldByUser = null;
  }

  function holdOrResumeCallByUser() {
    if (telephony.active) {
      callHeldByUser = telephony.active;
    }
    holdOrResumeSingleCall();
  }

  function holdOrResumeSingleCall() {
    if (openLines() !== 1 ||
        (telephony.calls.length &&
         (telephony.calls[0].state === 'incoming' ||
          !telephony.calls[0].switchable))) {
      return;
    }

    if (telephony.active) {
      telephony.active.hold();
      CallScreen.render('connected-hold');
      CallScreen.disableMuteButton();
      CallScreen.disableSpeakerButton();
    } else {
      var line = telephony.calls.length ?
        telephony.calls[0] : telephony.conferenceGroup;

      line.resume();
      callHeldByUser = null;
      CallScreen.render('connected');
      CallScreen.enableMuteButton();
      CallScreen.enableSpeakerButton();
    }
  }

  // Hang up the held call or the second incoming call
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
    return telephony.conferenceGroup.hangUp().then(function() {
      ConferenceGroupHandler.signalConferenceEnded();
    }, function() {
      console.error('Failed to hangup Conference Call');
    });
  }

  function end() {
    var callToEnd;

    // If there is an active call we end this one
    if (telephony.active) {
      callToEnd = telephony.active;
    } else if (openLines() === 1) {
      // If there's a single call we end it
      if (telephony.conferenceGroup.calls.length) {
        callToEnd = telephony.conferenceGroup;
      } else {
        callToEnd = telephony.calls[0];
      }
    } else {
      // If not we're rejecting the last incoming call
      if (!handledCalls.length) {
        return;
      }

      var lastCallIndex = handledCalls.length - 1;
      callToEnd = handledCalls[lastCallIndex].call;
    }

    // If this is a conference call end all the calls in it
    if (callToEnd.calls) {
      endConferenceCall();
    } else {
      callToEnd.hangUp();
    }
  }

  function unmute() {
    telephony.muted = false;
  }

  function switchToSpeaker() {
    // add a btHelper.isConnected() check before calling disconnectSco
    // once bug 929376 lands.
    btHelper.disconnectSco();
    if (!telephony.speakerEnabled) {
      telephony.speakerEnabled = true;
    }
  }

  function switchToDefaultOut(doNotConnect) {
    if (telephony.speakerEnabled) {
      telephony.speakerEnabled = false;
    }

    if (!doNotConnect && telephony.active && !document.hidden) {
      // add a btHelper.isConnected() check before calling disconnectSco
      // once bug 929376 lands.
      btHelper.connectSco();
    }
  }

  function switchToReceiver() {
    // add a btHelper.isConnected() check before calling disconnectSco
    // once bug 929376 lands.
    btHelper.disconnectSco();
    if (telephony.speakerEnabled) {
      telephony.speakerEnabled = false;
    }
  }

  function toggleMute() {
    telephony.muted = !telephony.muted;
  }

  function toggleSpeaker() {
    if (telephony.speakerEnabled) {
      CallsHandler.switchToDefaultOut();
    } else {
      CallsHandler.switchToSpeaker();
    }
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
    var active = null;
    for (var i = 0; i < handledCalls.length; i++) {
      var handledCall = handledCalls[i];
      if (telephonyActiveCall === handledCall.call) {
        active = handledCall;
        break;
      }
    }
    return active;
  }

  function activeCallForContactImage() {
    if (handledCalls.length === 1) {
      return handledCalls[0];
    }

    // The active call can be null. We're concatenating the active call with the
    // list of all handled calls. The active call will appear twice in this
    // array if it's not null.
    return [activeCall()].concat(handledCalls).find(function(elem) {
      return !elem || !elem.call.group;
    });
  }

  /**
   * Detects if we're in CDMA call waiting mode
   *
   * @return {Boolean} Returns true if we're in CDMA call waiting mode.
   */
  function cdmaCallWaiting() {
    return ((telephony.calls.length == 1) &&
            (telephony.calls[0].state == 'connected') &&
            (telephony.calls[0].secondId));
  }

  /**
   * Detects if we're first call on CDMA network
   *
   * @return {Boolean} Return true if we're first call on CDMA network.
   */
  function isFirstCallOnCdmaNetwork() {
    var cdmaTypes = ['evdo0', 'evdoa', 'evdob', '1xrtt', 'is95a', 'is95b'];
    if (handledCalls.length !== 0) {
      var ci = handledCalls[0].call.serviceId;
      var type = window.navigator.mozMobileConnections[ci].voice.type;

      return (cdmaTypes.indexOf(type) !== -1);
    } else {
      return false;
    }
  }

  function isCdma3WayCall() {
      return isFirstCallOnCdmaNetwork() &&
            ((telephony.calls.length === CDMA_CALLS_LIMIT) ||
             (telephony.conferenceGroup.calls.length > 0));
  }

  function mergeCalls() {
    if (!telephony.conferenceGroup.calls.length) {
      telephony.conferenceGroup.add(telephony.calls[0], telephony.calls[1]);
    } else {
      telephony.conferenceGroup.add(telephony.calls[0]);
    }
    callHeldByUser = null;
  }

  /* === Telephony audio channel competing functions ===*/

  /**
   * Helper function. Force the callscreen app to win the competion for the use
   * of the telephony audio channel.
   */
  function forceAnAudioCompetitionWin() {
    AudioCompetingHelper.leaveCompetition();
    AudioCompetingHelper.compete();
  }

  /**
   * onmozinterrupbegin event handler.
   */
  function onMozInterrupBegin() {
    // If there are multiple calls handled by the callscreen app and it is
    // interrupted by another app which uses the telephony audio channel the
    // callscreen wins.
    if (openLines() !== 1) {
     forceAnAudioCompetitionWin();
      return;
    }
    holdOrResumeSingleCall();
  }

  /**
   * Check if a call is being established.
   *
   * @returns true if a call is being established, false otherwise
   */
  function isEstablishingCall() {
    return telephony.calls.some(function(call) {
      return call.state == 'dialing' || call.state == 'alerting';
    });
  }

  /**
   * Check if any of the calls is currently on hold.
   *
   * @returns true if a call is on hold, false otherwise
   */
  function isAnyCallOnHold() {
    return telephony.calls.some(call => call.state === 'held') ||
      (telephony.conferenceGroup && telephony.conferenceGroup.state === 'held');
  }

  /**
   * Check if any of the calls can be put on hold or resumed.
   *
   * @returns true if a call can be put on hold or resumed, false otherwise
   */
  function isAnyCallSwitchable() {
    return telephony.calls.some(call => call.switchable) ||
      ((telephony.conferenceGroup.calls.length > 0) &&
       telephony.conferenceGroup.calls.every(call => call.switchable));
  }

  /**
   * Check if all non-conference calls are mergeable.
   *
   * @returns true if all non-confernece calls can be merged, false otherwise
   */
  function isEveryCallMergeable() {
    return telephony.calls.every(call => call.mergeable);
  }

  /**
   * Allow placing a new call only when we've not already placed one that isn't
   * connected yet.
   */
  function updatePlaceNewCall() {
    if (isEstablishingCall()) {
      CallScreen.disablePlaceNewCallButton();
    } else {
      CallScreen.enablePlaceNewCallButton();
    }
  }

  /**
   * Adjusts the state of the hold/merge button to reflect the current calls'
   * state. If only one call is available the hold button alone will be
   * displayed if the call's switchable. The state of the button will depend on
   * the call being on hold or not. If two calls are being handled at the same
   * time we'll display the merge button if the second call's mergeable. If not
   * no button will be displayed at all. We don't support cases where more than
   * two calls are being handled at the same time; this code will need to be
   * revisited if CALLS_LIMIT is increased above 2.
   */
  function updateMergeAndOnHoldStatus() {
    var isEstablishing = isEstablishingCall();
      if (openLines() > 1 && !isEstablishing) {
        /* If more than one call has been established show only the merge
         * button or no button at all if the calls are not mergeable. */
        CallScreen.hideOnHoldButton();

        if (isEveryCallMergeable()) {
          CallScreen.showOnHoldAndMergeContainer();
          CallScreen.showMergeButton();
        } else {
          CallScreen.hideOnHoldAndMergeContainer();
        }
      } else {
        /* If only one call has been established show only the hold button or
         * no button at all if the calls are not switchable. */
        CallScreen.hideMergeButton();
        CallScreen.setShowIsHeld(!telephony.active && isAnyCallOnHold());

        if (isEstablishing) {
          CallScreen.disableOnHoldButton();
        } else {
          CallScreen.enableOnHoldButton();
        }

        if (isAnyCallSwitchable()) {
          CallScreen.showOnHoldAndMergeContainer();
          CallScreen.showOnHoldButton();
        } else {
          CallScreen.hideOnHoldAndMergeContainer();
        }
      }
  }

  return {
    setup: setup,

    answer: answer,
    holdAndAnswer: holdAndAnswer,
    endAndAnswer: endAndAnswer,
    toggleCalls: toggleCalls,
    ignore: ignore,
    end: end,
    toggleMute: toggleMute,
    toggleSpeaker: toggleSpeaker,
    unmute: unmute,
    switchToReceiver: switchToReceiver,
    switchToSpeaker: switchToSpeaker,
    switchToDefaultOut: switchToDefaultOut,
    holdOrResumeCallByUser: holdOrResumeCallByUser,

    checkCalls: onCallsChanged,
    mergeCalls: mergeCalls,
    updateAllPhoneNumberDisplays: updateAllPhoneNumberDisplays,
    updatePlaceNewCall: updatePlaceNewCall,
    exitCallScreenIfNoCalls: exitCallScreenIfNoCalls,
    updateMergeAndOnHoldStatus: updateMergeAndOnHoldStatus,

    get activeCall() {
      return activeCall();
    },

    get activeCallForContactImage() {
      return activeCallForContactImage();
    },

    isFirstCallOnCdmaNetwork: isFirstCallOnCdmaNetwork
  };
})();
