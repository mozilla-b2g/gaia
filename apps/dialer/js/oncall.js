'use strict';

var OnCallHandler = {
  currentCall: null,
  _screenLock: null,
  _ticker: null,
  _displayed: false,

  setup: function och_setup() {
    var hash = document.location.hash;
    var screenClass = hash.slice(1, hash.length);
    this.screen.classList.add(screenClass);

    // Somehow the muted property appears to true after initialization.
    // Set it to false.
    navigator.mozTelephony.muted = false;

    // Animating the screen in the viewport.
    this.toggleScreen();

    this._screenLock = navigator.requestWakeLock('screen');
    ProximityHandler.enable();

    var self = this;
    var telephony = window.navigator.mozTelephony;
    if (telephony) {
      telephony.oncallschanged = function och_callsChanged(evt) {
        telephony.calls.forEach(function callIterator(call) {
          self.currentCall = call;
          call.addEventListener('statechange', self);

          self.numberView.textContent = call.number || 'Anonymous';
          self.statusView.textContent = (screenClass == 'incoming') ?
                                        'Call from...' : 'Calling...';

          self.lookupContact(call.number);

          self.recentsEntry = {
            date: Date.now(),
            type: (screenClass == 'incoming') ?
                   'incoming' : 'outgoing',
            number: call.number
          };
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
    this.screen.classList.remove('incoming');
    this.screen.classList.add('calling');
    this.statusView.innerHTML = '00:00';

    this.recentsEntry.type += '-connected';

    this._ticker = setInterval(function ch_updateTimer(self, startTime) {
      var elapsed = new Date(Date.now() - startTime);
      self.statusView.innerHTML = elapsed.toLocaleFormat('%M:%S');
    }, 1000, this, Date.now());
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

  disconnected: function och_disconnected() {
    if (this.currentCall) {
      this.currentCall.removeEventListener('statechange', this);
      this.currentCall = null;
    }

    if (this.muteButton.classList.contains('mute'))
      this.toggleMute();
    if (this.speakerButton.classList.contains('speak'))
      this.toggleSpeaker();
    if (this.keypadButton.classList.contains('displayed'))
      this.toggleKeypad();

    if (this._ticker)
      clearInterval(this._ticker);

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

  get screen() {
    delete this.screen;
    return this.screen = document.getElementById('call-screen');
  },
  get numberView() {
    delete this.numberView;
    return this.numberView = document.getElementById('call-number-view');
  },
  get statusView() {
    delete this.statusView;
    return this.statusView = document.getElementById('call-status-view');
  },
  get actionsView() {
    delete this.actionsView;
    return this.actionsView = document.getElementById('call-actions-container');
  },
  get muteButton() {
    delete this.muteButton;
    return this.muteButton = document.getElementById('mute-button');
  },
  get speakerButton() {
    delete this.speakerButton;
    return this.speakerButton = document.getElementById('speaker-button');
  },
  get keypadButton() {
    delete this.keypadButton;
    return this.keypadButton = document.getElementById('keypad-button');
  },
  get keypadView() {
    delete this.keypadView;
    return this.keypadView = document.getElementById('kb-keypad');
  },

  toggleScreen: function ch_toggleScreen() {
    var callScreen = this.screen;
    callScreen.classList.remove('animate');
    callScreen.classList.toggle('prerender');

    var displayed = this._displayed;
    // hardening against the unavailability of MozAfterPaint
    var finished = false;

    var finishTransition = function ch_finishTransition() {
      if (finished)
        return;

      if (securityTimeout) {
        clearTimeout(securityTimeout);
        securityTimeout = null;
      }

      finished = true;

      window.setTimeout(function cs_transitionNextLoop() {
        callScreen.classList.add('animate');
        callScreen.classList.toggle('displayed');
        callScreen.classList.toggle('prerender');

        callScreen.addEventListener('transitionend', function trWait() {
          callScreen.removeEventListener('transitionend', trWait);

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
    this.muteButton.classList.toggle('mute');
    navigator.mozTelephony.muted = !navigator.mozTelephony.muted;
  },

  toggleKeypad: function ch_toggleKeypad() {
    this.keypadButton.classList.toggle('displayed');
    this.keypadView.classList.toggle('overlay');
  },

  toggleSpeaker: function ch_toggleSpeaker() {
    this.speakerButton.classList.toggle('speak');
    navigator.mozTelephony.speakerEnabled =
      !navigator.mozTelephony.speakerEnabled;
  },

  lookupContact: function och_lookupContact(number) {
    Contacts.findByNumber(number, (function(contact) {
      this.numberView.innerHTML = contact.name;
    }).bind(this));
  },

  execute: function och_execute(action) {
    if (!this[action]) {
      this.end();
      return;
    }

    this[action]();
  }
};

window.addEventListener('load', function callSetup(evt) {
  window.removeEventListener('load', callSetup);
  OnCallHandler.setup();
  KeyHandler.init();
});
