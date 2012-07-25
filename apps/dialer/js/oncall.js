'use strict';

var CallScreen = {
  _ticker: null,

  get muteButton() {
    delete this.muteButton;
    return this.muteButton = document.getElementById('mute');
  },

  get speakerButton() {
    delete this.speakerButton;
    return this.speakerButton = document.getElementById('speaker');
  },

  get answerButton() {
    delete this.answerButton;
    return this.answerButton = document
      .getElementById('callbar-answer');
  },

  get rejectButton() {
    delete this.rejectButton;
    return this.rejectButton = document
      .getElementById('callbar-hang-up');
  },

  get keypadButton() {
    delete this.keypadButton;
    return this.keypadButton = document.getElementById('keypad-visibility');
  },

  get callContainer() {
    delete this.contactContainer;
    return this.contactContainer =
      document.getElementById('call-container');
  },

  get contactPrimaryInfo() {
    delete this.contactPrimaryInfo;
    return this.contactPrimaryInfo =
      document.getElementById('contact-primary-info');
  },

  get fakeContactPrimaryInfo() {
    delete this.fakeContactPrimaryInfo;
    return this.fakeContactPrimaryInfo =
      document.getElementById('fake-contact-primary-info');
  },

  get callDuration() {
    delete this.callDuration;
    return this.callDuration = document.getElementById('call-duration');

  },

  get callDirection() {
    delete this.callDirection;
    return this.callDirection = document.getElementById('call-direction');

  },

  get callToolbar() {
    delete this.callToolbar;
    return this.callToolbar = document.getElementById('co-advanced');

  },

  get screen() {
    delete this.screen;
    return this.screen = document.getElementById('call-screen');
  },

  get views() {
    delete this.views;
    return this.views = document.getElementById('views');
  },

  init: function cm_init() {
    this.muteButton.addEventListener('mouseup', this.toggleMute.bind(this));
    this.keypadButton.addEventListener('mouseup', this.toggleKeypad.bind(this));
    this.speakerButton.addEventListener('mouseup',
                                    this.toggleSpeaker.bind(this));
    this.answerButton.addEventListener('mouseup',
                                    OnCallHandler.answer.bind(OnCallHandler));
    this.rejectButton.addEventListener('mouseup',
                                    OnCallHandler.end.bind(OnCallHandler));
  },

  update: function cm_update(phone_number) {
    this.contactPrimaryInfo.value = phone_number;
    KeypadManager.formatPhoneNumber('on-call');
    KeypadManager._phoneNumber = phone_number;
    KeypadManager.phoneNumberView.value =
      KeypadManager._phoneNumber;
    KeypadManager.moveCaretToEnd(
      KeypadManager.phoneNumberView);
  },

  setCallerContactImage: function cm_setCallerContactImage(image_url) {
    this.callContainer.style.backgroundImage = 'url(' + image_url + ')';
  },

  toggleMute: function cm_toggleMute() {
    this.muteButton.classList.toggle('mute');
    OnCallHandler.toggleMute();
  },

  toggleSpeaker: function cm_toggleSpeaker() {
    this.speakerButton.classList.toggle('speak');
    OnCallHandler.toggleSpeaker();
  },

  toggleKeypad: function cm_toggleKeypad() {
    KeypadManager.render('oncall');
    this.update(KeypadManager._phoneNumber);
    this.views.classList.toggle('show');
  },

  startTimer: function cm_startTimer() {
    this._ticker = setInterval(function cm_updateTimer(self, startTime) {
      var elapsed = new Date(Date.now() - startTime);
      CallScreen.callDuration.innerHTML =
        elapsed.toLocaleFormat('%M:%S');
    }, 1000, this, Date.now());
  },

  clearTimer: function cm_clearTimer() {
    if (this._ticker)
      clearInterval(this._ticker);
  },

  render: function cm_render(layout_type) {
    switch (layout_type) {
      case 'dialing':
        this.callDuration.innerHTML = 'Calling';
        this.callDuration.classList.remove('ongoing');
        this.callDirection.classList.add('outgoing');
        this.answerButton.classList.add('hide');
        this.rejectButton.classList.add('full-space');
        this.callToolbar.classList.remove('transparent');
        this.keypadButton.setAttribute('disabled', 'disabled');
        break;
      case 'incoming':
        this.callDuration.innerHTML = 'Calling';
        this.callDuration.classList.remove('ongoing');
        this.callDirection.classList.add('incoming');
        this.answerButton.classList.remove('hide');
        this.rejectButton.classList.remove('full-space');
        this.callToolbar.classList.add('transparent');
        this.keypadButton.setAttribute('disabled', 'disabled');
        break;
      case 'connected':
        // When the call is connected the speaker state is reset
        // keeping in sync...
        this._syncSpeakerEnabled();

        this.answerButton.classList.add('hide');
        this.rejectButton.classList.add('full-space');
        this.callToolbar.classList.remove('transparent');

        this.keypadButton.removeAttribute('disabled');
        this.callDuration.innerHTML = '00:00';
        this.callDuration.classList.add('ongoing');
        if (this.callDirection.classList.contains('outgoing')) {
          this.callDirection.classList.remove('outgoing');
          this.callDirection.classList.add('ongoing-out');
        } else if (this.callDirection.classList.contains('incoming')) {
          this.callDirection.classList.remove('incoming');
          this.callDirection.classList.add('ongoing-in');
        }
        this.callDirection.classList.add('show');

        break;
    }
  },

  _syncSpeakerEnabled: function och_syncSpeakerEnabled() {
    if (navigator.mozTelephony.speakerEnabled) {
      this.speakerButton.classList.add('speak');
    } else {
      this.speakerButton.classList.remove('speak');
    }
  }
};

var OnCallHandler = {
  currentCall: null,
  _screenLock: null,
  _displayed: false,
  _disconnected: false,

  setup: function och_setup() {
    var hash = document.location.hash;
    var typeOfCall = hash.slice(1, hash.length);

    // Animating the screen in the viewport.
    this.toggleScreen();

    this._screenLock = navigator.requestWakeLock('screen');
    ProximityHandler.enable();

    var telephony = window.navigator.mozTelephony;
    if (telephony) {
      // Somehow the muted property appears to true after initialization.
      // Set it to false.
      telephony.muted = false;

      var self = this;
      telephony.oncallschanged = function och_callsChanged(evt) {
        telephony.calls.forEach(function callIterator(call) {
          self.setupForCall(call, typeOfCall);
        });
      }
    }
  },

  setupForCall: function och_setupForCall(call, typeOfCall) {
    this.currentCall = call;

    this.updateCallNumber(call.number);

    CallScreen.render(typeOfCall);

    this.recentsEntry = {
      date: Date.now(),
      type: typeOfCall,
      number: call.number
    };

    // Some race condition can cause the call to be already
    // connected when we get here.
    if (call.state == 'connected')
      this.connected();

    call.addEventListener('statechange', this);
  },

  handleEvent: function och_handleEvent(evt) {
    switch (evt.call.state) {
      case 'connected':
        this.connected();
        break;
      case 'disconnected':
        this.disconnected();
        break;
      default:
        break;
    }
  },

  connected: function ch_connected() {
    // Update UI properly.
    CallScreen.render('connected');
    CallScreen.startTimer();

    this.recentsEntry.type += '-connected';
  },

  disconnected: function ch_disconnected() {
    if (this._disconnected)
      return;

    this._disconnected = true;

    if (this.currentCall) {
      this.currentCall.removeEventListener('statechange', this);
      this.currentCall = null;
    }

    CallScreen.clearTimer();

    if (this.recentsEntry) {
      Recents.add(this.recentsEntry);
      this.recentsEntry = null;
    }

    if (this._screenLock) {
      this._screenLock.unlock();
      this._screenLock = null;
    }

    ProximityHandler.disable();

    // Out animation before closing the window
    this.toggleScreen();
  },

  answer: function ch_answer() {
    if (this.currentCall) {
      this.currentCall.answer();
    } else {
      this.disconnected();
    }
  },

  end: function ch_end() {
    if (this.recentsEntry &&
       (this.recentsEntry.type.indexOf('-connected') == -1)) {
      this.recentsEntry.type += '-refused';
    }

    if (this.currentCall)
      this.currentCall.hangUp();

    // We're not waiting for a disconnected statechange
    // If the user touch the 'end' button we wants to get
    // out of the call-screen right away.
    this.disconnected();
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
          if (displayed)
            window.close();
        });
      });
    });
  },

  toggleMute: function ch_toggleMute() {
    navigator.mozTelephony.muted = !navigator.mozTelephony.muted;
  },

  toggleSpeaker: function ch_toggleSpeaker() {
    navigator.mozTelephony.speakerEnabled =
      !navigator.mozTelephony.speakerEnabled;
  },

  updateCallNumber: function och_updateCallNumber(number) {
    if (!number.length) {
      CallScreen.update('Anonymous');
      return;
    }

    var voicemail = navigator.mozVoicemail;
    if (voicemail) {
      if (voicemail.number == number) {
        CallScreen.update(voicemail.displayName);
        return;
      }
    }

    Contacts.findByNumber(number, function lookupContact(contact) {
      if (!contact) {
        CallScreen.update(number);
        return;
      }

      if (contact.name) {
        CallScreen.update(contact.name + ' - ');
      }
      if (contact.photo) {
        CallScreen.setCallerContactImage(contact.photo);
      }
    });
  }
};

window.addEventListener('load', function callSetup(evt) {
  window.removeEventListener('load', callSetup);
  KeypadManager.init();
  CallScreen.init();
  OnCallHandler.setup();
});
