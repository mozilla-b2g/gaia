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

window.addEventListener('localized', function startup(evt) {
  window.removeEventListener('localized', startup);
  KeypadManager.init();

  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});


