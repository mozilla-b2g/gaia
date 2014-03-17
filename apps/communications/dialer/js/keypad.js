/* globals CallHandler, CallLogDBManager, CallsHandler, CallScreen, LazyLoader,
           PhoneNumberActionMenu, SettingsListener, TonePlayer, Utils */

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
var shortTone = false;

function observePreferences() {
  SettingsListener.observe('phone.ring.keypad', false, function(value) {
    keypadSoundIsEnabled = !!value;
  });

  SettingsListener.observe('phone.dtmf.type', false, function(value) {
    shortTone = (value === 'short');
  });
}

if (window.SettingsListener) {
  observePreferences();
} else {
  window.addEventListener('load', function onLoad() {
    window.removeEventListener('load', onLoad);
    LazyLoader.load('/shared/js/settings_listener.js', observePreferences);
  });
}

/**
 * DTMF tone constructor, providing the SIM on which this tone will be played
 * is mandatory.
 *
 * @param {String} tone The tone to be played.
 * @param {Boolean} short True if this will be a short tone, false otherwise.
 * @param {Integer} serviceId The ID of the SIM card on which to play the tone.
 */
function DtmfTone(tone, short, serviceId) {
  this.tone = tone;
  this.short = short;
  this.serviceId = serviceId;
  this.timer = 0;
}

DtmfTone.prototype = {
  /**
   * Starts playing the tone, if this is a short tone it will stop automatically
   * after kShortToneLength milliseconds, otherwise it will play until stopped.
   */
  play: function dt_play() {
    clearTimeout(this.timer);

    // Stop previous tone before dispatching a new one
    navigator.mozTelephony.stopTone(this.serviceId);
    navigator.mozTelephony.startTone(this.tone, this.serviceId);

    if (this.short) {
      this.timer = window.setTimeout(function dt_stopTone(serviceId) {
        navigator.mozTelephony.stopTone(serviceId);
      }, DtmfTone.kShortToneLength, this.serviceId);
    }
  },

  /**
   * Stop the DTMF tone, this is safe to call even if the DTMF tone has already
   * stopped.
   */
  stop: function dt_stop() {
    clearTimeout(this.timer);
    navigator.mozTelephony.stopTone(this.serviceId);
  }
};

/**
 * Length of a short DTMF tone, currently 120ms.
 */
DtmfTone.kShortToneLength = 120;

var KeypadManager = {

  _MAX_FONT_SIZE_DIAL_PAD: 18,
  _MAX_FONT_SIZE_ON_CALL: 16,

  _phoneNumber: '',
  _onCall: false,

  onValueChanged: null,

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
    this.keypad.addEventListener('touchstart', keyHandler, true);
    this.keypad.addEventListener('touchend', keyHandler, true);

    this.keypad.addEventListener('touchmove', keyHandler, true);
    this.deleteButton.addEventListener('touchstart', keyHandler);
    this.deleteButton.addEventListener('touchend', keyHandler);
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

    TonePlayer.init(this._onCall ? 'telephony' : 'normal');

    this.render();
    LazyLoader.load(['/shared/style/action_menu.css',
                     '/dialer/js/suggestion_bar.js']);
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
      if (CallsHandler.activeCall) {
        this._phoneNumber = CallsHandler.activeCall.call.number;
      }
      this._isKeypadClicked = false;
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
    if (event)
      event.stopPropagation();

    if (this._phoneNumber === '') {
      var self = this;
      CallLogDBManager.getGroupAtPosition(1, 'lastEntryDate', true, 'dialing',
        function hk_ggap_callback(result) {
          if (result && (typeof result === 'object') && result.number) {
            self.updatePhoneNumber(result.number);
          }
        }
      );
    } else {
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
    CallsHandler.end();
  },

  formatPhoneNumber: function kh_formatPhoneNumber(ellipsisSide, maxFontSize) {
    var fakeView = this.fakePhoneNumberView;
    var view = this.phoneNumberView;

    // We consider the case where the delete button may have
    // been used to delete the whole phone number.
    if (view.value == '') {
      view.style.fontSize = this.maxFontSize;
      return;
    }

    var newFontSize;
    if (maxFontSize) {
      newFontSize = this.maxFontSize;
    } else {
      newFontSize =
        Utils.getNextFontSize(view, fakeView, this.maxFontSize,
          this.minFontSize, kFontStep);
    }
    view.style.fontSize = newFontSize + 'px';
    Utils.addEllipsis(view, fakeView, ellipsisSide);
  },

  _lastPressedKey: null,
  _dtmfTone: null,

  _playDtmfTone: function kh_playDtmfTone(key) {
    var serviceId = 0;

    if (!this._onCall) {
      return;
    }

    if (CallsHandler.activeCall) {
      // Single call
      serviceId = CallsHandler.activeCall.call.serviceId;
    } else {
      // Conference call
      serviceId = navigator.mozTelephony.active.calls[0].serviceId;
    }

    if (this._dtmfTone) {
      this._dtmfTone.stop();
      this._dtmfTone = null;
    }

    this._dtmfTone = new DtmfTone(key, shortTone, serviceId);
    this._dtmfTone.play();
  },

  _stopDtmfTone: function kh_stopDtmfTone() {
    if (!this._dtmfTone) {
      return;
    }

    this._dtmfTone.stop();
    this._dtmfTone = null;
  },

  /**
   * Function used to respond to touchstart events over the keypad. Reacts to
   * the first key that has been pressed by playing the appropriate tone and
   * sets up the necessary timers to react to long presses.
   *
   * @param {String} key The key that was hit by this touchstart event.
   * @param {Boolean} [voicemail] If present and true indicates that the
   *        pressed key corresponded with the button used for voicemail.
   */
  _touchStart: function kh_touchStart(key, voicemail) {
    this._longPress = false;
    this._lastPressedKey = key;

    if (key != 'delete') {
      if (keypadSoundIsEnabled) {
        // We do not support long press if not on a call
        TonePlayer.start(gTonesFrequencies[key], !this._onCall || shortTone);
      }

      this._playDtmfTone(key);
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
        self._updatePhoneNumberView('begin', false);
      }, 400, this);
    }

    // Voicemail long press (needs to be longer since it actually dials)
    if (voicemail) {
      this._holdTimer = setTimeout(function vm_call(self) {
        self._longPress = true;
        self._callVoicemail();
      }, 1500, this);
    }

    if (key == 'delete') {
      this._phoneNumber = this._phoneNumber.slice(0, -1);
    } else if (this.phoneNumberViewContainer.classList.
      contains('keypad-visible')) {

      if (!this._isKeypadClicked) {
        this._isKeypadClicked = true;
        this._phoneNumber = key;
        this.replaceAdditionalContactInfo('');
      } else {
        this._phoneNumber += key;
      }
    } else {
      this._phoneNumber += key;
    }

    setTimeout(function(self) {
      self._updatePhoneNumberView('begin', false);
    }, 0, this);
  },

  /**
   * Function used to respond to touchmove events over the keypad. Stops playing
   * the tone associated with the last pressed key and resets it if the target
   * goes outside its area.
   *
   * @param {Object} touch Touch position object for this move.
   */
  _touchMove: function kh_touchMove(touch) {
    var target = document.elementFromPoint(touch.pageX, touch.pageY);
    var key = target.dataset ? target.dataset.value : null;

    if (key !== this._lastPressedKey || key === 'delete') {
      this._stopDtmfTone();
      this._lastPressedKey = null;
    }
  },

  /**
   * Function used to respond to touchend events over the keypad. Stops playing
   * tones and resets timers associated with the key press.
   *
   * @param {String} key The key over which the tap finished.
   */
  _touchEnd: function kh_touchEnd(key) {
    if (key !== 'delete' && key === this._lastPressedKey) {
      this._stopDtmfTone();
      this._lastPressedKey = null;
    }

    if (keypadSoundIsEnabled) {
      TonePlayer.stop();
    }

    // If it was a long press our work is already done
    if (this._longPress) {
      this._longPress = false;
      this._holdTimer = null;
      return;
    }

    if (this._holdTimer) {
      clearTimeout(this._holdTimer);
    }
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

    // Per certification requirement, we need to send an MMI request to
    // get the device's IMEI as soon as the user enters the last # key from
    // the "*#06#" MMI string. See bug 857944.
    if (key === '#' && this._phoneNumber === '*#06#') {
      this.makeCall(event);
      return;
    }

    // If user input number more 50 digits, app shouldn't accept.
    if (key != 'delete' && this._phoneNumber.length >= 50) {
      return;
    }

    event.stopPropagation();

    switch (event.type) {
      case 'touchstart':
        this._touchStart(key, event.target.dataset.voicemail);
        break;
      case 'touchmove':
        this._touchMove(event.touches[0]);
        break;
      case 'touchend':
        this._touchEnd(key);
        break;
    }
  },

  sanitizePhoneNumber: function(number) {
    return number.replace(/\s+/g, '');
  },

  updatePhoneNumber: function kh_updatePhoneNumber(number, ellipsisSide,
    maxFontSize) {
    number = this.sanitizePhoneNumber(number);
    this._phoneNumber = number;
    this._updatePhoneNumberView(ellipsisSide, maxFontSize);
  },

  press: function(value) {
    this._playDtmfTone(value);
    TonePlayer.start(gTonesFrequencies[value], true);
    setTimeout((function nextTick() {
      TonePlayer.stop();
      this._stopDtmfTone();
    }).bind(this));
  },

  _updatePhoneNumberView: function kh_updatePhoneNumberview(ellipsisSide,
    maxFontSize) {
    var phoneNumber = this._phoneNumber;

    // If there are digits in the phone number, show the delete button
    // and enable the add contact button
    if (this._onCall) {
      this.replacePhoneNumber(phoneNumber, ellipsisSide, maxFontSize);
    } else {
      var visibility;
      if (phoneNumber.length > 0) {
        visibility = 'visible';
        this.callBarAddContact.classList.remove('disabled');
      } else {
        visibility = 'hidden';
        this.callBarAddContact.classList.add('disabled');
      }
      this.deleteButton.style.visibility = visibility;

      this.phoneNumberView.value = phoneNumber;
      this.moveCaretToEnd(this.phoneNumberView);

      this.formatPhoneNumber(ellipsisSide, maxFontSize);
    }

    if (this.onValueChanged)
      this.onValueChanged(this._phoneNumber);
  },

  replacePhoneNumber:
    function kh_replacePhoneNumber(phoneNumber, ellipsisSide, maxFontSize) {
      if (this._onCall && CallsHandler.activeCall) {
        CallsHandler.activeCall.
          replacePhoneNumber(phoneNumber, ellipsisSide, maxFontSize);
      }
  },

  restorePhoneNumber: function kh_restorePhoneNumber() {
    if (this._onCall && CallsHandler.activeCall) {
      CallsHandler.activeCall.restorePhoneNumber();
    }
  },

  replaceAdditionalContactInfo:
    function kh_updateAdditionalContactInfo(additionalContactInfo) {
      var call = CallsHandler.activeCall;
      if (this._onCall && call) {
        call.replaceAdditionalContactInfo(additionalContactInfo);
      }
  },

  restoreAdditionalContactInfo: function kh_restoreAdditionalContactInfo() {
    if (this._onCall && CallsHandler.activeCall) {
      CallsHandler.activeCall.restoreAdditionalContactInfo();
    }
  },

  _callVoicemail: function kh_callVoicemail() {
     var settings = navigator.mozSettings;
     if (!settings) {
      return;
     }
     var transaction = settings.createLock();
     var request = transaction.get('ril.iccInfo.mbdn');
     request.onsuccess = function() {
       var number = request.result['ril.iccInfo.mbdn'];
       var voicemail = navigator.mozVoicemail;
       if (!number && voicemail) {
         // TODO: remove this backward compatibility check
         // after bug-814634 is landed
         number = voicemail.number ||
           voicemail.getNumber && voicemail.getNumber();
       }
       if (number) {
         CallHandler.call(number);
       }
       // TODO: Bug 881178 - [Dialer] Invite the user to go set a voicemail
       // number in the setting app.
     };
     request.onerror = function() {};
  }
};
