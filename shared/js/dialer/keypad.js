/* exported KeypadManager */

/* globals AddContactMenu, CallHandler, CallLogDBManager, CallsHandler,
           CallScreen, ConfirmDialog, CustomDialog, DtmfTone, FontSizeManager,
           LazyLoader, MultiSimActionButton, Promise, SimSettingsHelper,
           SettingsListener, TonePlayer */

'use strict';

// Frequencies coming from http://en.wikipedia.org/wiki/Telephone_keypad
var gTonesFrequencies = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};

var KeypadManager = {

  kMaxDigits: 50,

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

  onValueChanged: null,

  get phoneNumberView() {
    delete this.phoneNumberView;
    this.phoneNumberView = document.getElementById('phone-number-view');
    return this.phoneNumberView;
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
    return this.hideBarHideAction;
  },

  multiSimActionButton: null,

  /**
   * Initializes the keypad manager, registers all the appropriate event
   * handlers and instances the necessary sound infrastructure so that the
   * keypad will be fully functional once this method has been called.
   *
   * @param oncall {Boolean} True if the keypad manager will be used during a
   *        call and will play sounds on the "telephony" channel. False if it
   *        will be used outside of a call and should use the "content" channel
   *        instead. We should be using the "notification" channel but we can't
   *        due to bug 1092346.
   */
  init: function kh_init(oncall) {

    this._onCall = !!oncall;

    this.phoneNumberView.value = '';
    this.phoneNumberView
      .addEventListener('click', this._updateInsertPosition.bind(this));
    this._phoneNumber = '';

    var keyHandler = this.keyHandler.bind(this);
    this.keypad.addEventListener('contextmenu', keyHandler);

    this.keypad.addEventListener('touchstart', keyHandler, true);
    this.keypad.addEventListener('touchmove', keyHandler, true);
    this.keypad.addEventListener('touchend', keyHandler, true);
    this.keypad.addEventListener('touchcancel', keyHandler, true);

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
      if (typeof MultiSimActionButton !== 'undefined') {
        this.multiSimActionButton =
          new MultiSimActionButton(this.callBarCallAction,
                                   CallHandler.call,
                                   'ril.telephony.defaultServiceId',
                                   this.phoneNumber.bind(this));
      }
      this.callBarCallAction.addEventListener('click',
                                              this.fetchLastCalled.bind(this));
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

    // According to the UX sound spec, we should use the "system" type for the
    // dialer pad. See the attachment of the bug1068219.
    TonePlayer.init('system');

    this.render();
    LazyLoader.load(['/shared/style/action_menu.css',
                     '/shared/js/sanitizer.js',
                     '/dialer/js/suggestion_bar.js']);

    this._observePreferences();
  },

  render: function hk_render(layoutType) {
    if (layoutType == 'oncall') {
      if (CallsHandler.activeCall) {
        var activeCall = CallsHandler.activeCall.call;
        this._phoneNumber = activeCall.id.number;
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

  phoneNumber: function hk_phoneNumber() {
    return this._phoneNumber;
  },

  fetchLastCalled: function hk_fetchLastCalled() {
    if (this._phoneNumber !== '') {
      return;
    }

    var self = this;
    CallLogDBManager.getGroupAtPosition(1, 'lastEntryDate', true, 'dialing',
      function hk_ggap_callback(result) {
        if (result && (typeof result === 'object') && result.number) {
          self.updatePhoneNumber(result.number);
        }
      }
    );
  },

  addContact: function hk_addContact(event) {
    var number = this._phoneNumber;
    if (!number) {
      return;
    }
    LazyLoader.load(['/dialer/js/add_contact_menu.js'], function() {
      AddContactMenu.show(number);
    });
  },

  callbarBackAction: function hk_callbarBackAction(event) {
    CallScreen.hideKeypad();
  },

  hangUpCallFromKeypad: function hk_hangUpCallFromKeypad(event) {
    CallScreen.body.classList.remove('showKeypad');
    CallsHandler.end();
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
    if (((key == '0' || key == '*') && !this._onCall) || key == 'delete') {
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
        self._updatePhoneNumberView('begin', false);
      }, 400, this);
    }

    // Voicemail long press (only if first digit pressed)
    if (key === '1' && this._phoneNumber === '') {
      this._holdTimer = setTimeout(function vm_call(self) {
        self._longPress = true;
        self._callVoicemail();

        self._phoneNumber = '';
        self._updatePhoneNumberView('begin', false);
      }, 400, this);
    }

    if (key == 'delete') {
      this._deleteAtInsertPosition();
    } else if (this.phoneNumberViewContainer.classList.
      contains('keypad-visible')) {

      if (!this._isKeypadClicked) {
        this._isKeypadClicked = true;
        this._phoneNumber = key;
        this.replaceAdditionalContactInfo('');
      } else {
        this._insertAtCaret(key);
      }
    } else {
      this._insertAtCaret(key);
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
    var key = (target && target.dataset) ? target.dataset.value : null;

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
      return;
    }

    if (this._holdTimer) {
      clearTimeout(this._holdTimer);
    }
  },

  keyHandler: function kh_keyHandler(event) {
    // Avoid the keys to get focus.
    event.preventDefault();

    // When long pressing on the voicemail button, if a menu pops up on top of
    // the 1 button, a click will go through and target that button unless we
    // preventDefault the contextmenu event.
    if (event.type == 'contextmenu') {
      return;
    }

    var key = event.target.dataset.value;

    // We could receive this event from an element that
    // doesn't have the dataset value. Got the last key
    // pressed and assing this value to continue with the
    // proccess.
    if (!key) {
      return;
    }

    // Per certification requirements abbreviated dialing codes need to be
    // called immediately after the user enters the '#' key. This covers
    // retrieving the device's IMEI codes as well as speed dialing.
    if (key === '#' && !this._onCall) {
      if (this._phoneNumber === '*#06#') {
        this.multiSimActionButton.performAction();
        event.target.classList.remove('active');
        return;
      } else if (this._isSpeedDialNumber(this._phoneNumber)) {
        var self = this;
        var index = this._phoneNumber.slice(0, -1); // Remove the trailing '#'

        this.updatePhoneNumber('', 'begin', false);
        this._getSpeedDialNumber(+index).then(
        function(number) {
          self.updatePhoneNumber(number, 'begin', false);
        }, function(error) {
          /* Do not display an error message if the user explicitly
           * cancelled the speed dial operation. */
          if (error) {
            ConfirmDialog.show(error, null,  {
              title: 'noContactsFoundDialogOk',
              callback: ConfirmDialog.hide
            });
          }
        });

        event.target.classList.remove('active');
        return;
      }
    }

    // If user input number more 50 digits, app shouldn't accept.
    // The limit only applies while not on a call - there is no
    // limit while on a call (bug 917630).
    if (key != 'delete' && this._phoneNumber.length >= this.kMaxDigits &&
        !this._onCall) {
      event.target.classList.remove('active');
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

  /**
   * Returns true if the number is a speed dial code as described in
   * 3GPP TS 22.030 6.6.4. Speed dial codes are in the N(N)(N)# format.
   */
  _isSpeedDialNumber: function(number) {
    return !!number.match(/^[0-9][0-9]{0,2}\#$/);
  },

  /**
   * Returns the telephony number corresponding to the specified index. Speed
   * dial numbers are retrieved from the SIM contacts list and not from the
   * regular contacts.
   *
   * @param {Integer} index The index of the speed dial number.
   * @returns {Promise} A promise that resolves to the corresponding number.
   */
  _getSpeedDialNumber: function(index) {
    var self = this;
    var cardIndex;

    index--; // Speed dial indexes are 1-based

    return new Promise(function(resolve, reject) {
      LazyLoader.load(['/shared/js/sim_settings_helper.js'], function() {
        SimSettingsHelper.getCardIndexFrom('outgoingCall',
        function(defaultCardIndex) {
          if (defaultCardIndex == SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE) {
            LazyLoader.load(['/shared/js/component_utils.js',
                             '/shared/elements/gaia_sim_picker/script.js'],
            function() {
              var simPicker = document.getElementById('sim-picker');
              simPicker.getOrPick(defaultCardIndex, null,
              function(pickedCardIndex) {
                cardIndex = pickedCardIndex;
                resolve();
              });
            });
          } else {
            cardIndex = defaultCardIndex;
            resolve();
          }
        });
      });
    }).then(function() {
      return self._getSimContactsList(cardIndex).then(
      function(simContactsList) {
        if ((index >= 0) && (index < simContactsList.length)) {
          return simContactsList[index].number;
        } else {
          return Promise.reject('noContactsWereFound');
        }
      });
    });
  },

  /**
   * Creates an array of contacts populated using the ADN contacts retrieved
   * from a SIM card. Every contact will contain only the ID and first
   * telephone number and the array will be sorted by ID. This array is then
   * suitable to be used to pick speed dial numbers.
   *
   * @param {Array} contacts An array of mozContact elements.
   * @returns {Array} An array of telephone numbers / ID couples sorted by ID.
   */
  _createSimContactList: function(contacts) {
    var numbers = new Array(contacts.length);

    for (var i = 0; i < contacts.length; i++) {
      numbers[i] = {
        id: contacts[i].id,
        number: contacts[i].tel[0].value,
      };
    }

    numbers.sort(function(a, b) {
      if (a.id.length == b.id.length) {
        return (a.id > b.id) ? 1 : 0;
      } else {
        return (a.id.length > b.id.length) ? 1 : 0;
      }
    });

    return numbers;
  },

  /**
   * Gets the SIM contacts list for the specified SIM card.
   *
   * @param {Integer} cardIndex The SIM card index.
   * @returns {Promise} A promise that is resolved with the contacts list.
   */
  _getSimContactsList: function(cardIndex) {
    var self = this;
    var canceled = false;

    return new Promise(function(resolve, reject) {
      LazyLoader.load(['/shared/style/confirm.css',
                       '/shared/js/confirm.js',
                       document.getElementById('confirmation-message')],
        function() {
          var iccId = navigator.mozIccManager.iccIds[cardIndex];
          var icc = navigator.mozIccManager.getIccById(iccId);
          var req = icc.readContacts('adn');

          req.onsuccess = function(event) {
            var adnContacts = event.target.result;
            var contacts = self._createSimContactList(adnContacts);

            if (!canceled) {
              ConfirmDialog.hide();
            }

            resolve(contacts);
          };
          req.onerror = function(error) {
            console.error('Could not retrieve the ADN contacts from SIM card ' +
                          cardIndex + ', got error ' + error.name);
            reject('noContactsWereFound');
          };

          ConfirmDialog.show('loadingSimContacts', null, {
            title: 'cancel',
            callback: function() {
              canceled = true;
              ConfirmDialog.hide();
              reject();
            }
          });
        }
      );
    });
  },

  sanitizePhoneNumber: function(number) {
    return number.replace(/\s+/g, '');
  },

  updatePhoneNumber: function kh_updatePhoneNumber(number, ellipsisSide,
    forceMaxFontSize) {
    number = this.sanitizePhoneNumber(number);
    this._phoneNumber = number;
    this._updatePhoneNumberView(ellipsisSide, forceMaxFontSize);
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
    forceMaxFontSize) {
    var phoneNumber = this._phoneNumber;

    // If there are digits in the phone number, show the delete button
    // and enable the add contact button
    if (this._onCall) {
      this.replacePhoneNumber(phoneNumber, ellipsisSide);
    } else {
      var visibility;
      if (phoneNumber.length > 0) {
        visibility = 'visible';
        this.callBarAddContact.removeAttribute('disabled');
      } else {
        visibility = 'hidden';
        this.callBarAddContact.setAttribute('disabled', 'disabled');
      }
      this.deleteButton.style.visibility = visibility;
      this.phoneNumberView.blur(); // update avoiding caret flickering
      this.phoneNumberView.value = phoneNumber;

      FontSizeManager.adaptToSpace(
        FontSizeManager.DIAL_PAD, this.phoneNumberView, forceMaxFontSize,
        ellipsisSide);
    }

    if (this.onValueChanged) {
      this.onValueChanged(this._phoneNumber);
    }
  },

  replacePhoneNumber:
    function kh_replacePhoneNumber(phoneNumber, ellipsisSide) {
      if (this._onCall && CallsHandler.activeCall) {
        CallsHandler.activeCall.
          replacePhoneNumber({raw: phoneNumber} , ellipsisSide);
      }
  },

  restorePhoneNumber:
    function kh_restorePhoneNumber() {
    if (this._onCall && CallsHandler.activeCall) {
      CallsHandler.activeCall.restorePhoneNumber();
    }
  },

  replaceAdditionalContactInfo:
    function kh_replaceAdditionalContactInfo(additionalContactInfo) {
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

  _callVoicemail: function() {
    if (navigator.mozIccManager.iccIds.length <= 1) {
      this._callVoicemailForSim(0);
      return;
    }

    var self = this;
    var key = 'ril.voicemail.defaultServiceId';
    var req = navigator.mozSettings.createLock().get(key);
    req.onsuccess = function() {
      LazyLoader.load(['/shared/js/component_utils.js',
                       '/shared/elements/gaia_sim_picker/script.js'],
      function() {
        var _ = navigator.mozL10n.get;
        var simPicker = document.getElementById('sim-picker');
        simPicker.getOrPick(req.result[key], _('voiceMail'),
                            self._callVoicemailForSim.bind(self));
      });
    };
  },

  _callVoicemailForSim: function(cardIndex) {
    var settings = navigator.mozSettings;
    if (!settings) {
      return;
    }
    var transaction = settings.createLock();
    var request = transaction.get('ril.iccInfo.mbdn');
    request.onsuccess = (function() {
      var numbers = request.result['ril.iccInfo.mbdn'];
      var number;
      if (typeof numbers == 'string') {
        number = numbers;
      } else {
        number = numbers && numbers[cardIndex];
      }
      var voicemail = navigator.mozVoicemail;
      if (!number && voicemail) {
        number = voicemail.getNumber(cardIndex);
      }
      if (number) {
        CallHandler.call(number, cardIndex);
      } else {
        this._showNoVoicemailDialog();
      }
    }).bind(this);
    request.onerror = function() {};
  },

  _showNoVoicemailDialog: function hk_showNoVoicemailDialog() {

    var voicemailDialog = {
      title: 'voicemailNoNumberTitle',
      text: 'voicemailNoNumberText',
      confirm: {
        title: 'voicemailNoNumberSettings',
        recommend: true,
        callback: this.showVoicemailSettings
      },
      cancel: {
        title: 'voicemailNoNumberCancel',
        callback: this._hideNoVoicemailDialog
      }
    };

    LazyLoader.load(['/shared/js/custom_dialog.js'], function() {
      CustomDialog.show(
        voicemailDialog.title, voicemailDialog.text,
        voicemailDialog.cancel, voicemailDialog.confirm);
    });
  },

  _hideNoVoicemailDialog: function kh_hideNoVoicemailDialog() {
    CustomDialog.hide();
  },

  showVoicemailSettings: function kh_showVoicemailSettings() {
    var activity = new window.MozActivity({
      name: 'configure',
      data: {
        target: 'device',
        section: 'call'
      }
    });

    activity.onerror = function() {
      console.warn('Configure activity error:', activity.error.name);
    };
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
  }
};
