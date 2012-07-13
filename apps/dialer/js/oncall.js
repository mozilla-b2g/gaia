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

  init: function cs_init() {
    this.muteButton.addEventListener('mouseup', this.toggleMute.bind(this));
    this.keypadButton.addEventListener('mouseup', this.showKeypad.bind(this));
    this.speakerButton.addEventListener('mouseup',
                                    this.toggleSpeaker.bind(this));
    this.answerButton.addEventListener('mouseup',
                                    OnCallHandler.answer.bind(OnCallHandler));
    this.rejectButton.addEventListener('mouseup',
                                    OnCallHandler.end.bind(OnCallHandler));

    this.incomingAnswer.addEventListener('mouseup',
                              OnCallHandler.holdAndAnswer.bind(OnCallHandler));
    this.incomingEnd.addEventListener('mouseup',
                              OnCallHandler.endAndAnswer.bind(OnCallHandler));
    this.incomingIgnore.addEventListener('mouseup',
                                    OnCallHandler.ignore.bind(OnCallHandler));

    this.calls.addEventListener('click',
                                OnCallHandler.toggleCalls.bind(OnCallHandler));

  },

  setCallerContactImage: function cs_setCallerContactImage(image_url) {
    this.mainContainer.style.backgroundImage = 'url(' + image_url + ')';
  },

  toggleMute: function cs_toggleMute() {
    this.muteButton.classList.toggle('mute');
    OnCallHandler.toggleMute();
  },

  toggleSpeaker: function cs_toggleSpeaker() {
    this.speakerButton.classList.toggle('speak');
    OnCallHandler.toggleSpeaker();
  },

  showKeypad: function cs_showKeypad() {
    KeypadManager.render('oncall');

    KeypadManager.formatPhoneNumber('on-call');

    KeypadManager._phoneNumber = KeypadManager._phoneNumber;

    KeypadManager.phoneNumberView.value = KeypadManager._phoneNumber;
    KeypadManager.moveCaretToEnd(KeypadManager.phoneNumberView);
    this.views.classList.add('show');
  },

  hideKeypad: function cs_hideKeypad() {
    this.views.classList.remove('show');
  },

  render: function cs_render(layout_type) {
    switch (layout_type) {
      case 'dialing':
        this.answerButton.classList.add('hide');
        this.rejectButton.classList.add('full-space');
        this.callToolbar.classList.remove('transparent');
        this.keypadButton.setAttribute('disabled', 'disabled');
        break;
      case 'incoming':
        this.answerButton.classList.remove('hide');
        this.rejectButton.classList.remove('full-space');
        this.callToolbar.classList.add('transparent');
        this.keypadButton.setAttribute('disabled', 'disabled');
        break;
      case 'connected':
        this.answerButton.classList.add('hide');
        this.rejectButton.classList.add('full-space');
        this.callToolbar.classList.remove('transparent');

        break;
    }
  },

  showIncoming: function cs_showIncoming() {
    this.hideKeypad();
    this.incomingContainer.classList.add('displayed');
  },

  hideIncoming: function cs_hideIncoming() {
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

var OnCallHandler = {
  CALLS_LIMIT: 2, // Changing this will probably require some markup changes

  handledCalls: [],
  _telephony: window.navigator.mozTelephony,

  _screenLock: null,
  _displayed: false,
  _closing: false,

  setup: function och_setup() {
    // Animating the screen in the viewport.
    this.toggleScreen();

    this._screenLock = navigator.requestWakeLock('screen');
    ProximityHandler.enable();

    var telephony = this._telephony;
    if (telephony) {
      // Somehow the muted property appears to true after initialization.
      // Set it to false.
      telephony.muted = false;

      var self = this;
      telephony.oncallschanged = function och_callsChanged(evt) {
        // Adding any new calls to handledCalls
        telephony.calls.forEach(function callIterator(call) {
          if (call.state == 'incoming' || call.state == 'dialing') {
            var alreadyAdded = self.handledCalls.some(function hcIterator(hc) {
              return (hc.call == call);
            });

            if (!alreadyAdded) {
              self._addCall(call);
            }
          }
        });

        // Removing any ended calls to handledCalls
        self.handledCalls.forEach(function handledCallIterator(hc, index) {
          var stillHere = telephony.calls.some(function hcIterator(call) {
            return (call == hc.call);
          });

          if (!stillHere) {
            self._removeCall(index);
            return;
          }
        });

        // Letting the layout know how many calls we're handling
        CallScreen.calls.dataset.count = self.handledCalls.length;
      }
    }
  },

  answer: function ch_answer() {
    this._telephony.active.answer();
    CallScreen.render('connected');
  },

  holdAndAnswer: function och_holdAndAnswer() {
    var lastCallIndex = this.handledCalls.length - 1;

    this._telephony.active.hold();
    this.handledCalls[lastCallIndex].call.answer();

    CallScreen.hideIncoming();
  },

  endAndAnswer: function och_endAndAnswer() {
    var callToEnd = this._telephony.active;
    this.holdAndAnswer();

    callToEnd.onheld = function hangUpAfterHold() {
      callToEnd.hangUp();
    };

    CallScreen.hideIncoming();
  },

  toggleCalls: function och_toggleCalls() {
    if (this.handledCalls.length < 2)
      return;

    this._telephony.active.hold();
  },

  ignore: function ch_ignore() {
    var ignoreIndex = this.handledCalls.length - 1;
    this.handledCalls[ignoreIndex].hangUp();

    CallScreen.hideIncoming();
  },

  end: function ch_end() {
    this._telephony.active.hangUp();
  },

  toggleMute: function ch_toggleMute() {
    navigator.mozTelephony.muted = !navigator.mozTelephony.muted;
  },

  toggleSpeaker: function ch_toggleSpeaker() {
    navigator.mozTelephony.speakerEnabled =
      !navigator.mozTelephony.speakerEnabled;
  },

  toggleScreen: function ch_toggleScreen() {
    CallScreen.screen.classList.remove('animate');
    CallScreen.screen.classList.toggle('prerender');

    var displayed = this._displayed;
    this._displayed = !this._displayed;

    var self = this;
    window.addEventListener('MozAfterPaint', function ch_finishAfterPaint() {
      window.removeEventListener('MozAfterPaint', ch_finishAfterPaint);

      window.setTimeout(function cs_transitionNextLoop() {
        CallScreen.screen.classList.add('animate');
        CallScreen.screen.classList.toggle('displayed');
        CallScreen.screen.classList.toggle('prerender');

        CallScreen.screen.addEventListener('transitionend', function trWait() {
          CallScreen.screen.removeEventListener('transitionend', trWait);

          // We did animate the call screen off the viewport
          // now closing the window.
          if (displayed) {
            var origin = document.location.protocol + '//' +
              document.location.host;
            window.opener.postMessage('closing', origin);
            window.close();
          }
        });
      });
    });
  },

  _addCall: function och_addCall(call) {
    // No more room
    if (this.handledCalls.length >= this.CALLS_LIMIT) {
      call.hangUp();
      return;
    }

    var node = CallScreen.calls.children[this.handledCalls.length];
    var hc = new HandledCall(call, node);
    this.handledCalls.push(hc);

    if (this.handledCalls.length > 1) {
      // signaling the user of the new call
      navigator.vibrate([100, 100, 100]);

      var number = (call.number.length ? call.number : 'Anonymous');
      Contacts.findByNumber(number, function lookupContact(contact) {
        if (contact && contact.name) {
          CallScreen.incomingNumber.textContent = contact.name;
          return;
        }

        CallScreen.incomingNumber.textContent = number;
      });

      CallScreen.showIncoming();
    } else {
      CallScreen.render(call.state);
    }
  },

  _removeCall: function och_removeCall(index) {
    this.handledCalls.splice(index, 1);

    if (this.handledCalls.length > 0) {
      // Resuming the first remaining call
      this.handledCalls[0].call.resume();
      CallScreen.hideIncoming();
      return;
    }

    if (this._closing)
      return;

    if (this._screenLock) {
      this._screenLock.unlock();
      this._screenLock = null;
    }

    ProximityHandler.disable();

    this._closing = true;
    // Out animation before closing the window
    this.toggleScreen();
  }
};

window.addEventListener('load', function callSetup(evt) {
  window.removeEventListener('load', callSetup);
  KeypadManager.init();
  CallScreen.init();
  OnCallHandler.setup();
});
