/**
 *  This code is shared between system/emergency-call/js/keypad.js
 *  and communications/dialer/js/keypad.js.
 *  Be sure to update both files when you commit!
 */

'use strict';

var kFontStep = 4;

// Frequencies coming from http://en.wikipedia.org/wiki/Telephone_keypad
var gTonesFrequencies = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};

var keypadSoundIsEnabled = false;
function observeKeypadSound() {
  SettingsListener.observe('phone.ring.keypad', false, function(value) {
    keypadSoundIsEnabled = !!value;
  });
}

if (window.SettingsListener) {
  observeKeypadSound();
} else {
  window.addEventListener('load', function onLoad() {
    window.removeEventListener('load', onLoad);
    loader.load('/shared/js/settings_listener.js', observeKeypadSound);
  });
}

var TonePlayer = {
  _frequencies: null, // from gTonesFrequencies
  _sampleRate: 8000, // number of frames/sec
  _position: null, // number of frames generated
  _intervalID: null, // id for the audio loop's setInterval
  _stopping: false,

  init: function tp_init() {
    document.addEventListener('mozvisibilitychange',
                              this.visibilityChange.bind(this));
    this.ensureAudio();
  },

  ensureAudio: function tp_ensureAudio() {
   if (this._audio)
     return;

   this._audio = new Audio();
   this._audio.volume = 0.5;
  },

  // Generating audio frames for the 2 given frequencies
  generateFrames: function tp_generateFrames(soundData, shortPress) {
    var position = this._position;

    var kr = 2 * Math.PI * this._frequencies[0] / this._sampleRate;
    var kc = 2 * Math.PI * this._frequencies[1] / this._sampleRate;

    for (var i = 0; i < soundData.length; i++) {
      // Poor man's ADSR
      // Only short press have a release phase because we don't know
      // when the long press will end
      var factor;
      if (position < 200) {
        // Attack
        factor = position / 200;
      } else if (position > 200 && position < 400) {
        // Decay
        factor = 1 - ((position - 200) / 200) * 0.3; // Decay factor
      } else if (shortPress && position > 800) {
        // Release, short press only
        factor = 0.7 - ((position - 800) / 400 * 0.7);
      } else {
        // Sustain
        factor = 0.7;
      }

      soundData[i] = (Math.sin(kr * position) +
                      Math.sin(kc * position)) / 2 * factor;
      position++;
    }

    this._position += soundData.length;
  },

  start: function tp_start(frequencies, shortPress) {
    this._frequencies = frequencies;
    this._position = 0;
    this._stopping = false;

    // Already playing
    if (this._intervalID) {
      return;
    }

    this._audio.mozSetup(1, this._sampleRate);
    this._audio.volume = 1;

    // Writing 150ms of sound (duration for a short press)
    var initialSoundData = new Float32Array(1200);
    this.generateFrames(initialSoundData, shortPress);
    this._audio.mozWriteAudio(initialSoundData);

    if (shortPress)
      return;

    // Long press support
    // Continuing playing until .stop() is called
    this._intervalID = setInterval((function audioLoop() {
      if (this._stopping)
        return;

      var soundData = new Float32Array(1200);
      this.generateFrames(soundData);
      if (this._audio != null)
        this._audio.mozWriteAudio(soundData);
    }).bind(this), 60); // Avoiding under-run issues by keeping this low
  },

  stop: function tp_stop() {
    this._stopping = true;

    clearInterval(this._intervalID);
    this._intervalID = null;

    if (this._audio != null)
      this._audio.src = '';
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

var KeypadManager = {

  _MAX_FONT_SIZE_DIAL_PAD: 18,
  _MAX_FONT_SIZE_ON_CALL: 16,

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

  init: function kh_init(oncall) {
    this._onCall = !!oncall;

    // Update the minimum phone number phone size.
    // The UX team states that the minimum font size should be
    // 10pt. First off, we convert it to px multiplying it 0.226 times,
    // then we convert it to rem multiplying it a number of times equal
    // to the font-size property of the body element.
    var defaultFontSize = window.getComputedStyle(document.body, null)
                                .getPropertyValue('font-size');
    this.minFontSize = parseInt(parseInt(defaultFontSize) * 10 * 0.226);
    this.maxFontSize = this._onCall ?
      parseInt(parseInt(defaultFontSize) * this._MAX_FONT_SIZE_ON_CALL *
        0.226) :
      parseInt(parseInt(defaultFontSize) * this._MAX_FONT_SIZE_DIAL_PAD *
        0.226);

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
    if (layoutType == 'oncall') {
      var numberNode = CallScreen.activeCall.querySelector('.number');
      this._phoneNumber = numberNode.textContent;
      var additionalContactInfoNode = CallScreen.activeCall.
        querySelector('.additionalContactInfo');
      this._additionalContactInfo = additionalContactInfoNode.textContent;
      this._isKeypadClicked = false;
      this.phoneNumberViewContainer.classList.add('keypad-visible');
      this._originalPhoneNumber = this._phoneNumber;
      this._originalAdditionalContactInfo = this._additionalContactInfo;
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
    LazyLoader.load(['/dialer/js/phone_action_menu.js'],
      function hk_showPhoneNumberActionMenu() {
        PhoneNumberActionMenu.show(null, number,
          ['new-contact', 'add-to-existent']);
    });
  },

  callbarBackAction: function hk_callbarBackAction(event) {
    CallScreen.hideKeypad();
  },

  hangUpCallFromKeypad: function hk_hangUpCallFromKeypad(event) {
    CallScreen.body.classList.remove('showKeypad');
    OnCallHandler.end();
  },

  formatPhoneNumber: function kh_formatPhoneNumber(ellipsisSide, maxFontSize) {
    if (this._onCall) {
      var fakeView = CallScreen.activeCall.querySelector('.fake-number');
      var view = CallScreen.activeCall.querySelector('.number');
    } else {
      var fakeView = this.fakePhoneNumberView;
      var view = this.phoneNumberView;

      // We consider the case where the delete button may have
      // been used to delete the whole phone number.
      if (view.value == '') {
        view.style.fontSize = this.maxFontSize;
        return;
      }
    }

    var newFontSize;
    if (maxFontSize) {
      newFontSize = this.maxFontSize;
    } else {
      newFontSize = this.getNextFontSize(view, fakeView);
    }
    view.style.fontSize = newFontSize + 'px';
    this.addEllipsis(view, fakeView, ellipsisSide);
  },

  addEllipsis: function kh_addEllipsis(view, fakeView, ellipsisSide) {
    var side = ellipsisSide || 'begin';
    LazyL10n.get(function localized(_) {
      var localizedSide;
      if (navigator.mozL10n.language.direction === 'rtl') {
        localizedSide = (side === 'begin' ? 'right' : 'left');
      } else {
        localizedSide = (side === 'begin' ? 'left' : 'right');
      }
      var computedStyle = window.getComputedStyle(view, null);
      var currentFontSize = parseInt(
        computedStyle.getPropertyValue('font-size')
      );
      var viewWidth = view.getBoundingClientRect().width;
      fakeView.style.fontSize = currentFontSize + 'px';
      fakeView.innerHTML = view.value ? view.value : view.innerHTML;

      var value = fakeView.innerHTML;

      // Guess the possible position of the ellipsis in order to minimize
      // the following while loop iterations:
      var counter = value.length -
        (viewWidth *
         (fakeView.textContent.length /
           fakeView.getBoundingClientRect().width));

      var newPhoneNumber;
      while (fakeView.getBoundingClientRect().width > viewWidth) {

        if (localizedSide == 'left') {
          newPhoneNumber = '\u2026' + value.substr(-value.length + counter);
        } else if (localizedSide == 'right') {
          newPhoneNumber = value.substr(0, value.length - counter) + '\u2026';
        }

        fakeView.innerHTML = newPhoneNumber;
        counter++;
      }

      if (newPhoneNumber) {
        if (view.value) {
          view.value = newPhoneNumber;
        } else {
          view.innerHTML = newPhoneNumber;
        }
      }
    });
  },

  getNextFontSize: function kh_getNextFontSize(view, fakeView) {
    var computedStyle = window.getComputedStyle(view, null);
    var fontSize = parseInt(computedStyle.getPropertyValue('font-size'));
    var viewWidth = view.getBoundingClientRect().width;
    var viewHeight = view.getBoundingClientRect().height;
    fakeView.style.fontSize = fontSize + 'px';
    fakeView.innerHTML = (view.value ? view.value : view.innerHTML);

    var rect = fakeView.getBoundingClientRect();

    while ((rect.width < viewWidth) && (fontSize < this.maxFontSize)) {
      fontSize = Math.min(fontSize + kFontStep, this.maxFontSize);
      fakeView.style.fontSize = fontSize + 'px';
      rect = fakeView.getBoundingClientRect();
    }

    while ((rect.width > viewWidth) && (fontSize > this.minFontSize)) {
      fontSize = Math.max(fontSize - kFontStep, this.minFontSize);
      fakeView.style.fontSize = fontSize + 'px';
      rect = fakeView.getBoundingClientRect();
    }

    return fontSize;
  },

  keyHandler: function kh_keyHandler(event) {
    var key = event.target.dataset.value;

    // We could receive this event from an element that
    // doesn't have the dataset value. Got the last key
    // pressed and assing this value to continue with the
    // proccess.
    if (!key) {
      return;
    }

    var telephony = navigator.mozTelephony;

    event.stopPropagation();
    if (event.type == 'mousedown') {
      this._longPress = false;

      if (key != 'delete') {
        if (keypadSoundIsEnabled) {
          // We do not support long press if not on a call
          TonePlayer.start(gTonesFrequencies[key], !this._onCall);
        }

        // Sending the DTMF tone if on a call
        if (this._onCall) {
          // Stop previous tone before dispatching a new one
          telephony.stopTone();
          telephony.startTone(key);
        }
      }

      // Manage long press
      if ((key == '0' && !this._onCall) || key == 'delete') {
        this._holdTimer = setTimeout(function(self) {
          if (key == 'delete') {
            self._phoneNumber = '';
          } else {
            var index = self._phoneNumber.length - 1;
            //Remove last 0, this is a long press and we want to add the '+'
            if (index >= 0 && self._phoneNumber[index] === '0') {
              self._phoneNumber = self._phoneNumber.substr(0, index);
            }
            self._phoneNumber += '+';
          }

          self._longPress = true;
          self.updateAddContactStatus();
          self._updatePhoneNumberView('begin', false);
        }, 400, this);
      }

      // Voicemail long press (needs to be longer since it actually dials)
      if (event.target.dataset.voicemail) {
        this._holdTimer = setTimeout(function vm_call(self) {
          self._longPress = true;
          self._callVoicemail();
        }, 3000, this);
      }

      if (key == 'delete') {
        this._phoneNumber = this._phoneNumber.slice(0, -1);
        this.updateAddContactStatus();
      } else if (this.phoneNumberViewContainer.classList.
          contains('keypad-visible')) {
        if (!this._isKeypadClicked) {
          this._isKeypadClicked = true;
          this._phoneNumber = key;
          this._additionalContactInfo = '';
          this._updateAdditionalContactInfoView();
        } else {
          this._phoneNumber += key;
        }
      } else {
        this._phoneNumber += key;
        this.updateAddContactStatus();
      }
      this._updatePhoneNumberView('begin', false);
    } else if (event.type == 'mouseup' || event.type == 'mouseleave') {
      // Stop playing the DTMF/tone after a small delay
      // or right away if this is a long press

      var delay = this._longPress ? 0 : 100;
      if (this._onCall) {
        if (keypadSoundIsEnabled) {
          TonePlayer.stop();
        }

        window.setTimeout(function ch_stopTone() {
          telephony.stopTone();
        }, delay);
      }

      // If it was a long press our work is already done
      if (this._longPress) {
        this._longPress = false;
        this._holdTimer = null;
        return;
      }

      if (this._holdTimer)
        clearTimeout(this._holdTimer);
    }
  },

  sanitizePhoneNumber: function(number) {
    return number.replace(/\s+/g, '');
  },

  updateAddContactStatus: function kh_updateAddContactStatus() {
    if (this._phoneNumber.length === 0)
      this.callBarAddContact.classList.add('disabled');
    else
      this.callBarAddContact.classList.remove('disabled');
  },

  updatePhoneNumber: function kh_updatePhoneNumber(number, ellipsisSide,
    maxFontSize) {
    number = this.sanitizePhoneNumber(number);
    this._phoneNumber = number;
    this._updatePhoneNumberView(ellipsisSide, maxFontSize);
  },

  _updatePhoneNumberView: function kh_updatePhoneNumberview(ellipsisSide,
    maxFontSize) {
    var phoneNumber = this._phoneNumber;

    // If there are digits in the phone number, show the delete button.
    if (!this._onCall) {
      var visibility = (phoneNumber.length > 0) ? 'visible' : 'hidden';
      this.deleteButton.style.visibility = visibility;
    }

    if (this._onCall) {
      var view = CallScreen.activeCall.querySelector('.number');
      view.textContent = phoneNumber;
    } else {
      this.phoneNumberView.value = phoneNumber;
      this.moveCaretToEnd(this.phoneNumberView);
    }

    this.formatPhoneNumber(ellipsisSide, maxFontSize);
  },

  restorePhoneNumber: function kh_restorePhoneNumber(ellipsisSide,
    maxFontSize) {
    this.updatePhoneNumber(this._originalPhoneNumber, ellipsisSide,
      maxFontSize);
  },

  updateAdditionalContactInfo:
    function kh_updateAdditionalContactInfo(additionalContactInfo) {
    this._additionalContactInfo = additionalContactInfo;
    this._updateAdditionalContactInfoView();
  },

  _updateAdditionalContactInfoView:
    function kh__updateAdditionalContactInfoView() {
    var phoneNumberView = CallScreen.activeCall.querySelector('.number');
    var additionalview = CallScreen.activeCall.querySelector(
      '.additionalContactInfo');
    if (!this._additionalContactInfo ||
      this._additionalContactInfo.trim() === '') {
      additionalview.textContent = '';
      additionalview.classList.add('noAdditionalContactInfo');
      phoneNumberView.classList.add('noAdditionalContactInfo');
    } else {
      phoneNumberView.classList.remove('noAdditionalContactInfo');
      additionalview.classList.remove('noAdditionalContactInfo');
      additionalview.textContent = this._additionalContactInfo;
    }
  },

  restoreAdditionalContactInfo: function kh_restoreAdditionalContactInfo() {
    this.updateAdditionalContactInfo(this._originalAdditionalContactInfo);
  },

  _callVoicemail: function kh_callVoicemail() {
     var voicemail = navigator.mozVoicemail;
     if (voicemail && voicemail.number) {
       CallHandler.call(voicemail.number);
       return;
     }
     var settings = navigator.mozSettings;
     if (!settings) {
      return;
     }
     var transaction = settings.createLock();
     var request = transaction.get('ril.iccInfo.mbdn');
     request.onsuccess = function() {
       if (request.result['ril.iccInfo.mbdn']) {
         CallHandler.call(request.result['ril.iccInfo.mbdn']);
       }
     };
     request.onerror = function() {};
  }
};

