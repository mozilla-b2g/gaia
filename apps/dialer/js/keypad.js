'use strict';

var kFontStep = 4;
var minFontSize = 12;
var maxNumberOfDigits;
var ocMaxNumberOfDigits;

// Frequencies comming from http://en.wikipedia.org/wiki/Telephone_keypad
var gTonesFrequencies = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};

var keypadSoundIsEnabled = true;
SettingsListener.observe('phone.ring.keypad', true, function(value) {
  keypadSoundIsEnabled = !!value;
});

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

var KeypadManager = {
  _phoneNumber: '',

  get phoneNumberView() {
    delete this.phoneNumberView;
    return this.phoneNumberView = document.getElementById('phone-number-view');
  },

  get fakePhoneNumberView() {
    delete this.fakePhoneNumberView;
    return this.fakePhoneNumberView =
      document.getElementById('fake-phone-number-view');
  },

  get phoneNumberViewContainer() {
    delete this.phoneNumberViewContainer;
    return this.phoneNumberViewContainer =
      document.getElementById('phone-number-view-container');
  },

  get keypad() {
    delete this.keypad;
    return this.keypad = document.getElementById('keypad');
  },

  get callBar() {
    delete this.callBar;
    return this.callBar =
      document.getElementById('keypad-callbar');
  },

  get hideBar() {
    delete this.hideBar;
    return this.hideBar = document.getElementById('keypad-hidebar');
  },

  get callBarAddContact() {
    delete this.callBarAddContact;
    return this.callBarAddContact =
      document.getElementById('keypad-callbar-add-contact');
  },

  get callBarCallAction() {
    delete this.callBarCallAction;
    return this.callBarCallAction =
      document.getElementById('keypad-callbar-call-action');
  },

  get deleteButton() {
    delete this.deleteButton;
    return this.deleteButton = document.getElementById('keypad-delete');
  },

  get hideBarHangUpAction() {
    delete this.hideBarHangUpAction;
    return this.hideBarHangUpAction =
      document.getElementById('keypad-hidebar-hang-up-action-wrapper');
  },

  get hideBarHideAction() {
    delete this.hideBarHideAction;
    return this.hideBarHideAction =
      document.getElementById('keypad-hidebar-hide-keypad-action');
  },

  get contactPrimaryInfo() {
    delete this.contactPrimaryInfo;
    return this.contactPrimaryInfo =
      document.getElementById('contact-primary-info');
  },

  init: function kh_init() {

    // Update the minimum phone number phone size.
    // The UX team states that the minimum font size should be
    // 10pt. First off, we convert it to px multiplying it 0.226 times,
    // then we convert it to rem multiplying it a number of times equal
    // to the font-size property of the body element.
    minFontSize = parseInt(parseInt(window
      .getComputedStyle(document.body, null)
      .getPropertyValue('font-size')) * 10 * 0.226);

    this.phoneNumberView.value = '';
    this._phoneNumber = '';

    this.keypad.addEventListener('mousedown',
                                   this.keyHandler.bind(this), true);
    this.keypad.addEventListener('mouseup', this.keyHandler.bind(this), true);
    if (this.callBarAddContact) {
      this.callBarAddContact.addEventListener('mouseup', this.addContact);
      this.callBarCallAction.addEventListener('mouseup', this.makeCall);
    }
    this.deleteButton.addEventListener('mousedown',
      this.deleteDigit.bind(this));
    this.deleteButton.addEventListener('mouseup', this.deleteDigit.bind(this));
    // The keypad hide bar is only included in the on call version of the
    // keypad.
    if (this.hideBarHideAction) {
      this.hideBarHideAction.addEventListener('mouseup',
                                               this.callbarBackAction);
    }
    if (this.hideBarHangUpAction) {
      this.hideBarHangUpAction.addEventListener(
        'mouseup', this.hangUpCallFromKeypad);
    }

    TonePlayer.init();

    this.render('default');

  },

  moveCaretToEnd: function hk_util_moveCaretToEnd(el) {
    if (typeof el.selectionStart == 'number') {
      el.selectionStart = el.selectionEnd = el.value.length;
    } else if (typeof el.createTextRange != 'undefined') {
      el.focus();
      var range = el.createTextRange();
      range.collapse(false);
      range.select();
    }
  },

  render: function hk_render(layout_type) {
    switch (layout_type) {
      case 'oncall':
        this.phoneNumberViewContainer.classList.add('keypad-visible');
        if (this.callBar) {
          this.callBar.classList.add('hide');
        }
        this.deleteButton.classList.add('hide');
        this.hideBar.classList.remove('hide');
        break;
      case 'default':
        this.phoneNumberViewContainer.classList.remove('keypad-visible');
        this.hideBar.classList.add('hide');
        if (this.callBar) {
          this.callBar.classList.remove('hide');
        }
        this.deleteButton.classList.remove('hide');
        break;
    }
  },

  /*
   * Method which delete a digit/all digits from screen.
   *   It depends on "Hold action".
   * Hold functionality is based on two var: hold_timer,hold_active.
   */
  deleteDigit: function hk_deleteDigit(event) {
    // We stop bubbling propagation
    event.stopPropagation();

    // Depending of the event type
    if (event.type == 'mousedown') {
      // Start holding event management
      this._hold_timer = setTimeout(function(self) {
        // After .400s we consider that is a "Hold action"
        self._hold_active = true;
      }, 400, this);
    } else if (event.type == 'mouseup') {
      // In is a "Hold action" end
      if (this._hold_active) {
        this._phoneNumber = '';
      } else {
        this._phoneNumber = this._phoneNumber.slice(0, -1);
      }

      // If there are no digits in the phone number, hide the delete
      // button.
      if ((this._phoneNumber.length == 0) && (typeof CallScreen == 'undefined')) {
        this.deleteButton.classList.remove('show');
      }
      this.phoneNumberView.value = this._phoneNumber;
      this.moveCaretToEnd(this.phoneNumberView);

      clearTimeout(this._hold_timer);
      this._hold_active = false;

      this.updateFontSize('dialpad');
    }
  },

  makeCall: function hk_makeCall(event) {
    event.stopPropagation();

    if (KeypadManager._phoneNumber != '') {
      CallHandler.call(KeypadManager._phoneNumber);
    }
  },

  addContact: function hk_addContact(event) {
    //TODO Create the request to the contacts app
  },

  callbarBackAction: function hk_callbarBackAction(event) {
    CallScreen.toggleKeypad();
  },

  hangUpCallFromKeypad: function hk_hangUpCallFromKeypad(event) {
    CallScreen.views.classList.remove('show');
    OnCallHandler.end();
  },

  formatPhoneNumber: function kh_formatPhoneNumber(mode, view, phoneNumber) {
    if (view.style.fontSize == (minFontSize + 'px')) {
      switch (mode) {
        case 'dialpad':
          if (!maxNumberOfDigits) {
            maxNumberOfDigits = view.value.length;
          }
          if (phoneNumber.length >= maxNumberOfDigits) {
            phoneNumber = '...' + phoneNumber.substr(-(maxNumberOfDigits - 2));
          }
        break;
        case 'on-call':
          if (!ocMaxNumberOfDigits) {
            ocMaxNumberOfDigits = view.value.length;
          }
          if (phoneNumber.length >= ocMaxNumberOfDigits) {
            phoneNumber = '...' + phoneNumber
              .substr(-(ocMaxNumberOfDigits - 2));
          }
        break;
      }
    }
    return phoneNumber;
  },

  updateFontSize: function kh_updateFontSize(mode) {
    var div;
    var view;
    switch (mode) {
      case 'dialpad':
        div = this.fakePhoneNumberView;
        view = this.phoneNumberView;
      break;
      case 'on-call':
        div = CallScreen.fakeContactPrimaryInfo;
        view = CallScreen.contactPrimaryInfo;
      break;
    }
    var computedStyle = window.getComputedStyle(view, null);
    var fontSize = computedStyle.getPropertyValue('font-size');
    if (!this._initialFontSize) {
      this._initialFontSize = parseInt(fontSize);
    }

    var text = this.formatPhoneNumber(mode, view, view.value);
    view.value = text;

    var newFontSize =
      text ? this.getNextFontSize(view, div,
       parseInt(fontSize), text) : this._initialFontSize;
    if (newFontSize != fontSize)
      view.style.fontSize = newFontSize + 'px';
  },

  getNextFontSize: function kh_getNextFontSize(view, fakeView, fontSize, text) {
    var viewWidth = view.getBoundingClientRect().width;
    fakeView.style.fontSize = fontSize + 'px';
    fakeView.innerHTML = text;
    var rect = fakeView.getBoundingClientRect();
    if (rect.width > viewWidth) {
      fontSize = Math.max(fontSize - kFontStep, minFontSize);
    } else if (fontSize < this._initialFontSize) {
      fakeView.style.fontSize = (fontSize + kFontStep) + 'px';
      rect = fakeView.getBoundingClientRect();
      if (rect.width <= viewWidth)
        fontSize += kFontStep;
    }
    return fontSize;
  },

  keyHandler: function hk_keyHandler(event) {
    if (event.target.dataset.value != null) {
      var key = event.target.dataset.value;
    } else if (event.target.parentNode.dataset.value != null) {
      var key = event.target.parentNode.dataset.value;
    }

    if (key != undefined) {
      event.stopPropagation();

      if (event.type == 'mousedown') {
        if (keypadSoundIsEnabled) {
          TonePlayer.play(gTonesFrequencies[key]);
        }

        // Sending the DTMF tone
        var telephony = navigator.mozTelephony;
        if (telephony) {
          telephony.startTone(key);
          window.setTimeout(function ch_stopTone() {
            telephony.stopTone();
          }, 100);
        }

        // Manage "Hold action" in "0" key
        if (key == '0') {
          this._hold_timer = setTimeout(function(self) {
            self._hold_active = true;
          }, 400, this);
        }
      } else if (event.type == 'mouseup') {
        if (key == '0') {
          if (this._hold_active) {
            this._phoneNumber += '+';
          } else {
            this._phoneNumber += key;
          }
        } else {
          this._phoneNumber += key;
        }

        // If there are digits in the phone number, show the delete button.
        if ((this._phoneNumber.length > 0) && (typeof CallScreen == 'undefined')) {
          this.deleteButton.classList.add('show');
        }

        if (this.contactPrimaryInfo) {
          this.contactPrimaryInfo.value = this._phoneNumber;
          this.moveCaretToEnd(this.contactPrimaryInfo);
          this.updateFontSize('on-call');
        } else {
          this.phoneNumberView.value = this._phoneNumber;
          this.moveCaretToEnd(this.phoneNumberView);
          this.updateFontSize('dialpad');
        }

        clearTimeout(this._hold_timer);
        this._hold_active = false;
      }
    }
  }
};
