/* export ChangePasscodeScreen */

define(function(require) {
  'use strict';

  var ChangePasscodeScreen = function() {

      /**
       * Makes a RIL request to change the passcode.
       * @param api - api object mobileConnection to be used for the call.
       * @param pinData - data info related to the PIN code.
       * @param pinData.pin - current passcode
       * @param pinData.newPin - new passcode
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
