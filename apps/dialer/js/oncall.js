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
    return this.answerButton = document.getElementById('co-basic-answer');
  },

  get rejectButton() {
    delete this.rejectButton;
    return this.rejectButton = document.getElementById('co-basic-reject');
  },

  get keypadButton() {
    delete this.keypadButton;
    return this.keypadButton = document.getElementById('keypad-visibility');
  },

  get contactPrimaryInfo() {
    delete this.contactPrimaryInfo;
    return this.contactPrimaryInfo =
      document.getElementById('cs-h-info-primary');
  },

  get callDuration() {
    delete this.callDuration;
    return this.callDuration = document.getElementById('call-duration');

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
    this.contactPrimaryInfo.innerHTML = phone_number;
    KeypadManager._phoneNumber = phone_number;
    KeypadManager.phoneNumberView.value =
      KeypadManager._phoneNumber;
    KeypadManager.moveCaretToEnd(
      KeypadManager.phoneNumberView);
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
      case 'outgoing':
        this.callDuration.innerHTML = '...';
        this.answerButton.classList.add('hide');
        this.callToolbar.classList.remove('transparent');
        this.keypadButton.setAttribute('disabled', 'disabled');
        break;
      case 'incoming':
        this.answerButton.classList.remove('hide');
        this.callToolbar.classList.add('transparent');
        this.callDuration.innerHTML = '';
        break;
      case 'connected':
        // When the call is connected the speaker state is reset
        // keeping in sync...
        this._syncSpeakerEnabled();

        this.answerButton.classList.add('hide');

        if (!this.answerButton.classList.contains('transparent')) {
          this.callToolbar.classList.remove(
            'transparent');
        }

        this.keypadButton.removeAttribute('disabled');
        this.callDuration.innerHTML = '00:00';

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

    var self = this;
    var telephony = window.navigator.mozTelephony;
    if (telephony) {
      // Somehow the muted property appears to true after initialization.
      // Set it to false.
      telephony.muted = false;
      telephony.oncallschanged = function och_callsChanged(evt) {
        telephony.calls.forEach(function callIterator(call) {
          self.currentCall = call;

          CallScreen.update(call.number);
          CallScreen.render(typeOfCall);

          self.lookupContact(call.number);

          self.recentsEntry = {
            date: Date.now(),
            type: typeOfCall,
            number: call.number
          };

          // Some race condition can cause the call to be already
          // connected when we get here.
          if (call.state == 'connected')
            self.connected();

          call.addEventListener('statechange', self);
        });
      }
    }
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
    this.currentCall.answer();
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
    // hardening against the unavailability of MozAfterPaint
    var finished = false;

    var self = this;
    var finishTransition = function ch_finishTransition() {
      if (finished)
        return;

      if (securityTimeout) {
        clearTimeout(securityTimeout);
        securityTimeout = null;
      }

      finished = true;

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
    };

    window.addEventListener('MozAfterPaint', function ch_finishAfterPaint() {
      window.removeEventListener('MozAfterPaint', ch_finishAfterPaint);
      finishTransition();
    });
    var securityTimeout = window.setTimeout(finishTransition, 100);

    this._displayed = !this._displayed;
  },

  toggleMute: function ch_toggleMute() {
    navigator.mozTelephony.muted = !navigator.mozTelephony.muted;
  },

  toggleSpeaker: function ch_toggleSpeaker() {
    navigator.mozTelephony.speakerEnabled =
      !navigator.mozTelephony.speakerEnabled;
  },

  lookupContact: function och_lookupContact(number) {
    Contacts.findByNumber(number, function lookupContact(contact) {
      CallScreen.update(contact.name);
    });
  }
};

window.addEventListener('load', function callSetup(evt) {
  window.removeEventListener('load', callSetup);
  KeypadManager.init();
  CallScreen.init();
  OnCallHandler.setup();
});
