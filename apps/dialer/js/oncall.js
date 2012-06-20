'use strict';

var CallUI = {
  _ticker: null,
  init: function cm_init() {
    //Add events to our DOM
    document.getElementById('mute').addEventListener(
      'mouseup', OnCallHandler.toggleMute, false);
    document.getElementById('keypad-visibility').addEventListener(
      'mouseup', OnCallHandler.toggleKeypad, false);
    document.getElementById('speaker').addEventListener(
      'mouseup', OnCallHandler.toggleSpeaker, false);
    document.getElementById('co-basic-answer').addEventListener(
      'mouseup', OnCallHandler.answer, false);
    document.getElementById('co-basic-reject').addEventListener(
      'mouseup', OnCallHandler.end, false);
  },
  update: function cm_update(phone_number) {
    //Updating phone number in screen
    document.getElementById('cs-h-info-primary').innerHTML = phone_number;
    KeypadManager.phoneNumber = phone_number;
    document.getElementById('phone-number-view').value =
      KeypadManager.phoneNumber;
    KeypadManager.util.moveCaretToEnd(
      document.getElementById('phone-number-view'));
  },
  startTimer: function cm_startTimer() {
    this._ticker = setInterval(function cm_updateTimer(self, startTime) {
      var elapsed = new Date(Date.now() - startTime);
      document.getElementById('call-duration').innerHTML = elapsed.toLocaleFormat('%M:%S');
    }, 1000, this, Date.now());
  },
  clearTimer: function cm_clearTimer() {
    if (this._ticker)
      clearInterval(this._ticker);
  },
  render: function cm_render(layout_type) {
    switch (layout_type) {
      case 'outgoing':
        document.getElementById('call-duration').innerHTML = '...';
        document.getElementById('co-basic-answer').classList.add('hide');
        document.getElementById('co-advanced').classList.remove('transparent');
        document.getElementById('keypad-visibility').setAttribute(
          'disabled', 'disabled');
        break;
      case 'incoming':
        document.getElementById('co-basic-answer').classList.remove('hide');
        document.getElementById('co-advanced').classList.add('transparent');
        document.getElementById('call-duration').innerHTML = '';
        break;
      case 'connected':
        //TODO Review of using "toggle" despite of "contains"+add/remove
        if (!document.getElementById('co-basic-answer')
          .classList.contains('hide')) {
          document.getElementById('co-basic-answer').classList.add('hide');
        }
        if (!document.getElementById('co-basic-answer').classList
          .contains('transparent')) {
          document.getElementById('co-advanced').classList.remove(
            'transparent');
        }

        document.getElementById('keypad-visibility').removeAttribute(
          'disabled');
        document.getElementById('call-duration').innerHTML = '00:00';

        break;
    }
  },
  ui: {
    show: function cm_show() {
      document.getElementById('call-screen').classList.add('call-screen-show');
    },
    hide: function cm_hide() {
      CallUI.update(KeypadManager.phoneNumber);

      document.getElementById('views').classList.toggle('show');
    }
  }
};

var OnCallHandler = {
  currentCall: null,
  _screenLock: null,
  _displayed: false,

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

          CallUI.update(call.number);
          CallUI.render(typeOfCall);

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
    // When the call is connected the speaker state is reset
    // keeping in sync...
    this._syncSpeakerEnabled();

    // Update UI properly.
    CallUI.render('connected');
    CallUI.startTimer();

    this.recentsEntry.type += '-connected';

  },

  disconnected: function ch_disconnected() {

    if (this.currentCall) {
      this.currentCall.removeEventListener('statechange', this);
      this.currentCall = null;
    }

    if (this.muteButton.classList.contains('mute'))
      this.toggleMute();
    if (this.speakerButton.classList.contains('speak'))
      this.toggleSpeaker();

    CallUI.clearTimer();

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
    OnCallHandler.currentCall.answer();
  },

  end: function ch_end() {
    if (OnCallHandler.recentsEntry &&
       (OnCallHandler.recentsEntry.type.indexOf('-connected') == -1)) {
      OnCallHandler.recentsEntry.type += '-refused';
    }

    if (OnCallHandler.currentCall)
      OnCallHandler.currentCall.hangUp();

    // We're not waiting for a disconnected statechange
    // If the user touch the 'end' button we wants to get
    // out of the call-screen right away.
    OnCallHandler.disconnected();

  },

  get screen() {
    delete this.screen;
    return this.screen = document.getElementById('call-screen');
  },

  get numberView() {
    delete this.numberView;
    return this.numberView = document.getElementById('call-number-view');
  },
  get muteButton() {
    delete this.muteButton;
    return this.muteButton = document.getElementById('mute');
  },
  get speakerButton() {
    delete this.speakerButton;
    return this.speakerButton = document.getElementById('speaker');
  },

  toggleScreen: function ch_toggleScreen() {

    var callScreen = OnCallHandler.screen;
    callScreen.classList.remove('animate');
    callScreen.classList.toggle('prerender');

    var displayed = OnCallHandler._displayed;
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

    OnCallHandler._displayed = !OnCallHandler._displayed;
  },

  toggleMute: function ch_toggleMute() {
    OnCallHandler.muteButton.classList.toggle('mute');
    navigator.mozTelephony.muted = !navigator.mozTelephony.muted;
  },

  toggleKeypad: function ch_toggleKeypad() {

    //Render keyboard properly
    KeypadManager.render(1);
    //Show it hidding call screen
    CallUI.ui.hide();

  },

  toggleSpeaker: function ch_toggleSpeaker() {
    OnCallHandler.speakerButton.classList.toggle('speak');
    navigator.mozTelephony.speakerEnabled =
      !navigator.mozTelephony.speakerEnabled;
  },

  lookupContact: function och_lookupContact(number) {
    Contacts.findByNumber(number, function lookupContact(contact) {
      CallUI.update(contact.name);
    });
  },

  _syncSpeakerEnabled: function och_syncSpeakerEnabled() {
    if (navigator.mozTelephony.speakerEnabled) {
      this.speakerButton.classList.add('speak');
    } else {
      this.speakerButton.classList.remove('speak');
    }
  }

};

window.addEventListener('load', function callSetup(evt) {
  window.removeEventListener('load', callSetup);
  KeypadManager.init();
  CallUI.init();
  OnCallHandler.setup();
});
