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

    KeypadManager.formatPhoneNumber('on-call');

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
    this.hideKeypad();
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

var OnCallHandler = {
  CALLS_LIMIT: 2, // Changing this will probably require some markup changes

  handledCalls: [],
  _telephony: window.navigator.mozTelephony,

  _displayed: false,
  _closing: false,

  setup: function och_setup() {
    // Animating the screen in the viewport.
    this.toggleScreen();

    ProximityHandler.enable();

    var telephony = this._telephony;
    if (telephony) {
      // Somehow the muted property appears to true after initialization.
      // Set it to false.
      telephony.muted = false;

      var self = this;
      var callsChanged = function och_callsChanged(evt) {
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
      };

      // Needs to be called at least once
      callsChanged();
      telephony.oncallschanged = callsChanged;

      // If the call was ended before we got here we can close
      // right away.
      if (this.handledCalls.length === 0) {
        this._close(false);
      }
    }
  },

  answer: function ch_answer() {
    // We should always have only 1 call here
    if (!this.handledCalls.length)
      return;

    this.handledCalls[0].call.answer();
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
    this.handledCalls[ignoreIndex].call.hangUp();

    CallScreen.hideIncoming();
  },

  end: function ch_end() {
    // If there is an active call we end this one
    if (this._telephony.active) {
      this._telephony.active.hangUp();
      return;
    }

    // If not we're rejecting the last incoming call
    if (!this.handledCalls.length) {
      this.toggleScreen();
      return;
    }

    var lastCallIndex = this.handledCalls.length - 1;
    this.handledCalls[lastCallIndex].call.hangUp();
  },

  unmute: function ch_unmute() {
    this._telephony.muted = false;
  },

  toggleMute: function ch_toggleMute() {
    this._telephony.muted = !this._telephony.muted;
  },

  turnSpeakerOff: function ch_turnSpeakeroff() {
    this._telephony.speakerEnabled = false;
  },

  toggleSpeaker: function ch_toggleSpeaker() {
    this._telephony.speakerEnabled = !this._telephony.speakerEnabled;
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
            self.closeWindow();
          }
        });
      });
    });
  },

  closeWindow: function och_closeWindow() {
    var origin = document.location.protocol + '//' +
      document.location.host;
    window.opener.postMessage('closing', origin);
    window.close();
  },

  _addCall: function och_addCall(call) {
    // Once we already have 1 call, we only care about incomings
    if (this.handledCalls.length && (call.state != 'incoming'))
      return;

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

      var _ = navigator.mozL10n.get;
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
      if (window.location.hash.split('?')[1] === 'locked' &&
          (call.state == 'incoming')) {
        CallScreen.render('incoming-locked');
      } else {
        CallScreen.render(call.state);
      }
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

    this._close(true);
  },

  _close: function och_close(animate) {
    if (this._closing)
      return;

    ProximityHandler.disable();

    this._closing = true;

    if (animate) {
      this.toggleScreen();
    } else {
      this.closeWindow();
    }
  }
};

window.addEventListener('localized', function callSetup(evt) {
  window.removeEventListener('localized', callSetup);

  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');

  KeypadManager.init();
  CallScreen.init();
  CallScreen.syncSpeakerEnabled();
  OnCallHandler.setup();
});
