'use strict';

var CallScreen = {
  _ticker: null,
  _screenLock: null,

  body: document.body,
  screen: document.getElementById('call-screen'),
  views: document.getElementById('views'),

  calls: document.getElementById('calls'),

  get activeCall() {
    delete this.activeCall;
    return this.activeCall = this.calls.querySelector(':not(.held)');
  },

  mainContainer: document.getElementById('main-container'),
  callToolbar: document.getElementById('co-advanced'),

  muteButton: document.getElementById('mute'),
  speakerButton: document.getElementById('speaker'),
  keypadButton: document.getElementById('keypad-visibility'),

  answerButton: document.getElementById('callbar-answer'),
  rejectButton: document.getElementById('callbar-hang-up'),

  incomingContainer: document.getElementById('incoming-container'),
  incomingNumber: document.getElementById('incoming-number'),
  incomingAnswer: document.getElementById('incoming-answer'),
  incomingEnd: document.getElementById('incoming-end'),
  incomingIgnore: document.getElementById('incoming-ignore'),
  lockedContactPhoto: document.getElementById('locked-contact-photo'),

  init: function cs_init() {
    this.muteButton.addEventListener('mouseup', this.toggleMute.bind(this));
    this.keypadButton.addEventListener('mouseup', this.showKeypad.bind(this));
    this.speakerButton.addEventListener('mouseup',
                                    this.toggleSpeaker.bind(this));
    this.answerButton.addEventListener('mouseup',
                                    OnCallHandler.answer.bind(OnCallHandler));
    this.rejectButton.addEventListener('mouseup',
                                    OnCallHandler.end);

    this.incomingAnswer.addEventListener('mouseup',
                              OnCallHandler.holdAndAnswer);
    this.incomingEnd.addEventListener('mouseup',
                              OnCallHandler.endAndAnswer);
    this.incomingIgnore.addEventListener('mouseup',
                                    OnCallHandler.ignore);

    this.calls.addEventListener('click',
                                OnCallHandler.toggleCalls);
  },

  setCallerContactImage: function cs_setContactImage(image_url, force, mask) {
    var photoURL;
    var isString = (typeof image_url == 'string');
    var isLocked = (this.screen.dataset.layout === 'incoming-locked');
    var target = isLocked ? this.lockedContactPhoto : this.mainContainer;
    photoURL = isString ? image_url : URL.createObjectURL(image_url);
    if (!target.style.backgroundImage || force) {
      target.style.backgroundImage = 'url(' + photoURL + ')';
      if (mask) {
        target.classList.add('masked');
      } else {
        target.classList.remove('masked');
      }
    }
  },

  toggleMute: function cs_toggleMute() {
    this.muteButton.classList.toggle('mute');
    OnCallHandler.toggleMute();
  },

  unmute: function cs_unmute() {
    this.muteButton.classList.remove('mute');
    OnCallHandler.unmute();
  },

  toggleSpeaker: function cs_toggleSpeaker() {
    this.speakerButton.classList.toggle('speak');
    OnCallHandler.toggleSpeaker();
  },

  turnSpeakerOff: function cs_turnSpeakerOff() {
    this.speakerButton.classList.remove('speak');
    OnCallHandler.turnSpeakerOff();
  },

  showKeypad: function cs_showKeypad() {
    KeypadManager.render('oncall');
    this.body.classList.add('showKeypad');
  },

  hideKeypad: function cs_hideKeypad() {
    KeypadManager.restorePhoneNumber('end', true);
    KeypadManager.restoreAdditionalContactInfo();
    this.body.classList.remove('showKeypad');
  },

  render: function cs_render(layout_type) {
    this.screen.dataset.layout = layout_type;
    if (layout_type !== 'connected') {
      this.keypadButton.setAttribute('disabled', 'disabled');
    }
  },

  showIncoming: function cs_showIncoming() {
    // Hiding the keypad
    this.body.classList.remove('showKeypad');

    this.callToolbar.classList.add('transparent');
    this.incomingContainer.classList.add('displayed');

    this._screenLock = navigator.requestWakeLock('screen');
  },

  hideIncoming: function cs_hideIncoming() {
    this.callToolbar.classList.remove('transparent');
    this.incomingContainer.classList.remove('displayed');

    if (this._screenLock) {
      this._screenLock.unlock();
      this._screenLock = null;
    }
  },

  syncSpeakerEnabled: function cs_syncSpeakerEnabled() {
    if (navigator.mozTelephony.speakerEnabled) {
      this.speakerButton.classList.add('speak');
    } else {
      this.speakerButton.classList.remove('speak');
    }
  },

  enableKeypad: function cs_enableKeypad() {
    this.keypadButton.removeAttribute('disabled');
  }
};

var OnCallHandler = (function onCallHandler() {
  var COMMS_APP_ORIGIN = 'app://communications.gaiamobile.org';
  // Changing this will probably require markup changes
  var CALLS_LIMIT = 2;

  var handledCalls = [];
  var telephony = window.navigator.mozTelephony;
  telephony.oncallschanged = onCallsChanged;

  var displayed = false;
  var closing = false;
  var animating = false;
  var ringing = false;

  /* === Settings === */
  var activePhoneSound = null;
  SettingsListener.observe('ring.enabled', true, function(value) {
    activePhoneSound = !!value;
    if (ringing && activePhoneSound) {
      ringtonePlayer.play();
    }
  });

  var selectedPhoneSound = '';
  SettingsListener.observe('dialer.ringtone', '', function(value) {
    selectedPhoneSound = value;
    ringtonePlayer.pause();
    ringtonePlayer.src = value;

    if (ringing && activePhoneSound) {
      ringtonePlayer.play();
    }
  });

  // Setting up the SimplePhoneMatcher
  var conn = window.navigator.mozMobileConnection;
  if (conn && conn.voice && conn.voice.network) {
    SimplePhoneMatcher.mcc = conn.voice.network.mcc.toString();
  }

  var ringtonePlayer = new Audio();
  ringtonePlayer.mozAudioChannelType = 'ringer';
  ringtonePlayer.src = selectedPhoneSound;
  ringtonePlayer.loop = true;

  var activateVibration = null;
  SettingsListener.observe('vibration.enabled', true, function(value) {
    activateVibration = !!value;
  });

  var screenLock;

  /* === Setup === */
  function setup() {
    // Animating the screen in the viewport.
    toggleScreen();

    if (telephony) {
      // Somehow the muted property appears to true after initialization.
      // Set it to false.
      telephony.muted = false;
    }
  }

  function postToMainWindow(data) {
    window.opener.postMessage(data, COMMS_APP_ORIGIN);
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
    handledCalls.forEach(function handledCallIterator(hc, index) {
      var stillHere = telephony.calls.some(function hcIterator(call) {
        return (call == hc.call);
      });

      if (!stillHere) {
        removeCall(index);
      }
    });

    // Letting the layout know how many calls we're handling
    if (handledCalls.length === 0) {
      exitCallScreen(false);
    } else {
      CallScreen.calls.dataset.count = handledCalls.length;
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
    if (handledCalls.length >= CALLS_LIMIT) {
      new HandledCall(call);
      call.hangUp();
      return;
    }

    var node = null;
    // Find an available node for displaying the call
    var children = CallScreen.calls.children;
    for (var i = 0; i < children.length; i++) {
      var n = children[i];
      if (n.dataset.occupied === 'false') {
        node = n;
        break;
      }
    }
    var hc = new HandledCall(call, node);
    handledCalls.push(hc);

    if (call.state === 'incoming') {
      call.addEventListener('statechange', function callStateChange() {
        call.removeEventListener('statechange', callStateChange);
        // The call wasn't picked up
        if (call.state == 'disconnected') {
          var callInfo = {
            type: 'notification',
            number: call.number
          };
          postToMainWindow(callInfo);
        }
      });

      // This is the initial incoming call, need to ring !
      if (handledCalls.length === 1) {
        handleFirstIncoming(call);
      }
    }

    if (handledCalls.length > 1) {
      // New incoming call, signaling the user.
      if (call.state === 'incoming') {
        handleCallWaiting(call);

      // User performed another outgoing call. show its status.
      } else {
        hc.show();
      }
    } else {
      if (window.location.hash === '#locked' &&
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

    if (handledCalls.length > 0) {
      // Only hiding the call if we have another one to display
      removedCall.hide();
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

      // The incoming call was rejected, resuming...
      remainingCall.call.resume();
      return;
    }

    exitCallScreen(true);
  }

  function handleFirstIncoming(call) {
    var vibrateInterval = 0;
    if (activateVibration != false) {
      vibrateInterval = window.setInterval(function vibrate() {
        // Wait for the setting value to return before starting a vibration.
        if ('vibrate' in navigator && activateVibration) {
          navigator.vibrate([200]);
        }
      }, 600);
    }

    if (activePhoneSound == true) {
      ringtonePlayer.play();
      ringing = true;
    } else if (activePhoneSound == null) {
      // Let's wait for the setting to return before playing any sound.
      ringing = true;
    }

    screenLock = navigator.requestWakeLock('screen');

    call.addEventListener('statechange', function callStateChange() {
      call.removeEventListener('statechange', callStateChange);

      ringtonePlayer.pause();
      ringing = false;

      window.clearInterval(vibrateInterval);

      if (screenLock) {
        screenLock.unlock();
        screenLock = null;
      }
    });
  }

  function handleCallWaiting(call) {
    LazyL10n.get(function localized(_) {
      var number = call.number || _('unknown');
      Contacts.findByNumber(number, function lookupContact(contact) {
        if (contact && contact.name) {
          CallScreen.incomingNumber.textContent = contact.name;
          return;
        }

        CallScreen.incomingNumber.textContent = number;
      });
    });

    CallScreen.showIncoming();

    var vibrateInterval = window.setInterval(function vibrate() {
      if ('vibrate' in navigator) {
        navigator.vibrate([200]);
      }
    }, 2000);

    call.addEventListener('statechange', function callStateChange() {
      call.removeEventListener('statechange', callStateChange);
      window.clearInterval(vibrateInterval);
    });
  }

  /* === Call Screen === */
  function toggleScreen() {
    displayed = !displayed;
    animating = true;

    var callScreen = CallScreen.screen;
    callScreen.classList.toggle('displayed');

    callScreen.addEventListener('transitionend', function trWait() {
      callScreen.removeEventListener('transitionend', trWait);

      animating = false;

      // We did animate the call screen off the viewport
      // now closing the window.
      if (!displayed) {
        closeWindow();
      }
    });
  }

  function exitCallScreen(animate) {
    if (closing) {
      return;
    }

    closing = true;
    postToMainWindow('closing');

    if (Swiper) {
      Swiper.setElasticEnabled(false);
    }

    if (animate && !animating) {
      toggleScreen();
    } else {
      closeWindow();
    }
  }

  function closeWindow() {
    window.close();
  }

  /* Handle commands send to the callscreen via postmessage */
  function handleCommand(evt) {
    if (evt.origin !== COMMS_APP_ORIGIN) {
      return;
    }
    var message = evt.data;
    if (!message) {
      return;
    }

    // Currently managing to kind of commands:
    // BT: bluetooth
    // HS: headset
    // * : general cases, not specific to hardware control
    switch (message.type) {
      case 'BT':
        handleBTCommand(message.command);
        break;
      case 'HS':
        handleHSCommand(message.command);
        break;
      case '*':
        handleGeneralCommand(message.command);
        break;
    }
  }

  /* === Bluetooth Headset support ===*/
  function handleBTCommand(message) {
    switch (message) {
      case 'CHUP':
        end();
        break;
      case 'ATA':
        answer();
        break;
      case 'CHUP+ATA':
        endAndAnswer();
        break;
      case 'CHLD+ATA':
        holdAndAnswer();
        break;
    }
  }

  function handleHSCommand(message) {
    // We will receive the message for button released,
    // we will ignore it
    if (message != 'headset-button-press') {
      return;
    }

    if (telephony.active) {
      end();
    } else if (handledCalls.length > 1) {
      holdAndAnswer();
    } else {
      answer();
    }
  }

  function handleGeneralCommand(message) {
    // Calls might be ended before callscreen is completely loaded or we
    // register 'callschanged' event. To avoid leaving callscreen stuck open,
    // we use a simple postMessage protocol to know when the call screen is
    // supposed to be closed, in addition to 'callschanged' event.
    if (message == 'exitCallScreen') {
      exitCallScreen(false);
    }
  }

  window.addEventListener('message', handleCommand);

  /* === User Actions === */
  function answer() {
    // We should always have only 1 call here
    if (!handledCalls.length) {
      return;
    }

    handledCalls[0].call.answer();

    if (CallScreen.screen.dataset.layout === 'incoming-locked') {
      CallScreen.mainContainer.style.backgroundImage =
        CallScreen.lockedContactPhoto.style.backgroundImage;
    }

    CallScreen.render('connected');
  }

  function holdAndAnswer() {
    var lastCallIndex = handledCalls.length - 1;

    telephony.active.hold();
    handledCalls[lastCallIndex].call.answer();

    CallScreen.hideIncoming();
  }

  function endAndAnswer() {
    var callToEnd = telephony.active;
    var callToAnswer = handledCalls[handledCalls.length - 1].call;

    callToEnd.addEventListener('disconnected', function disconnected() {
      callToEnd.removeEventListener('disconnected', disconnected);
      callToAnswer.answer();
    });
    callToEnd.hangUp();

    CallScreen.hideIncoming();
  }

  function toggleCalls() {
    if (handledCalls.length < 2) {
      return;
    }

    telephony.active.hold();
  }

  function ignore() {
    var ignoreIndex = handledCalls.length - 1;
    handledCalls[ignoreIndex].call.hangUp();

    CallScreen.hideIncoming();
  }

  function end() {
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

  function turnSpeakerOff() {
    telephony.speakerEnabled = false;
  }

  function toggleMute() {
    telephony.muted = !telephony.muted;
  }

  function toggleSpeaker() {
    telephony.speakerEnabled = !telephony.speakerEnabled;
  }

  /* === Recents management === */
  function addRecentEntry(entry) {
    var message = {
      type: 'recent',
      entry: entry
    };
    postToMainWindow(message);
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
    turnSpeakerOff: turnSpeakerOff,

    addRecentEntry: addRecentEntry
  };
})();

window.addEventListener('load', function callSetup(evt) {
  window.removeEventListener('load', callSetup);

  OnCallHandler.setup();
  CallScreen.init();
  CallScreen.syncSpeakerEnabled();
  KeypadManager.init(true);

  if (navigator.mozSettings) {
    var req = navigator.mozSettings.createLock().get('wallpaper.image');
    req.onsuccess = function cs_wi_onsuccess() {
      CallScreen.setCallerContactImage(
        req.result['wallpaper.image'], false, true);
    };
  }
});
