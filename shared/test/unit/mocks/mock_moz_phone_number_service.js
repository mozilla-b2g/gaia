'use strict';
/* global SimplePhoneMatcher */
/* exported MockPhoneNumberService */

var MockPhoneNumberService = {
  normalize: function(number) {
    return SimplePhoneMatcher.sanitizedNumber(number);
  }
};
