/* globals LazyLoader, SettingsListener, SimPicker */
/* exported CallButton */

'use strict';

// Keep this in sync with SimSettingsHelper.
const ALWAYS_ASK_OPTION_VALUE = '-1';

var CallButton = {

  _phoneNumberGetter: null,
  _callCallback: null,
  _settingsKey: null,

  init: function cb_init(button, phoneNumberGetter, callCallback, settingsKey) {
    this._phoneNumberGetter = phoneNumberGetter;
    this._callCallback = callCallback;
    this._settingsKey = settingsKey;

    button.addEventListener('click', this._click.bind(this));

    if (navigator.mozIccManager &&
        navigator.mozIccManager.iccIds.length > 1) {
      button.addEventListener('contextmenu', this._contextmenu.bind(this));

      var self = this;
      LazyLoader.load(['/shared/js/settings_listener.js'], function() {
        self._simIndication = button.querySelector('.js-sim-indication');
        SettingsListener.observe(settingsKey, 0, self._updateUI.bind(self));
      });
    }
  },

  _getCardIndex: function cb_getCardIndex(callback) {
    var settingsKey = this._settingsKey;
    var settings = navigator.mozSettings;
    var getReq = settings.createLock().get(settingsKey);
    var done = function done() {
      callback(getReq.result[settingsKey]);
    };
    getReq.onsuccess = done;
    getReq.onerror = function() {
      console.error('Failed to retrieve ', settingsKey);
    };
  },

  _click: function cb_click(event) {
    if (event) {
      event.preventDefault();
    }

    var phoneNumber = this._phoneNumberGetter();
    if (!navigator.mozIccManager || phoneNumber === '') {
      return;
    }

    if (navigator.mozIccManager.iccIds.length === 1) {
      this.makeCall();
      return;
    }

    var self = this;
    self._getCardIndex(function(cardIndex) {
      // The user has requested that we ask them every time for this key,
      // so we prompt them to pick a SIM even when they only click.
      if (cardIndex == ALWAYS_ASK_OPTION_VALUE) {
        LazyLoader.load(['/shared/js/sim_picker.js'], function() {
          SimPicker.show(cardIndex, phoneNumber, self.makeCall.bind(self));
        });
      } else {
        self.makeCall();
      }
    });
  },

  _updateUI: function cb_updateUI(cardIndex) {
    if (cardIndex >= 0 && navigator.mozIccManager &&
        navigator.mozIccManager.iccIds.length > 1) {
      if (this._simIndication) {
        var self = this;
        navigator.mozL10n.ready(function() {
          navigator.mozL10n.localize(self._simIndication,
                                     'sim-picker-button', {n: cardIndex+1});
        });
      }

      document.body.classList.add('has-preferred-sim');
    } else {
      document.body.classList.remove('has-preferred-sim');
    }
  },

  _contextmenu: function cb_contextmenu(event) {
    // Don't do anything, including preventDefaulting the event, if the phone
    // number is blank. We don't want to preventDefault because we want the
    // contextmenu event to generate a click.
    var phoneNumber = this._phoneNumberGetter();
    if (!navigator.mozIccManager ||
        navigator.mozIccManager.iccIds.length === 1 ||
        phoneNumber === '') {
      return;
    }

    if (event) {
      event.preventDefault();
    }

    var self = this;
    self._getCardIndex(function(cardIndex) {
      LazyLoader.load(['/shared/js/sim_picker.js'], function() {
        SimPicker.show(cardIndex, phoneNumber, self.makeCall.bind(self));
      });
    });
  },

  makeCall: function cb_makeCall(cardIndex) {
    var phoneNumber = this._phoneNumberGetter();
    if (phoneNumber === '') {
      return;
    }

    if (cardIndex !== undefined) {
      this._callCallback(phoneNumber, cardIndex);
    } else {
      var self = this;
      this._getCardIndex(function(cardIndex) {
        self._callCallback(phoneNumber, cardIndex);
      });
    }
  },
};
