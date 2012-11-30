'use strict';

var CallScreen = {
  _ticker: null,

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

  swiperWrapper: document.getElementById('swiper-wrapper'),

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

  setCallerContactImage: function cs_setCallerContactImage(image_url) {
    var photoURL = URL.createObjectURL(image_url);
    this.mainContainer.style.backgroundImage = 'url(' + photoURL + ')';
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
    this.views.classList.add('show');
  },

  hideKeypad: function cs_hideKeypad() {
    KeypadManager.restorePhoneNumber();
    KeypadManager.restoreAdditionalContactInfo();
    KeypadManager.formatPhoneNumber();
    this.views.classList.remove('show');
  },

  render: function cs_render(layout_type) {
    switch (layout_type) {
      case 'dialing':
        this.answerButton.classList.add('hide');
        this.rejectButton.classList.remove('hide');
        this.rejectButton.classList.add('full-space');
        this.callToolbar.classList.remove('transparent');
        this.keypadButton.setAttribute('disabled', 'disabled');
        this.swiperWrapper.classList.add('hide');
        break;
      case 'incoming':
        this.answerButton.classList.remove('hide');
        this.rejectButton.classList.remove('hide');
        this.callToolbar.classList.remove('transparent');
        this.keypadButton.setAttribute('disabled', 'disabled');
        this.swiperWrapper.classList.add('hide');
        break;
      case 'incoming-locked':
        this.answerButton.classList.add('hide');
        this.rejectButton.classList.add('hide');
        this.callToolbar.classList.add('transparent');
        this.keypadButton.setAttribute('disabled', 'disabled');
        this.swiperWrapper.classList.remove('hide');
        break;
      case 'connected':
        this.answerButton.classList.add('hide');
        this.rejectButton.classList.remove('hide');
        this.rejectButton.classList.add('full-space');
        this.callToolbar.classList.remove('transparent');
        this.swiperWrapper.classList.add('hide');
        break;
    }
  },

  showIncoming: function cs_showIncoming() {
    // Hiding the keypad
    this.views.classList.remove('show');

    this.callToolbar.classList.add('transparent');
    this.incomingContainer.classList.add('displayed');
  },

  hideIncoming: function cs_hideIncoming() {
    this.callToolbar.classList.remove('transparent');
    this.incomingContainer.classList.remove('displayed');
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
  // Changing this will probably require markup changes
  var CALLS_LIMIT = 2;
  var _ = navigator.mozL10n.get;

  var handledCalls = [];
  var telephony = window.navigator.mozTelephony;
  telephony.oncallschanged = onCallsChanged;

  var displayed = false;
  var closing = false;
  var animating = false;
  var ringing = false;

  /* === Settings === */
  var activePhoneSound = true;
  SettingsListener.observe('ring.enabled', true, function(value) {
    activePhoneSound = !!value;
  });

  var selectedPhoneSound = 'style/ringtones/classic.ogg';
  SettingsListener.observe('dialer.ringtone', 'classic.ogg', function(value) {
    selectedPhoneSound = 'style/ringtones/' + value;
    ringtonePlayer.pause();
    ringtonePlayer.src = selectedPhoneSound;

    if (ringing) {
      ringtonePlayer.play();
    }
  });

  // Setting up the SimplePhoneMatcher
  var conn = window.navigator.mozMobileConnection;
  if (conn) {
    SimplePhoneMatcher.mcc = conn.voice.network.mcc.toString();
  }

  var ringtonePlayer = new Audio();
  ringtonePlayer.src = selectedPhoneSound;
  ringtonePlayer.loop = true;

  var activateVibration = true;
  SettingsListener.observe('vibration.enabled', true, function(value) {
    activateVibration = !!value;
  });

  var screenLock;
  var cpuLock;

  /* === Setup === */
  function setup() {
    // Animating the screen in the viewport.
    toggleScreen();

    cpuLock = navigator.requestWakeLock('cpu');

    if (telephony) {
      // Somehow the muted property appears to true after initialization.
      // Set it to false.
      telephony.muted = false;
    }
  }

  function postToMainWindow(data) {
    var origin = document.location.protocol + '//' +
      document.location.host;
    window.opener.postMessage(data, origin);
  }

  /* === Handled calls === */
  function onCallsChanged() {
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
        return;
      }
    });

    // Letting the layout know how many calls we're handling
    CallScreen.calls.dataset.count = handledCalls.length;

    if (CallScreen.calls.dataset.count === 0) {
      exitCallScreen(false);
    }

  }

  function addCall(call) {
    // Once we already have 1 call, we only care about incomings
    if (handledCalls.length && (call.state != 'incoming'))
      return;

    // No more room
    if (handledCalls.length >= CALLS_LIMIT) {
      new HandledCall(call);
      call.hangUp();
      return;
    }

    var node = CallScreen.calls.children[handledCalls.length];
    var hc = new HandledCall(call, node);
    handledCalls.push(hc);

    // This is the initial incoming call, need to ring !
    if (call.state === 'incoming' && handledCalls.length === 1) {
      handleFirstIncoming(call);
    }

    if (handledCalls.length > 1) {
      // signaling the user of the new call
      navigator.vibrate([100, 100, 100]);

      var number = (call.number.length ? call.number : _('unknown'));
      Contacts.findByNumber(number, function lookupContact(contact) {
        if (contact && contact.name) {
          CallScreen.incomingNumber.textContent = contact.name;
          return;
        }

        CallScreen.incomingNumber.textContent = number;
      });

      CallScreen.showIncoming();
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
    handledCalls.splice(index, 1);

    if (handledCalls.length > 0) {
      // Resuming the first remaining call
      handledCalls[0].call.resume();
      CallScreen.hideIncoming();
      return;
    }

    exitCallScreen(true);
  }

  function handleFirstIncoming(call) {
    var vibrateInterval = 0;
    if (activateVibration) {
      vibrateInterval = window.setInterval(function vibrate() {
        if ('vibrate' in navigator) {
          navigator.vibrate([200]);
        }
      }, 600);
    }

    if (activePhoneSound && selectedPhoneSound) {
      ringtonePlayer.play();
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

      // The call wasn't picked up
      if (call.state == 'disconnected') {
        var callInfo = {
          type: 'notification',
          number: call.number
        };
        postToMainWindow(callInfo);
      }
    });
  }

  /* === Call Screen === */
  function toggleScreen() {
    displayed = !displayed;
    animating = true;

    CallScreen.screen.classList.remove('animate');
    CallScreen.screen.classList.toggle('prerender');

    window.addEventListener('MozAfterPaint', function ch_finishAfterPaint() {
      window.removeEventListener('MozAfterPaint', ch_finishAfterPaint);

      window.setTimeout(function cs_transitionNextLoop() {
        CallScreen.screen.classList.add('animate');
        CallScreen.screen.classList.toggle('displayed');
        CallScreen.screen.classList.toggle('prerender');

        CallScreen.screen.addEventListener('transitionend', function trWait() {
          CallScreen.screen.removeEventListener('transitionend', trWait);

          animating = false;

          // We did animate the call screen off the viewport
          // now closing the window.
          if (!displayed) {
            closeWindow();
          }
        });
      });
    });
  }

  function exitCallScreen(animate) {
    if (closing)
      return;

    if (cpuLock) {
      cpuLock.unlock();
      cpuLock = null;
    }

    closing = true;

    if (animate && !animating) {
      toggleScreen();
    } else {
      closeWindow();
    }
  }

  function closeWindow() {
    postToMainWindow('closing');
    window.close();
  }

  /* Handle commands send to the callscreen via postmessage */
  function handleCommand(evt) {
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
    if (message == 'headset-button-release') {
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
    if (!handledCalls.length)
      return;

    handledCalls[0].call.answer();
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
    holdAndAnswer();

    callToEnd.onheld = function hangUpAfterHold() {
      callToEnd.hangUp();
    };

    CallScreen.hideIncoming();
  }

  function toggleCalls() {
    if (handledCalls.length < 2)
      return;

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
      toggleScreen();
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
    }
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

window.addEventListener('localized', function callSetup(evt) {
  window.removeEventListener('localized', callSetup);

  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');

  KeypadManager.init(true);
  CallScreen.init();
  CallScreen.syncSpeakerEnabled();
  OnCallHandler.setup();
  if (navigator.mozSettings) {
    var req = navigator.mozSettings.createLock().get('wallpaper.image');
    req.onsuccess = function cs_wi_onsuccess() {
      CallScreen.mainContainer.style.backgroundImage =
        'url(' + req.result['wallpaper.image'] + ')';
    };
  }
});
