console.time("mock_moz_phone_number_service.js");
'use strict';
/* global SimplePhoneMatcher */
/* exported MockPhoneNumberService */

var MockPhoneNumberService = {
  normalize: function(number) {
    return SimplePhoneMatcher.sanitizedNumber(number);
  }
};
console.timeEnd("mock_moz_phone_number_service.js");
