/* globals CallHandler, KeypadManager, LazyLoader, SimPicker,
           SimSettingsHelper */
/* exported CallButton */

'use strict';

var CallButton = {
  _imports: ['/shared/js/option_menu.js',
             '/shared/js/sim_picker.js',
             '/shared/js/sim_settings_helper.js'],

  init: function cb_init(button) {
    button.addEventListener('click', this._click.bind(this));

    if (window.navigator.mozMobileConnections &&
        window.navigator.mozMobileConnections.length > 1) {
      button.addEventListener('contextmenu', this._contextmenu.bind(this));
    }
  },

  _click: function cb_click(event) {
    if (event) {
      event.preventDefault();
    }

    if (KeypadManager.phoneNumber === '') {
      return;
    }

    if (window.navigator.mozMobileConnections &&
        window.navigator.mozMobileConnections.length > 1) {
      var self = this;
      LazyLoader.load(this._imports, function() {
        SimSettingsHelper.getCardIndexFrom('outgoingCall', function(cardIndex) {
          // The user has requested that we ask them every time for this key,
          // so we prompt them to pick a SIM even when they only click.
          if (cardIndex == SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE) {
            SimPicker.show(cardIndex, KeypadManager.phoneNumber,
                           self.makeCall.bind(self));
          } else {
            self.makeCall();
          }
        });
      });
    } else {
      this.makeCall();
    }
  },

  _contextmenu: function cb_contextmenu(event) {
    // Don't do anything, including preventDefaulting the event, if the phone
    // number is blank. We don't want to preventDefault because we want the
    // contextmenu event to generate a click.
    if (KeypadManager.phoneNumber === '') {
      return;
    }

    if (event) {
      event.preventDefault();
    }

    var self = this;
    LazyLoader.load(this._imports, function() {
      SimSettingsHelper.getCardIndexFrom('outgoingCall', function(cardIndex) {
        SimPicker.show(cardIndex, KeypadManager.phoneNumber,
                       self.makeCall.bind(self));
      });
    });
  },

  getDefaultCardIndex: function cb_getDefaultCardIndex(callback) {
    var conn = window.navigator.mozMobileConnection;
    var connections = window.navigator.mozMobileConnections;
    if (conn) {
      callback(0);
      return;
    }

    var settings = navigator.mozSettings;
    if (!settings || !connections) {
      callback(null);
      return;
    }

    if (connections.length === 1) {
      callback(0);
      return;
    }

    var req = settings.createLock().get('ril.telephony.defaultServiceId');

    req.onsuccess = function getDefaultServiceId() {
      var id = req.result['ril.telephony.defaultServiceId'] || 0;
      callback(id);
    };

    req.onerror = function getDefaultServiceIdError() {
      callback(null);
    };
  },

  makeCall: function cb_makeCall(cardIndex) {
    var self = this;
    LazyLoader.load(['/shared/js/sim_settings_helper.js'], function() {
      var phoneNumber = KeypadManager.phoneNumber;

      if (phoneNumber === '') {
        KeypadManager.fetchLastCalled();
      } else if (cardIndex !== undefined) {
        CallHandler.call(phoneNumber, cardIndex);
      } else {
        self.getDefaultCardIndex(function(defaultCardIndex) {
          CallHandler.call(phoneNumber, defaultCardIndex);
        });
      }
    });
  },
};
