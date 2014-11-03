'use strict';

/* globals KeypadManager, ICEContacts, LazyLoader, SimSettingsHelper, SimPicker,
           TelephonyMessages */
/* exported CallHandler */

var CallHandler = {
  _telephony: window.navigator.mozTelephony,

  call: function(number) {
    var sanitizedNumber = number.replace(/-/g, ''),
        self = this;

    if (ICEContacts.isFromICEContact(number)) {
      LazyLoader.load(['/shared/js/sim_settings_helper.js'], function() {
        SimSettingsHelper.getCardIndexFrom('outgoingCall',
        function(defaultCardIndex) {
          if (defaultCardIndex == SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE) {
            var simPickerElt = document.getElementById('sim-picker');
            var simFiles = [simPickerElt,
                            '/shared/js/sim_picker.js',
                            '/shared/style/sim_picker.css'];
            LazyLoader.load(simFiles, function() {
              SimPicker.getOrPick(defaultCardIndex, number, function(ci) {
                var callPromise = self._telephony.dial(number, ci);
                self._handleCallPromise(callPromise, sanitizedNumber);
              });
            });
          } else {
            var callPromise = self._telephony.dial(number, defaultCardIndex);
            self._handleCallPromise(callPromise, sanitizedNumber);
          }
        });
      });
    } else {
      var callPromise = self._telephony.dialEmergency(sanitizedNumber);
      self._handleCallPromise(callPromise, sanitizedNumber);
    }
  },

  _handleCallPromise: function(callPromise, sanitizedNumber) {
    var self = this;

    callPromise.then(function(call) {
      self._installHandlers(call);
    }).catch(function(errorName) {
      LazyLoader.load(['/shared/js/dialer/telephony_messages.js'], function() {
        TelephonyMessages.handleError(
          errorName, sanitizedNumber, TelephonyMessages.EMERGENCY_ONLY);
      });
    });
  },

  _installHandlers: function(call) {
    if (call) {
      var cb = function clearPhoneView() {
        KeypadManager.updatePhoneNumber('');
      };
      call.onconnected = cb;

      call.ondisconnected = function callEnded() {
        cb();
      };
    }
  },
};

/** @global CallHandler */
window.CallHandler = CallHandler;

window.addEventListener('load', function onload() {
  window.removeEventListener('load', onload);
  window.ICEContacts.updateICEContacts();
  window.KeypadManager.init();
});
