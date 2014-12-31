/* export ChangePasscodeScreen */

define(function(require) {
  'use strict';

  var ChangePasscodeScreen = function() {

      /**
       * Makes a RIL request to change the passcode.
       * @param api Object mobileConnection to be used for the call.
       * @param data info related to the PIN code. In the form:
       * {
       *    'pin':    // current passcode
       *    'newPin': // new passcode
       * }
       */
      function _changeCallBarringPasscode(api, pinData) {
        return new Promise(function finished(resolve, reject) {
          var request = api.changeCallBarringPassword(pinData);
          request.onsuccess = function() {
            resolve();
          };
          request.onerror = function() {
            /* request.error = { name, message } */
            reject(request.error);
          };
        });
      }

    return {
      change: _changeCallBarringPasscode
    };
  };

  return ChangePasscodeScreen;
});
