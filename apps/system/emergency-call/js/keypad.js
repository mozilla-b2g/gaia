'use strict';

var kFontStep = 4;
var minFontSize = 12;

const kMasterVolume = 0.5;
const kShortPressDuration = 0.25;

// Frequencies coming from http://en.wikipedia.org/wiki/Telephone_keypad
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
  _audioContext: null,
  _gainNode: null,

  init: function tp_init() {
    document.addEventListener('visibilitychange',
                              this.visibilityChange.bind(this));
    this.ensureAudio();
  },

  ensureAudio: function tp_ensureAudio() {
    if (this._audioContext)
      return;

    this._audioContext = new AudioContext();
    this._gainNode = this._audioContext.createGain();
    this._gainNode.gain.value = kMasterVolume;
    this._gainNode.connect(this._audioContext.destination);
  },

  play: function tp_play(frequencies) {
    var now = this._audioContext.currentTime;

    for (var i = 0; i < frequencies.length; ++i) {
      var oscNode = this._audioContext.createOscillator();
      oscNode.type = 'sine';
      oscNode.frequency.value = frequencies[i];
      oscNode.start(now);
      oscNode.stop(now + kShortPressDuration);
      oscNode.connect(this._gainNode);
    }
  },

  // If the app loses focus, close the audio stream.
  visibilityChange: function tp_visibilityChange(e) {
    if (!document.hidden) {
      this.ensureAudio();
    } else {
      // Reset the audio stream. This ensures that the stream is shutdown
      // *immediately*.
      if (this._gainNode) {
        this._gainNode.disconnect();
      }
      this._gainNode = null;
      this._audioContext = null;
    }
  }
};

var KeypadManager = {
  _phoneNumber: '',
  _onCall: false,

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

  get callBarCancelAction() {
    delete this.callBarCancelAction;
    return this.callBarCancelAction =
      document.getElementById('keypad-callbar-cancel');
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

  init: function kh_init() {
    // Update the minimum phone number phone size.
    // The UX team states that the minimum font size should be
    // 10pt. First off, we convert it to px multiplying it 0.226 times,
    // then we convert it to rem multiplying it a number of times equal
    // to the font-size property of the body element.
    var defaultFontSize = window.getComputedStyle(document.body, null)
                                .getPropertyValue('font-size');
    minFontSize = parseInt(parseInt(defaultFontSize) * 10 * 0.226);

    this.phoneNumberView.value = '';
    this._phoneNumber = '';

    var keyHandler = this.keyHandler.bind(this);
    this.keypad.addEventListener('mousedown', keyHandler, true);
    this.keypad.addEventListener('mouseup', keyHandler, true);
    this.deleteButton.addEventListener('mousedown', keyHandler);
    this.deleteButton.addEventListener('mouseup', keyHandler);

    // The keypad add contact bar is only included in the normal version of
    // the keypad.
    if (this.callBarAddContact) {
      this.callBarAddContact.addEventListener('mouseup',
                                              this.addContact.bind(this));
    }

    // The keypad add contact bar is only included in the normal version and
    // the emergency call version of the keypad.
    if (this.callBarCallAction) {
      this.callBarCallAction.addEventListener('mouseup',
                                              this.makeCall.bind(this));
    }

    // The keypad cancel bar is only the emergency call version of the keypad.
    if (this.callBarCancelAction) {
      this.callBarCancelAction.addEventListener('mouseup', function() {
        window.parent.LockScreen.switchPanel();
      });
    }

    // The keypad hide bar is only included in the on call version of the
    // keypad.
    if (this.hideBarHideAction) {
      this.hideBarHideAction.addEventListener('mouseup',
                                              this.callbarBackAction);
    }

    if (this.hideBarHangUpAction) {
      this.hideBarHangUpAction.addEventListener('mouseup',
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
    if (layoutType == 'oncall') {
      this._onCall = true;
      var numberNode = CallScreen.activeCall.querySelector('.number');
      this._phoneNumber = numberNode.textContent;
      this.phoneNumberViewContainer.classList.add('keypad-visible');
      if (this.callBar) {
        this.callBar.classList.add('hide');
      }

      if (this.hideBar) {
        this.hideBar.classList.remove('hide');
      }

      this.deleteButton.classList.add('hide');
    } else {
      this.phoneNumberViewContainer.classList.remove('keypad-visible');
      if (this.callBar) {
        this.callBar.classList.remove('hide');
      }

      if (this.hideBar) {
        this.hideBar.classList.add('hide');
      }

      this.deleteButton.classList.remove('hide');
    }
  },

  makeCall: function hk_makeCall(event) {
    event.stopPropagation();

    if (this._phoneNumber != '') {
      CallHandler.call(KeypadManager._phoneNumber);
    }
  },

  addContact: function hk_addContact(event) {
    var number = this._phoneNumber;
    if (!number)
      return;

    try {
      var activity = new MozActivity({
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
    CallScreen.views.classList.remove('show');
    OnCallHandler.end();
  },

  formatPhoneNumber: function kh_formatPhoneNumber(mode) {
    switch (mode) {
      case 'dialpad':
        var fakeView = this.fakePhoneNumberView;
        var view = this.phoneNumberView;

        // We consider the case where the delete button may have
        // been used to delete the whole phone number.
        if (view.value == '') {
          view.style.fontSize = view.dataset.size;
          return;
        }
      break;

      case 'on-call':
        var fakeView = CallScreen.activeCall.querySelector('.fake-number');
        var view = CallScreen.activeCall.querySelector('.number');
      break;
    }

    var computedStyle = window.getComputedStyle(view, null);
    var currentFontSize = computedStyle.getPropertyValue('font-size');
    if (!('size' in view.dataset)) {
      view.dataset.size = currentFontSize;
    }

    var newFontSize = this.getNextFontSize(view, fakeView,
                                           parseInt(view.dataset.size),
                                           parseInt(currentFontSize));
    view.style.fontSize = newFontSize + 'px';
    this.addEllipsis(view, fakeView, newFontSize);
  },

  addEllipsis: function kh_addEllipsis(view, fakeView, currentFontSize) {
    var viewWidth = view.getBoundingClientRect().width;
    fakeView.style.fontSize = currentFontSize + 'px';
    fakeView.innerHTML = view.value;

    var counter = 1;
    var value = view.value;

    var newPhoneNumber;
    while (fakeView.getBoundingClientRect().width > viewWidth) {
      newPhoneNumber = '\u2026' + value.substr(-value.length + counter);
      fakeView.innerHTML = newPhoneNumber;
      counter++;
    }

    if (newPhoneNumber) {
      view.value = newPhoneNumber;
    }
  },

  getNextFontSize: function kh_getNextFontSize(view, fakeView,
                                               fontSize, initialFontSize) {
    var viewWidth = view.getBoundingClientRect().width;
    fakeView.style.fontSize = fontSize + 'px';
    fakeView.innerHTML = view.value;

    var rect = fakeView.getBoundingClientRect();
    while ((rect.width > viewWidth) && (fontSize > minFontSize)) {
      fontSize = Math.max(fontSize - kFontStep, minFontSize);
      fakeView.style.fontSize = fontSize + 'px';
      rect = fakeView.getBoundingClientRect();
    }

    if ((rect.width < viewWidth) && (fontSize < initialFontSize)) {
      fakeView.style.fontSize = (fontSize + kFontStep) + 'px';
      rect = fakeView.getBoundingClientRect();
      if (rect.width <= viewWidth) {
        fontSize += kFontStep;
      }
    }
    return fontSize;
  },

  keyHandler: function kh_keyHandler(event) {
    var key = event.target.dataset.value;

    if (!key)
      return;

    event.stopPropagation();
    if (event.type == 'mousedown') {
      this._longPress = false;

      if (key != 'delete') {
        if (keypadSoundIsEnabled) {
          TonePlayer.play(gTonesFrequencies[key]);
        }

        // Sending the DTMF tone if on a call
        var telephony = navigator.mozTelephony;
        if (telephony && telephony.active &&
            telephony.active.state == 'connected') {

          telephony.startTone(key);
          window.setTimeout(function ch_stopTone() {
            telephony.stopTone();
          }, 100);

        }
      }

      // Manage long press
      if (key == '0' || key == 'delete') {
        this._holdTimer = setTimeout(function(self) {
          if (key == 'delete') {
            self._phoneNumber = '';
          } else {
            self._phoneNumber += '+';
          }

          self._longPress = true;
          self._updatePhoneNumberView();
        }, 400, this);
      }

      // Voicemail long press (needs to be longer since it actually dials)
      if (event.target.dataset.voicemail) {
        this._holdTimer = setTimeout(function vm_call(self) {
          self._longPress = true;
          self._callVoicemail();
        }, 3000, this);
      }
    } else if (event.type == 'mouseup') {
      // If it was a long press our work is already done
      if (this._longPress) {
        this._longPress = false;
        this._holdTimer = null;
        return;
      }
      if (key == 'delete') {
        this._phoneNumber = this._phoneNumber.slice(0, -1);
      } else {
        this._phoneNumber += key;
      }

      if (this._holdTimer)
        clearTimeout(this._holdTimer);

      this._updatePhoneNumberView();
    }
  },

  updatePhoneNumber: function kh_updatePhoneNumber(number) {
    this._phoneNumber = number;
    this._updatePhoneNumberView();
  },

  _updatePhoneNumberView: function kh_updatePhoneNumberview() {
    var phoneNumber = this._phoneNumber;

    // If there are digits in the phone number, show the delete button.
    var visibility = (phoneNumber.length > 0) ? 'visible' : 'hidden';
    this.deleteButton.style.visibility = visibility;

    if (this._onCall) {
      var view = CallScreen.activeCall.querySelector('.number');
      view.textContent = phoneNumber;
      this.formatPhoneNumber('on-call');
    } else {
      this.phoneNumberView.value = phoneNumber;
      this.moveCaretToEnd(this.phoneNumberView);
      this.formatPhoneNumber('dialpad');
    }
  },

  _callVoicemail: function kh_callVoicemail() {
     var voicemail = navigator.mozVoicemail;
     if (voicemail) {
       // TODO: remove this backward compatibility check
       // after bug-814634 is landed
       var number = voicemail.number ||
        voicemail.getNumber && voicemail.getNumber();

       if (number) {
         CallHandler.call(number);
       }
     }
  }
};

// Set the 'lang' and 'dir' attributes to <html> when the page is translated
window.addEventListener('localized', function showBody() {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});

