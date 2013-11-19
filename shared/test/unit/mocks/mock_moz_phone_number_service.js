var MockPhoneNumberService = {
  normalize: function(number) {
    return SimplePhoneMatcher.sanitizedNumber(number);
  }
};
