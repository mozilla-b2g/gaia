/* globals DtmfTone, LazyLoader, SettingsListener, telephony, TonePlayer */

'use strict';

var kFontStep = 4;
var minFontSize = 12;

// Frequencies coming from http://en.wikipedia.org/wiki/Telephone_keypad
var gTonesFrequencies = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};

var KeypadManager = {
  _phoneNumber: '',
  _onCall: false,

  _keypadSoundIsEnabled: false,
  _shortTone: false,
  _vibrationEnabled: false,

  // Keep in sync with Lockscreen and keyboard vibration
  kVibrationDuration: 50, // ms

  // Due to the ellipsis capabilities of the number view, the cursor position
  // in the input element, does not match the point where new digits should be
  // added to the current number or where the deletion operation should take
  // place. This property holds the position of the edition point for the
  // current number (_phoneNumber property).
  _insertPosition: null,

  get phoneNumberView() {
    delete this.phoneNumberView;
    this.phoneNumberView = document.getElementById('phone-number-view');
    return this.phoneNumberView;
  },

  get fakePhoneNumberView() {
    delete this.fakePhoneNumberView;
    this.fakePhoneNumberView =
      document.getElementById('fake-phone-number-view');
    return  this.fakePhoneNumberView;
  },

  get phoneNumberViewContainer() {
    delete this.phoneNumberViewContainer;
    this.phoneNumberViewContainer =
      document.getElementById('phone-number-view-container');
    return this.phoneNumberViewContainer;
  },

  get keypad() {
    delete this.keypad;
    this.keypad = document.getElementById('keypad');
    return this.keypad;
  },

  get callBar() {
    delete this.callBar;
    this.callBar =
      document.getElementById('keypad-callbar');
    return this.callBar;
  },

  get hideBar() {
    delete this.hideBar;
    this.hideBar = document.getElementById('keypad-hidebar');
    return this.hideBar;
  },

  get callBarAddContact() {
    delete this.callBarAddContact;
    this.callBarAddContact =
      document.getElementById('keypad-callbar-add-contact');
    return this.callBarAddContact;
  },

  get callBarCallAction() {
    delete this.callBarCallAction;
    this.callBarCallAction =
      document.getElementById('keypad-callbar-call-action');
    return this.callBarCallAction;
  },

  get callBarCancelAction() {
    delete this.callBarCancelAction;
    this.callBarCancelAction =
      document.getElementById('keypad-callbar-cancel');
    return this.callBarCancelAction;
  },

  get deleteButton() {
    delete this.deleteButton;
    this.deleteButton = document.getElementById('keypad-delete');
    return this.deleteButton;
  },

  get hideBarHangUpAction() {
    delete this.hideBarHangUpAction;
    this.hideBarHangUpAction =
      document.getElementById('keypad-hidebar-hang-up-action-wrapper');
    return this.hideBarHangUpAction;
  },

  get hideBarHideAction() {
    delete this.hideBarHideAction;
    this.hideBarHideAction =
      document.getElementById('keypad-hidebar-hide-keypad-action');
    return this.hideBarHangAction;
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
    minFontSize = parseInt(parseInt(defaultFontSize) * 10 * 0.226);

    this.phoneNumberView.value = '';
    this.phoneNumberView
      .addEventListener('click', this._updateInsertPosition.bind(this));
    this._phoneNumber = '';

    var keyHandler = this.keyHandler.bind(this);
    this.keypad.addEventListener('touchstart', keyHandler, true);
    this.keypad.addEventListener('touchmove', keyHandler, true);
    this.keypad.addEventListener('touchend', keyHandler, true);
    this.keypad.addEventListener('touchcancel', keyHandler, true);

    this.deleteButton.addEventListener('touchstart', keyHandler);
    this.deleteButton.addEventListener('touchend', keyHandler);
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
        window.close();
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

    TonePlayer.init('system');

    this.render();

    this._observePreferences();
  },

  render: function hk_render(layoutType) {
    if (layoutType == 'oncall') {
      this._onCall = true;
      var numberNode =
        window.CallScreen.activeCall.querySelector('.number');
      this._phoneNumber = numberNode.textContent;
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
    event.stopPropagation();

    if (this._phoneNumber !== '') {
      window.CallHandler.call(KeypadManager._phoneNumber);
    }
  },

  addContact: function hk_addContact(event) {
    var number = this._phoneNumber;
    if (!number) {
      return;
    }

    try {
      var activity = new window.MozActivity({
        name: 'new',
        data: {
          type: 'webcontacts/contact',
          params: {
            'tel': number
          }
        }
      });

      // To prevent the bad habit that new a variable
      // but not use it.
      activity.onsuccess = function() {};
      activity.onerror = function() {};
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },

  callbarBackAction: function hk_callbarBackAction(event) {
    window.CallScreen.hideKeypad();
  },

  hangUpCallFromKeypad: function hk_hangUpCallFromKeypad(event) {
    window.CallScreen.views.classList.remove('show');
    window.OnCallHandler.end();
  },

  formatPhoneNumber: function kh_formatPhoneNumber(mode) {
    var fakeView = null,
        view = null;
    switch (mode) {
      case 'dialpad':
        fakeView = this.fakePhoneNumberView;
        view = this.phoneNumberView;

        // We consider the case where the delete button may have
        // been used to delete the whole phone number.
        if (view.value === '') {
          view.style.fontSize = view.dataset.size;
          return;
        }
      break;

      case 'on-call':
        fakeView =
          window.CallScreen.activeCall.querySelector('.fake-number');
        view =
          window.CallScreen.activeCall.querySelector('.number');
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

  _lastPressedKey: null,
  _dtmfTone: null,

  _playDtmfTone: function kh_playDtmfTone(key) {
    var serviceId = 0;

    if (!this._onCall) {
      return;
    }

    if (telephony.active) {
      // Single call
      serviceId = telephony.active.serviceId;
    }

    if (this._dtmfTone) {
      this._dtmfTone.stop();
      this._dtmfTone = null;
    }

    this._dtmfTone = new DtmfTone(key, this._shortTone, serviceId);
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
   */
  _touchStart: function kh_touchStart(key) {
    this._longPress = false;
    this._lastPressedKey = key;

    if (key != 'delete') {
      if (this._keypadSoundIsEnabled) {
        // We do not support long press if not on a call
        TonePlayer.start(
          gTonesFrequencies[key], !this._onCall || this._shortTone);
      }

      if (this._vibrationEnabled) {
        navigator.vibrate(this.kVibrationDuration);
      }

      this._playDtmfTone(key);
    }

    // Manage long press
    if ((key == '0' && !this._onCall) || key == 'delete') {
      this._holdTimer = setTimeout(function(self) {
        self.restoreCaretPosition();
        if (key == 'delete') {
          self._clearPhoneNumber();
        } else if (key === '0') {
          self._replaceLastKey('+');
        } else if (key === '*') {
          var isAtTheEnd = self._insertPosition === null;
          var isFirst = self._insertPosition === 1 ||
                        (isAtTheEnd && self._phoneNumber.length === 1);
          // ',' DTMF separator can't be the first
          if (!isFirst) {
            self._replaceLastKey(',');
          } else {
            self._deleteAtInsertPosition();
          }
        }

        self._longPress = true;
        self._updatePhoneNumberView();
      }, 400, this);
    }

    // Voicemail long press (only if first digit pressed)
    if (key === '1' && this._phoneNumber === '') {
      this._holdTimer = setTimeout(function vm_call(self) {
        self._longPress = true;
        self._callVoicemail();

        self._phoneNumber = '';
        self._updatePhoneNumberView();
      }, 400, this);
    }

    if (key == 'delete') {
      this._deleteAtInsertPosition();
    } else if (this.phoneNumberViewContainer.classList.
      contains('keypad-visible')) {

      if (!this._isKeypadClicked) {
        this._isKeypadClicked = true;
        this._phoneNumber = key;
      } else {
        this._insertAtCaret(key);
      }
    } else {
      this._insertAtCaret(key);
    }

    setTimeout(function(self) {
      self._updatePhoneNumberView();
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

    if (this._keypadSoundIsEnabled) {
      TonePlayer.stop();
    }

    this.restoreCaretPosition();

    // If it was a long press our work is already done
    if (this._longPress) {
      this._longPress = false;
      this._holdTimer = null;
      this.restoreCaretPosition();
      return;
    }

    if (this._holdTimer) {
      clearTimeout(this._holdTimer);
    }
  },

  keyHandler: function kh_keyHandler(event) {
    // Avoid the keys to get focus.
    event.preventDefault();

    var key = event.target.dataset.value;

    // Prevent the delete keys to get the focus.
    if (key === 'delete') {
      event.preventDefault();
    }

    // We could receive this event from an element that
    // doesn't have the dataset value. Got the last key
    // pressed and assing this value to continue with the
    // proccess.
    if (!key) {
      return;
    }

    event.stopPropagation();

    switch (event.type) {
      case 'touchstart':
        event.target.classList.add('active');
        this._touchStart(key);
        break;
      case 'touchmove':
        this._touchMove(event.touches[0]);
        break;
      case 'touchend':
      case 'touchcancel':
        event.target.classList.remove('active');
        this._touchEnd(key);
        break;
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
    this.phoneNumberView.blur();

    if (this._onCall) {
      var view =
        window.CallScreen.activeCall.querySelector('.number');
      view.textContent = phoneNumber;
      this.formatPhoneNumber('on-call');
    } else {
      this.phoneNumberView.value = phoneNumber;
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
         window.CallHandler.call(number);
       }
     }
  },

  _observePreferences: function kh_observePreferences() {
    var self = this;
    LazyLoader.load('/shared/js/settings_listener.js', function() {
      SettingsListener.observe('phone.ring.keypad', false, function(value) {
        self._keypadSoundIsEnabled = !!value;
      });

      SettingsListener.observe('phone.dtmf.type', false, function(value) {
        self._shortTone = (value === 'short');
      });

      SettingsListener.observe('keyboard.vibration', false, function(value) {
        self._vibrationEnabled = !!value;
      });
    });
  },

  _updateInsertPosition: function kh_updateInsertPosition() {
    this._insertPosition = this._realStartPosition();
  },

  _deleteAtInsertPosition: function kh_deleteAtInsertPosition() {
    if (this._insertPosition === null) {
      this._phoneNumber = this._phoneNumber.slice(0, -1);
    } else {
      var start = this._realStartPosition();
      var end = this._realEndPosition();
      if (start > 0 && start === end) {
        start = end - 1;
      }
      this._phoneNumber = this._phoneNumber.substring(0, start) +
                          this._phoneNumber.substring(end);
      this._insertPosition = this._phoneNumber ? start : null;
    }
  },

  _clearPhoneNumber: function kh_clearPhoneNumber() {
    if (this._insertPosition === null) {
      this._phoneNumber = '';
    } else {
      var start = this._realStartPosition();
      this._phoneNumber = this._phoneNumber.substring(start);
      this._insertPosition = this._phoneNumber ? 0 : null;
    }
  },

  /**
   * Sets the caret position inside the phone number input of the dialer
   * according to the insert position (which is the real place where the caret
   * should be inside the complete number) taking into account the number of
   * ellipsed characters.
   */
  restoreCaretPosition: function kh_restoreCaretPosition() {
    if (this._insertPosition !== null) {
      var caretPosition = this._caretPosition(this._insertPosition);
      this.phoneNumberView.selectionStart = caretPosition;
      this.phoneNumberView.selectionEnd = caretPosition;
      this.phoneNumberView.focus();
    } else {
      this.phoneNumberView.blur();
    }
  },

  /**
   * Gets the real start index for a selection in the phone view considering
   * the ellipsed characters.
   */
  _realStartPosition: function kh_realStartPosition() {
    var start = this.phoneNumberView.selectionStart;
    return this._realPosition(this.phoneNumberView, start);
  },

  /**
   * Gets the real end index for a selection in the phone view considering
   * the ellipsed characters.
   */
  _realEndPosition: function kh_realEndPosition() {
    var end = this.phoneNumberView.selectionEnd;
    return this._realPosition(this.phoneNumberView, end);
  },

  /**
   * Gets the position where the cursor should be placed inside the phone
   * view (considering the ellipsed scenaries) from the real edition point.
   */
  _caretPosition: function kh_caretPosition(realPosition) {
    return realPosition - this._ellipsisOffset(this.phoneNumberView);
  },

  /**
   * Utility to calculate the real cursor position given an input with
   * ellipsed characters and a position inside the current value.
   */
  _realPosition: function kh_realPosition(input, position) {
    return position + this._ellipsisOffset(this.phoneNumberView);
  },

  /**
   * Calculates the amount of characters that are not visible in the current
   * view. This includes all the ellipsed characters and the ellipsis
   * character itself.
   */
  _ellipsisOffset: function kh_ellipsisOffset(input) {
    var ellipsedCharacters = +input.dataset.ellipsedCharacters;
    return ellipsedCharacters ? (ellipsedCharacters - 1) : 0;
  },

  _replaceLastKey: function kh_replaceLastKey(newKey) {
    this._deleteAtInsertPosition();
    this.restoreCaretPosition();
    this._insertAtCaret(newKey);
  },

  _insertAtCaret: function kh_insertAtCaret(key) {
    if (this._insertPosition === null) {
      this._phoneNumber += key;
    } else {
      var start = this._realStartPosition();
      var end = this._realEndPosition();
      this._phoneNumber = this._phoneNumber.substring(0, start) + key +
                          this._phoneNumber.substring(end);
      this._insertPosition = start + 1;
    }
  }
};

navigator.mozL10n && navigator.mozL10n.once(function onL10nInit() {
  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});
