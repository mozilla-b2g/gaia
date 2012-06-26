'use strict';

var kFontStep = 4;
var kMinFontSize = 12;
var kMaxNumberOfDigits;
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

  get csHInfoPrimary() {
    delete this.csHInfoPrimary;
    return this.csHInfoPrimary = document.getElementById('cs-h-info-primary');
  },

  get fakeCsHInfoPrimary() {
    delete this.fakeCsHInfoPrimary;
    return this.fakeCsHInfoPrimary =
      document.getElementById('fake-cs-h-info-primary');
  },

  get phoneNumberViewContainer() {
    delete this.phoneNumberViewContainer;
    return this.phoneNumberViewContainer =
      document.getElementById('phone-number-view-container');
  },

  get kbKeypad() {
    delete this.kbKeypad;
    return this.kbKeypad = document.getElementById('keypad');
  },

  get kbCallBar() {
    delete this.kbCallBar;
    return this.kbCallBar =
      document.getElementById('keypad-callbar');
  },

  get kbHideBar() {
    delete this.kbHideBar;
    return this.kbHideBar = document.getElementById('keypad-hidebar');
  },

  get kbCallBarAddContact() {
    delete this.kbCallBarAddContact;
    return this.kbCallBarAddContact =
      document.getElementById('keypad-callbar-add-contact');
  },

  get kbCallBarCallAction() {
    delete this.kbCallBarCallAction;
    return this.kbCallBarCallAction =
      document.getElementById('keypad-callbar-call-action');
  },

  get kbDelete() {
    delete this.kbDelete;
    return this.kbDelete = document.getElementById('keypad-delete');
  },

  get kbHideBarHangUpAction() {
    delete this.kbHideBarHangUpAction;
    return this.kbHideBarHangUpAction =
      document.getElementById('keypad-hidebar-hang-up-action-wrapper');
  },

  get kbHideBarHideAction() {
    delete this.kbHideBarHideAction;
    return this.kbHideBarHideAction =
      document.getElementById('keypad-hidebar-hide-keypad-action');
  },

  get contactPrimaryInfo() {
    delete this.contactPrimaryInfo;
    return this.contactPrimaryInfo =
      document.getElementById('cs-h-info-primary');
  },

  init: function kh_init() {

    // Update the minimum phone number phone size.
    kMinFontSize = parseInt(parseInt(window
      .getComputedStyle(document.body, null)
      .getPropertyValue('font-size')) * 10 * 0.226);

    this.phoneNumberView.value = '';
    this._phoneNumber = '';

    this.kbKeypad.addEventListener('mousedown',
                                   this.keyHandler.bind(this), true);
    this.kbKeypad.addEventListener('mouseup', this.keyHandler.bind(this), true);
    if (this.kbCallBarAddContact) {
      this.kbCallBarAddContact.addEventListener('mouseup', this.addContact);
      this.kbCallBarCallAction.addEventListener('mouseup', this.makeCall);
    }
    this.kbDelete.addEventListener('mousedown', this.deleteDigit.bind(this));
    this.kbDelete.addEventListener('mouseup', this.deleteDigit.bind(this));
    // The keypad hide bar is only included in the on call version of the
    // keypad.
    if (this.kbHideBarHideAction) {
      this.kbHideBarHideAction.addEventListener('mouseup',
                                               this.callbarBackAction);
    }
    if (this.kbHideBarHangUpAction) {
      this.kbHideBarHangUpAction.addEventListener(
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
        if (this.kbCallBar) {
          this.kbCallBar.classList.add('hide');
        }
        this.kbDelete.classList.add('hide');
        this.kbHideBar.classList.remove('hide');
        break;
      case 'default':
        this.phoneNumberViewContainer.classList.remove('keypad-visible');
        this.kbHideBar.classList.add('hide');
        if (this.kbCallBar) {
          this.kbCallBar.classList.remove('hide');
        }
        this.kbDelete.classList.remove('hide');
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
      if (this._phoneNumber.length == 0) {
        this.kbDelete.classList.remove('show');
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
    if (view.style.fontSize == (kMinFontSize + 'px')) {
      switch (mode) {
        case 'dialpad':
          if (!kMaxNumberOfDigits) {
            kMaxNumberOfDigits = view.value.length;
          }
          if (phoneNumber.length >= kMaxNumberOfDigits) {
            phoneNumber = '...' + phoneNumber.substr(-(kMaxNumberOfDigits - 3));
          }
        break;
        case 'on-call':
          if (!ocMaxNumberOfDigits) {
            ocMaxNumberOfDigits = view.value.length;
          }
          if (phoneNumber.length >= ocMaxNumberOfDigits) {
            phoneNumber = '...' + phoneNumber
              .substr(-(ocMaxNumberOfDigits - 3));
          }
        break;
      }
    }
    return phoneNumber;
  },

  updateFontSize: function kh_updateFontSize(mode) {
    var self = this;
    var div;
    var view;
    var viewWidth;
    switch (mode) {
      case 'dialpad':
        div = self.fakePhoneNumberView;
        view = self.phoneNumberView;
        viewWidth = view.getBoundingClientRect().width;
      break;
      case 'on-call':
        div = self.fakeCsHInfoPrimary;
        view = self.csHInfoPrimary;
        viewWidth = view.getBoundingClientRect().width;
      break;
    }

    function getNextFontSize(fontSize, text) {
      div.style.fontSize = fontSize + 'px';
      div.innerHTML = text;
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

    var computedStyle = window.getComputedStyle(view, null);
    var fontSize = computedStyle.getPropertyValue('font-size');
    if (!this._initialFontSize) {
      this._initialFontSize = parseInt(fontSize);
    }

    var text = this.formatPhoneNumber(mode, view, view.value);
    view.value = text;

    var newFontSize =
      text ? getNextFontSize(parseInt(fontSize), text) : this._initialFontSize;
    if (newFontSize != fontSize)
      view.style.fontSize = newFontSize + 'px';
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
        if (this._phoneNumber.length > 0) {
          this.kbDelete.classList.add('show');
        }

        this.phoneNumberView.value = this._phoneNumber;
        this.moveCaretToEnd(this.phoneNumberView);
        if (this.contactPrimaryInfo) {
          this.contactPrimaryInfo.value = this._phoneNumber;
          this.moveCaretToEnd(this.contactPrimaryInfo);
          this.updateFontSize('on-call');
        }

        clearTimeout(this._hold_timer);
        this._hold_active = false;

        this.updateFontSize('dialpad');
      }
    }
  }
};
