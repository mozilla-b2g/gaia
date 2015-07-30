/* globals LazyLoader, SettingsListener */
/* exported MultiSimActionButton */

'use strict';

// Keep this in sync with SimSettingsHelper.
const ALWAYS_ASK_OPTION_VALUE = -1;

var MultiSimActionButton = function MultiSimActionButton(
  button, callCallback, settingsKey, phoneNumberGetter) {
  this._button = button;
  this._callCallback = callCallback;
  this._settingsKey = settingsKey;
  this._phoneNumberGetter = phoneNumberGetter;
  this._simPicker = null;

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

  if (this._clickQueued) {
    this._clickQueued = false;
    this._click();
  }
};

// Returns the currently in-use SIM, or default card index for this service if
// it has been loaded. Returns undefined if the setting hasn't been loaded yet.
MultiSimActionButton.prototype._getCardIndexIfLoaded = function() {
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

  if (event) {
    // Prevent the KeypadManager handler from triggering.
    event.stopImmediatePropagation();
  }

  if (navigator.mozIccManager.iccIds.length === 0) {
    // We don't care what slot to call on, as emergency calls for example will
    // go through on any slot.
    this.performAction(0);
    return;
  }

  var cardIndex = this._getCardIndexIfLoaded();
  // Poor man's promise. If the default card index hasn't been loaded yet, then
  // queue up a click and come back here when we have it.
  if (cardIndex === undefined) {
    this._clickQueued = true;
    return;
  }

  if (cardIndex === ALWAYS_ASK_OPTION_VALUE) {
    // The user has requested that we ask them every time for this key,
    // so we prompt them to pick a SIM even when they only click.
    this._getOrPickSim(cardIndex, phoneNumber);
  } else {
    this.performAction(cardIndex);
  }
};

MultiSimActionButton.prototype._getOrPickSim =
function(cardIndex, phoneNumber) {
  var self = this;
  LazyLoader.load(['/shared/elements/gaia_sim_picker/script.js'], function() {
    self._simPicker = document.getElementById('sim-picker');
    self._simPicker.getOrPick(cardIndex, phoneNumber,
                              self.performAction.bind(self));
  });
};

MultiSimActionButton.prototype._updateUI = function() {
  var cardIndex = this._getCardIndexIfLoaded();

  if (cardIndex >= 0 &&
      navigator.mozIccManager &&
      navigator.mozIccManager.iccIds.length > 1) {
    if (this._simIndication) {
      var self = this;
      var l10nId = this._simIndication.dataset.l10nId ||
                   'gaia-sim-picker-button';
      navigator.mozL10n.setAttributes(self._simIndication,
                                      l10nId,
                                      {n: cardIndex+1});
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

  // We generally expect that the setting would be loaded by the time a
  // contextmenu event could be fired (since it's usually triggered by long
  // pressing for ~0.4s), but if not, we bail out.
  if (this._getCardIndexIfLoaded() === undefined) {
    return;
  }

  if (event) {
    event.preventDefault();
  }

  this._getOrPickSim(this._getCardIndexIfLoaded(), phoneNumber);
};

MultiSimActionButton.prototype.performAction = function(cardIndex) {
  var phoneNumber = this._phoneNumberGetter && this._phoneNumberGetter();
  if (phoneNumber === '') {
    return;
  }

  if (cardIndex === undefined) {
    cardIndex = this._getCardIndexIfLoaded();
  }

  this._callCallback(phoneNumber, cardIndex);
};
