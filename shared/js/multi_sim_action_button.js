/* globals LazyLoader, SettingsListener, SimPicker */
/* exported MultiSimActionButton */

'use strict';

// Keep this in sync with SimSettingsHelper.
const ALWAYS_ASK_OPTION_VALUE = '-1';

var MultiSimActionButton = function MultiSimActionButton(
  button, callCallback, settingsKey, phoneNumberGetter) {
  this._button = button;
  this._callCallback = callCallback;
  this._settingsKey = settingsKey;
  this._phoneNumberGetter = phoneNumberGetter;

  this._button.addEventListener('click', this._click.bind(this));

  var self = this;
  LazyLoader.load(['/shared/js/settings_listener.js'], function() {
    SettingsListener.observe(settingsKey, 0,
                             self._settingsObserver.bind(self));
  });

  if (navigator.mozIccManager &&
      navigator.mozIccManager.iccIds.length > 1) {
    this._button.addEventListener('contextmenu', this._contextmenu.bind(this));

    this._simIndication = this._button.querySelector('.js-sim-indication');

    var telephony = navigator.mozTelephony;
    if (telephony) {
      telephony.addEventListener('callschanged', self._updateUI.bind(self));
    }
  }
};

MultiSimActionButton.prototype._settingsObserver = function(cardIndex) {
  this._defaultCardIndex = cardIndex;
  this._updateUI();
};

MultiSimActionButton.prototype._getCardIndex = function() {
  if (window.TelephonyHelper) {
    var inUseSim = window.TelephonyHelper.getInUseSim();
    if (inUseSim !== null) {
      return inUseSim;
    }
  }

  return this._defaultCardIndex;
};

MultiSimActionButton.prototype._click = function(event) {
  if (event) {
    event.preventDefault();
  }

  var phoneNumber = this._phoneNumberGetter && this._phoneNumberGetter();
  if (!navigator.mozIccManager || phoneNumber === '') {
    return;
  }

  if (navigator.mozIccManager.iccIds.length === 1) {
    this.performAction();
    return;
  }

  var cardIndex = this._getCardIndex();
  // The user has requested that we ask them every time for this key,
  // so we prompt them to pick a SIM even when they only click.
  if (cardIndex == ALWAYS_ASK_OPTION_VALUE) {
    var self = this;
    LazyLoader.load(['/shared/js/sim_picker.js'], function() {
      SimPicker.getOrPick(cardIndex, phoneNumber,
                          self.performAction.bind(self));
    });
  } else {
    this.performAction(cardIndex);
  }
};

MultiSimActionButton.prototype._updateUI = function() {
  var cardIndex = this._getCardIndex();

  if (cardIndex >= 0 &&
      navigator.mozIccManager &&
      navigator.mozIccManager.iccIds.length > 1) {
    if (this._simIndication) {
      var self = this;
      navigator.mozL10n.ready(function() {
        navigator.mozL10n.localize(self._simIndication,
                                   'sim-picker-button',
                                   {n: cardIndex+1});
      });
    }

    document.body.classList.add('has-preferred-sim');
  } else {
    document.body.classList.remove('has-preferred-sim');
  }
};

MultiSimActionButton.prototype._contextmenu = function(event) {
  // Don't do anything, including preventDefaulting the event, if the phone
  // number is blank. We don't want to preventDefault because we want the
  // contextmenu event to generate a click.
  var phoneNumber = this._phoneNumberGetter && this._phoneNumberGetter();
  if (!navigator.mozIccManager ||
      navigator.mozIccManager.iccIds.length === 0 ||
      phoneNumber === '' ||
      event.target.disabled ||
      (window.TelephonyHelper &&
       window.TelephonyHelper.getInUseSim() !== null)) {
    return;
  }

  if (event) {
    event.preventDefault();
  }

  var self = this;
  LazyLoader.load(['/shared/js/sim_picker.js'], function() {
    SimPicker.getOrPick(self._getCardIndex(), phoneNumber,
                        self.performAction.bind(self));
  });
};

MultiSimActionButton.prototype.performAction = function(cardIndex) {
  var phoneNumber = this._phoneNumberGetter && this._phoneNumberGetter();
  if (phoneNumber === '') {
    return;
  }

  if (cardIndex === undefined) {
    cardIndex = this._getCardIndex();
  }

  this._callCallback(phoneNumber, cardIndex);
};
