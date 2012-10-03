'use strict';

var CallHandler = {
  _call: null,
  _telephony: window.navigator.mozTelephony,

  call: function ch_call(number) {
    var sanitizedNumber = number.replace(/-/g, '');
    var telephony = this._telephony;
    if (telephony) {
      this._call = telephony.dialEmergency(sanitizedNumber);
      var call = this._call;
      if (call) {
        var cb = function clearPhoneView() {
          KeypadManager.updatePhoneNumber('');
        };
        call.onconnected = cb;

        call.ondisconnected = function callEnded() {
          cb();
          CallScreen.hide();
        };

        CallScreen.number = call.number;
        CallScreen.show();
      }
    }
  },

  end: function ch_end() {
    if (!this._call) {
      CallScreen.hide();
      return;
    }

    this._call.hangUp();
    this._call = null;
  },

  toggleSpeaker: function ch_toggleSpeaker() {
    this._telephony.speakerEnabled = !this._telephony.speakerEnabled;
  }
};

var CallScreen = {
  screen: document.getElementById('call-screen'),
  numberView: document.getElementById('emergency-number'),

  hangUpButton: document.getElementById('callbar-hang-up'),
  speakerButton: document.getElementById('speaker'),

  set number(value) {
    this.numberView.textContent = value;
  },

  init: function cs_init() {
    this.hangUpButton.addEventListener('mouseup',
                                       CallHandler.end.bind(CallHandler));
    this.speakerButton.addEventListener('click', this.toggleSpeaker.bind(this));
  },

  show: function cs_show() {
    this.screen.classList.add('displayed');
  },

  hide: function cs_hide() {
    this.screen.classList.remove('displayed');
  },

  toggleSpeaker: function cs_toggleSpeaker() {
    this.speakerButton.classList.toggle('speak');
    CallHandler.toggleSpeaker();
  }
};

window.addEventListener('load', function onload() {
  window.removeEventListener('load', onload);
  KeypadManager.init();
  CallScreen.init();
});
