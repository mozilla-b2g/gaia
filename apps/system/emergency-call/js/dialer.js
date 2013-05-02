'use strict';

var CallHandler = {
  _telephony: window.navigator.mozTelephony,

  call: function ch_call(number) {
    var sanitizedNumber = number.replace(/-/g, '');
    var telephony = this._telephony;
    if (telephony) {
      var call = telephony.dialEmergency(sanitizedNumber);
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
  }
};

window.addEventListener('load', function onload() {
  window.removeEventListener('load', onload);
  KeypadManager.init();
});
