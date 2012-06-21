'use strict';

var kFontStep = 4;
var kMinFontSize = 12;

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

  get phoneNumberViewContainer() {
    delete this.phoneNumberViewContainer;
    return this.phoneNumberViewContainer =
      document.getElementById('phone-number-view-container');

  },

  get kbKeypad() {
    delete this.kbKeypad;
    return this.kbKeypad = document.getElementById('kb-keypad');
  },

  get kbCallBarAddContact() {
    delete this.kbCallBarAddContact;
    return this.kbCallBarAddContact =
      document.getElementById('kb-callbar-add-contact');
  },

  get kbCallBarCallAction() {
    delete this.kbCallBarCallAction;
    return this.kbCallBarCallAction =
      document.getElementById('kb-callbar-call-action');
  },

  get kbDelete() {
    delete this.kbDelete;
    return this.kbDelete = document.getElementById('kb-delete');
  },

  get kbCallBarBackAction() {
    delete this.kbCallBarBackAction;
    return this.kbCallBarBackAction =
      document.getElementById('kb-callbar-back-action');
  },

  init: function kh_init() {

    //Clean previous values in phone number
    this.phoneNumberView.value = '';
    this._phoneNumber = '';

    // Add listeners
    this.kbKeypad.addEventListener(
      'mousedown', this.keyHandler, true);
    this.kbKeypad.addEventListener(
      'mouseup', this.keyHandler, true);
    this.kbCallBarAddContact.addEventListener(
      'mouseup', this.addContact, false);
    this.kbCallBarCallAction.addEventListener(
      'mouseup', this.makeCall, false);
    this.kbDelete.addEventListener(
      'mousedown', this.deleteDigit, false);
    this.kbDelete.addEventListener(
      'mouseup', this.deleteDigit, false);
    this.kbCallBarBackAction.addEventListener(
      'mouseup', this.callbarBackAction, false);

    //Start Player of sounds in dialer
    TonePlayer.init();

    //Update UI properly
    this.render('default');

  },

  /*
   * Method which manage caret to last position.
   */
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
      case 'keyPadVisibleDuringCall':
        KeypadManager.kbCallBarCallAction.classList.add('hide');
        KeypadManager.kbCallBarAddContact.classList.add('hide');
        KeypadManager.kbDelete.classList.add('hide');
        KeypadManager.kbCallBarBackAction.classList
          .remove('hide');
        break;
      case 'default':
        // Default layout.
        KeypadManager.kbCallBarCallAction.classList
          .remove('hide');
        KeypadManager.kbCallBarAddContact.classList
          .remove('hide');
        KeypadManager.kbDelete.classList.remove('hide');
        KeypadManager.kbCallBarBackAction.classList
          .add('hide');
        break;
    }
  },

  /*
   * Method which delete a digit/all digits from screen.
   *   It depends on "Hold action".
   * Hold functionality is based on two var: hold_timer,hold_active.
   */
  deleteDigit: function hk_deleteDigit(event) {
    //We stop bubbling propagation
    event.stopPropagation();

    //Depending of the event type
    if (event.type == 'mousedown') {
      //Start holding event management
      KeypadManager._hold_timer = setTimeout(function() {
        // After .400s we consider that is a "Hold action"
        KeypadManager._hold_active = true;
      },400);
    }else if (event.type == 'mouseup') {
      //In is a "Hold action" end
      if (KeypadManager._hold_active) {
        //We delete all digits

        KeypadManager._phoneNumber = '';
      }else {
        //Delete last digit
        KeypadManager._phoneNumber = KeypadManager._phoneNumber.slice(0, -1);

      }

      KeypadManager.phoneNumberView.value =
        KeypadManager._phoneNumber;
      KeypadManager.moveCaretToEnd(
        KeypadManager.phoneNumberView);
      //We set to default var involved in "Hold event" management
      clearTimeout(KeypadManager._hold_timer);
      KeypadManager._hold_active = false;
    }
  },

  /*
   * Method that retrieves phone number and makes a phone call
   */
  makeCall: function hk_makeCall(event) {
    //Stop bubbling propagation
    event.stopPropagation();
    //If is not empty --> Make call
    if (KeypadManager._phoneNumber != '') {
      CallHandler.call(KeypadManager._phoneNumber);
    }
  },

  /*
   * Method that add phone number to contact list
   */
  addContact: function hk_addContact(event) {

    //TODO Create the request to the contacts app

  },
  /*
   * Method executed when the user clicks on the button to close the dialpad.
   */
  callbarBackAction: function hk_callbarBackAction(event) {
    // document.getElementById('call-screen').classList.add('call-screen-show');
    CallScreen.toggleKeypad();
  },
  /*
   * Method which handle keypad actions
   */
  keyHandler: function hk_keyHandler(event) {

    if (event.target.getAttribute('data-value') != null) {
      var key = event.target.getAttribute('data-value');
    }else if (event.target.parentNode.getAttribute('data-value') != null) {
      var key = event.target.parentNode.getAttribute('data-value');
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
        KeypadManager._hold_timer = setTimeout(function() {
          KeypadManager._hold_active = true;
        },400);
          }
        }else if (event.type == 'mouseup') {
          if (key == '0') {
            if (KeypadManager._hold_active) {
              KeypadManager._phoneNumber += '+';
            }else {
              KeypadManager._phoneNumber += key;
            }
          }else {
            KeypadManager._phoneNumber += key;
          }
          KeypadManager.phoneNumberView.value =
            KeypadManager._phoneNumber;
          KeypadManager.moveCaretToEnd(
            KeypadManager.phoneNumberView);
          //We set to default var involved in "Hold event" management
          clearTimeout(KeypadManager._hold_timer);
          KeypadManager._hold_active = false;
        }

      }

  },
};
