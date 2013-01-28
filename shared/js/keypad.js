'use strict';

var keypadSoundIsEnabled = true;
SettingsListener.observe('phone.ring.keypad', true, function(value) {
  keypadSoundIsEnabled = !! value;
});

var BaseTonePlayer = function(config) {
  this._frequencies = config.frequencies || null; // from gTonesFrequencies
  this._sampleRate = config.sampleRate || 8000; // number of frames/sec
  this._position = config.position || null; // number of frames generated
  this._intervalID = config.intervalID || null; // id for the audio loop's setInterval
  this._stopping = config.stopping || false;
};

BaseTonePlayer.prototype = {
  init: function tp_init() {
    document.addEventListener('mozvisibilitychange',
    this.visibilityChange.bind(this));
    this.ensureAudio();
  },

  ensureAudio: function tp_ensureAudio() {
    if (this._audio) return;

    this._audio = new Audio();
    this._audio.mozAudioChannelType = 'ringer';
  },

  generateFrames: function tp_generateFrames(soundData, shortPress) {
    // To be implemented by a derived class
  },

  start: function tp_start(frequencies, shortPress) {
    // To be implemented by a derived class
  },

  stop: function tp_stop() {
    this._stopping = true;

    clearInterval(this._intervalID);
    this._intervalID = null;

    if (this._audio !== null) this._audio.src = '';
  },

  // If the app loses focus, close the audio stream. This works around an
  // issue in Gecko where the Audio Data API causes gfx performance problems,
  // in particular when scrolling the homescreen.
  // See: https://bugzilla.mozilla.org/show_bug.cgi?id=779914
  visibilityChange: function tp_visibilityChange(e) {
    if (!document.mozHidden) {
      this.ensureAudio();
    } else {
      // Reset the audio stream. This ensures that the stream is shutdown
      // *immediately*.
      this.stop();
      // Just in case stop any dtmf tone
      if (navigator.mozTelephony) {
        navigator.mozTelephony.stopTone();
      }
      delete this._audio;
    }
  }
};

var BaseKeypadManager = function _KeypadManager(config) {
  this._phoneNumber = config._phoneNumber || '';
  this._onCall = false;
  this._MAX_FONT_SIZE_DIAL_PAD = 18;
  this._MAX_FONT_SIZE_ON_CALL = 16;
};

BaseKeypadManager.kFontStep = 4;

// Frequencies comming from http://en.wikipedia.org/wiki/Telephone_keypad
BaseKeypadManager.gTonesFrequencies = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};

BaseKeypadManager.prototype = {
  get phoneNumberView() {
    return document.getElementById('phone-number-view');
  },

  get fakePhoneNumberView() {
    return document.getElementById('fake-phone-number-view');
  },

  get phoneNumberViewContainer() {
    return document.getElementById('phone-number-view-container');
  },

  get keypad() {
    return document.getElementById('keypad');
  },

  get callBar() {
    return document.getElementById('keypad-callbar');
  },

  get hideBar() {
    return document.getElementById('keypad-hidebar');
  },

  get callBarAddContact() {
    return document.getElementById('keypad-callbar-add-contact');
  },

  get callBarCallAction() {
    return document.getElementById('keypad-callbar-call-action');
  },

  get callBarCancelAction() {
    return document.getElementById('keypad-callbar-cancel');
  },

  get deleteButton() {
    return document.getElementById('keypad-delete');
  },

  get hideBarHangUpAction() {
    return document.getElementById('keypad-hidebar-hang-up-action-wrapper');
  },

  get hideBarHideAction() {
    return document.getElementById('keypad-hidebar-hide-keypad-action');
  },

  init: function kh_init(oncall) {
    this._onCall = !! oncall;

    // Update the minimum phone number phone size.
    // The UX team states that the minimum font size should be
    // 10pt. First off, we convert it to px multiplying it 0.226 times,
    // then we convert it to rem multiplying it a number of times equal
    // to the font-size property of the body element.
    var defaultFontSize = window.getComputedStyle(document.body, null).getPropertyValue('font-size');
    this.minFontSize = parseInt(parseInt(defaultFontSize) * 10 * 0.226);
    this.maxFontSize = this._onCall ? parseInt(parseInt(defaultFontSize) * this._MAX_FONT_SIZE_ON_CALL * 0.226) : parseInt(parseInt(defaultFontSize) * this._MAX_FONT_SIZE_DIAL_PAD * 0.226);

    this.phoneNumberView.value = '';
    this._phoneNumber = '';

    var keyHandler = this.keyHandler.bind(this);
    this.keypad.addEventListener('mousedown', keyHandler, true);
    this.keypad.addEventListener('mouseup', keyHandler, true);
    this.keypad.addEventListener('mouseleave', keyHandler, true);
    this.deleteButton.addEventListener('mousedown', keyHandler);
    this.deleteButton.addEventListener('mouseup', keyHandler);

    // The keypad add contact bar is only included in the normal version of
    // the keypad.
    if (this.callBarAddContact) {
      this.callBarAddContact.addEventListener('click',
      this.addContact.bind(this));
    }

    // The keypad call bar is only included in the normal version and
    // the emergency call version of the keypad.
    if (this.callBarCallAction) {
      this.callBarCallAction.addEventListener('click',
      this.makeCall.bind(this));
    }

    // The keypad cancel bar is only the emergency call version of the keypad.
    if (this.callBarCancelAction) {
      this.callBarCancelAction.addEventListener('click', function() {
        window.parent.LockScreen.switchPanel();
      });
    }

    // The keypad hide bar is only included in the on call version of the
    // keypad.
    if (this.hideBarHideAction) {
      this.hideBarHideAction.addEventListener('click',
      this.callbarBackAction);
    }

    if (this.hideBarHangUpAction) {
      this.hideBarHangUpAction.addEventListener('click',
      this.hangUpCallFromKeypad);
    }

    TonePlayer.init();

    this.render();
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

  render: function hk_render(layoutType) {
    // To be implemented by a derived class
  },

  makeCall: function hk_makeCall(event) {
    event.stopPropagation();

    if (this._phoneNumber != '') {
      CallHandler.call(this._phoneNumber);
    }
  },

  addContact: function hk_addContact(event) {
    var number = this._phoneNumber;
    if (!number) return;

    try {
      new MozActivity({
        name: 'new',
        data: {
          type: 'webcontacts/contact',
          params: {
            'tel': number
          }
        }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },

  callbarBackAction: function hk_callbarBackAction(event) {
    CallScreen.hideKeypad();
  },

  hangUpCallFromKeypad: function hk_hangUpCallFromKeypad(event) {
    // To be implemented by a derived class
  },

  formatPhoneNumber: function kh_formatPhoneNumber() {
    // To be implemented by a derived class
  },

  addEllipsis: function kh_addEllipsis(view, fakeView, ellipsisSide) {
    // To be implemented by a derived class
  },

  getNextFontSize: function kh_getNextFontSize(view, fakeView) {
    // To be implemented by a derived class
  },

  keyHandler: function kh_keyHandler(event) {
    // To be implemented by a derived class
  },

  updateAddContactStatus: function kh_updateAddContactStatus() {
    if (this._phoneNumber.length === 0)
      this.callBarAddContact.classList.add('disabled');
    else
      this.callBarAddContact.classList.remove('disabled');
  },

  updatePhoneNumber: function kh_updatePhoneNumber() {
    // To be implemented by a derived class
  },

  _updatePhoneNumberView: function kh_updatePhoneNumberview() {
    // To be implemented by a derived class
  },

  _callVoicemail: function kh_callVoicemail() {
    // To be implemented by a derived class
  }
};
