'use strict';

var kFontStep = 8;
var kMinFontSize = 12;

// Frequencies comming from http://en.wikipedia.org/wiki/Telephone_keypad
var gTonesFrequencies = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};

var TonePlayer = {
  _sampleRate: 4000,

  init: function tp_init() {
   this._audio = new Audio();
   this._audio.mozSetup(2, this._sampleRate);
  },

  generateFrames: function tp_generateFrames(soundData, freqRow, freqCol) {
    var currentSoundSample = 0;
    var kr = 2 * Math.PI * freqRow / this._sampleRate;
    var kc = 2 * Math.PI * freqCol / this._sampleRate;
    for (var i = 0; i < soundData.length; i += 2) {
      var smoother = 0.5 + (Math.sin((i * Math.PI) / soundData.length)) / 2;

      soundData[i] = Math.sin(kr * currentSoundSample) * smoother;
      soundData[i + 1] = Math.sin(kc * currentSoundSample) * smoother;

      currentSoundSample++;
    }
  },

  play: function tp_play(frequencies) {
    var soundDataSize = this._sampleRate / 4;
    var soundData = new Float32Array(soundDataSize);
    this.generateFrames(soundData, frequencies[0], frequencies[1]);
    this._audio.mozWriteAudio(soundData);
  }
};

var KeyHandler = {
  get phoneNumber() {
    delete this.phoneNumber;
    return this.phoneNumber = document.getElementById('phone-number');
  },

  get fakePhoneNumberView() {
    delete this.fakePhoneNumberView;
    return this.fakePhoneNumberView =
      document.getElementById('fake-phone-number-view');
  },

  get phoneNumberView() {
    delete this.phoneNumberView;
    return this.phoneNumberView = document.getElementById('phone-number-view');
  },

  init: function kh_init() {
    if (this.phoneNumer)
      this.phoneNumber.value = '';

    TonePlayer.init();
  },

  isContactShortcut: function kh_isContactShortcut(key) {
    // TODO implement key shortcuts
    return false;
  },

  formatPhoneNumber: function kh_formatPhoneNumber(phoneNumber) {
    // TODO implement formatting depending on locale
    return phoneNumber;
  },

  updateFontSize: function kh_updateFontSize() {
    var self = this;
    function getNextFontSize(fontSize, text) {
      var div = self.fakePhoneNumberView;
      div.style.fontSize = fontSize + 'px';
      div.innerHTML = text;

      var viewWidth = self.phoneNumberView.getBoundingClientRect().width;
      var rect = div.getBoundingClientRect();
      if (rect.width > viewWidth) {
        fontSize = Math.max(fontSize - kFontStep, kMinFontSize);
      } else if (fontSize < self._initialFontSize) {
        div.style.fontSize = (fontSize + kFontStep) + 'px';
        rect = div.getBoundingClientRect();
        if (rect.width <= viewWidth)
          fontSize += kFontStep;
      }

      return fontSize;
    }

    var view = this.phoneNumberView;
    var computedStyle = window.getComputedStyle(view, null);
    var fontSize = computedStyle.getPropertyValue('font-size');
    if (!this._initialFontSize) {
      this._initialFontSize = parseInt(fontSize);
    }

    var text = this.formatPhoneNumber(this.phoneNumber.value);
    view.innerHTML = text;

    var newFontSize =
      text ? getNextFontSize(parseInt(fontSize), text) : this._initialFontSize;
    if (newFontSize != fontSize)
    view.style.fontSize = newFontSize + 'px';
  },

  keyDown: function kh_keyDown(event) {
    var key = event.target.getAttribute('data-value');
    if (!key)
      return;

    var callback = function(self) {
      switch (key) {
        case '0':
          self.phoneNumber.value = self.phoneNumber.value.slice(0, -1) + '+';
          break;
        case '*':
          self.phoneNumber.value = self.phoneNumber.value.slice(0, -1) + '#';
          break;
        case 'del-digit':
          self.phoneNumber.value = '';
          break;
        default:
          if (self.isContactShortcut(key))
            return;
          break;
      }
      self.updateFontSize();
    };

    if (key == 'del-digit') {
      this.phoneNumber.value = KeyHandler.phoneNumber.value.slice(0, -1);
      this.updateFontSize();
    } else if (key == 'make-call') {
      // TODO: update the call button style to show his availability
      if (this.phoneNumber.value != '') {
        CallHandler.call(this.phoneNumber.value);
      }
    } else {
      if (this.phoneNumber) {
        this.phoneNumber.value += key;
        this.updateFontSize();
      }

      TonePlayer.play(gTonesFrequencies[key]);

      // Sending the DTMF tone
      var telephony = navigator.mozTelephony;
      if (telephony) {
        telephony.startTone(key);
        window.setTimeout(function ch_stopTone() {
          telephony.stopTone();
        }, 100);
      }
    }

    this._timeout = window.setTimeout(callback, 400, this);
  },

  keyUp: function kh_keyUp(event) {
    clearTimeout(this._timeout);
  }
};
