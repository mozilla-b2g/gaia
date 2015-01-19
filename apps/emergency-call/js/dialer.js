'use strict';

/* globals KeypadManager, ICEContacts, LazyLoader, SimSettingsHelper,
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
          if (defaultCardIndex === SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE) {
            LazyLoader.load(['/shared/js/component_utils.js',
                             '/shared/elements/gaia_sim_picker/script.js'],
            function() {
              var simPicker = document.getElementById('sim-picker');
              simPicker.getOrPick(defaultCardIndex, number, function(ci) {
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
  /* Tell the audio channel manager that we want to adjust the "notification"
   * channel when the user presses the volumeup/volumedown buttons. */
  if (navigator.mozAudioChannelManager) {
    navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
  }

  window.removeEventListener('load', onload);
  window.ICEContacts.updateICEContacts();
  window.KeypadManager.init(/* oncall */ false);
});
