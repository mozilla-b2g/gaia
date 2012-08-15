'use strict';

var CallHandler = {
  call: function ch_call(number) {
    var sanitizedNumber = number.replace(/-/g, '');
    var telephony = window.navigator.mozTelephony;
    if (telephony) {
      var call = telephony.dialEmergency(sanitizedNumber);
      if (call) {
        var cb = function clearPhoneView() {
          KeypadManager.updatePhoneNumber('');
        };
        call.onconnected = cb;
        call.ondisconnected = cb;
      }
    }
  }
};

window.addEventListener('load', function onload() {
  window.removeEventListener('load', onload);
  KeypadManager.init();
});
