'use strict';

/* exported CallHandler */
/* global KeypadManager, LazyLoader, SimSettingsHelper, TelephonyHelper */

var CallHandler = {
  _telephony: window.navigator.mozTelephony,
  _emergencyAlert: document.getElementById('emergencyAlert'),
  _emergencyMsg: document.getElementById('emergencyAlert-msg'),
  _emergencyAlertBtn: document.getElementById('emergencyAlert-btn'),

  init: function init() {
    this._emergencyAlertBtn.addEventListener('click', function(){
      this._emergencyAlert.hidden = true;
    }.bind(this));
  },

  call: function ch_call(number, isICEContact) {
    var sanitizedNumber = number.replace(/-/g, '');
    var telephony = this._telephony;
    if (telephony) {
      if (isICEContact) {
        LazyLoader.load(['/shared/style/confirm.css',
                         '/shared/js/confirm.js',
                         '/shared/js/dialer/telephony_helper.js',
                         '/shared/js/sim_settings_helper.js'], function() {
          SimSettingsHelper.getCardIndexFrom('outgoingCall',
            function(defaultCardIndex) {
              TelephonyHelper.call(number, defaultCardIndex);
            }
          );
        });
      } else {
        var callPromise = telephony.dialEmergency(sanitizedNumber);
        callPromise.then(function(call) {
          this._installHandlers(call);
          }.bind(this)).catch(function(errorName) {
            navigator.mozL10n.once(function() {
              var _ = navigator.mozL10n.get;
              this._emergencyMsg.textContent = _('emergency-call-error',
                                                 {number: sanitizedNumber});
              this._emergencyAlert.hidden = false;
            }.bind(this));
        }.bind(this));
      }
    }
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
  }
};
/** @global CallHandler */
window.CallHandler = CallHandler;

window.addEventListener('load', function onload() {
  window.removeEventListener('load', onload);
  window.ICEContacts.updateICEContacts();
  window.KeypadManager.init();
  window.CallHandler.init();
});
