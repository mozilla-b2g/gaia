'use strict';

/* exported CallHandler */
/* global KeypadManager */

var CallHandler = {
  _telephony: window.navigator.mozTelephony,

  call: function ch_call(number) {
    var sanitizedNumber = number.replace(/-/g, '');
    var telephony = this._telephony;
    if (telephony) {
      /* XXX: Temporary fix to handle old and new telephony API
         To remove when bug 969218 lands */
      var promiseOrCall = telephony.dialEmergency(sanitizedNumber);
      if (promiseOrCall && promiseOrCall.then) {
        promiseOrCall.then(function(call) {
          this._installHandlers(call);
        }.bind(this));
      } else {
        this._installHandlers(promiseOrCall);
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
  window.KeypadManager.init();
});
