/* Phone Number Manager for solving the country code format threadinf issue.
 * This Phone Number Manager required:
 * 1) google libphonenumber, and using this library requires:
 *   1-1) google closure-library.
 * 2) mcc(Mobile Country Codes) - iso3166 country code table
 * These file were all placed in js ext folder. Please include these library/
 * folder before using PhoneNumberManager.
 *
 * Methods in the PhoneNumberManager:
 * init - Setup up PhoneNumberUtil and mobile country code.
 *
 * getInternationalNum - Ruturn the phone number with international format.
 *   If the second parameter is true, it will return original input number
 *   while input number in invalid format, otherwise return null.
 *
 * getNationalNum - Ruturn the phone number with national format.
 *   If the second parameter is true, it will return original input number
 *   while input number in invalid format, otherwise return null.
 *
 * isValidNumber - We set a number string and it will check if the phone number
 *   is valid or not.
 *
*/
var PhoneNumberManager = {
  init: function pnm_init() {
    this.phoneUtil = i18n.phonenumbers.PhoneNumberUtil.getInstance();
    this.format = i18n.phonenumbers.PhoneNumberFormat;
    var conn = window.navigator.mozMobileConnection;
    // TODO: Here we use Brazil for default mcc. We may need to record the mcc
    //       and apply it if we could not get connection data in the future.
    this.region = conn ? MCC_ISO3166_TABLE[conn.voice.network.mcc] : 'ES';
  },
  getNormalizedNumber: function pnm_getNormalizedNumber(numInput) {
    try {
      var normalized = PhoneNumberManager.getNationalNum(numInput, true);
      return normalized;
    } catch (e) {
      return numInput;
    }
  },
  getNormalizedInternationalNumber: function pnm_getNormalizedNumber(numInput) {
    try {
      var normalized = PhoneNumberManager.getInternationalNum(numInput, true);
      return normalized;
    } catch (e) {
      return numInput;
    }
  },
  getOptionalNumbers: function pnm_getOptionalNumbers(numInput) {
    try {
      var nationalNum = PhoneNumberManager.getNationalNum(numInput, true);
      var internationalNum =
        PhoneNumberManager.getInternationalNum(numInput, true);
      var internationalNumFormatted = internationalNum.replace('+', '00');
      return [nationalNum, internationalNum, internationalNumFormatted];
    } catch (e) {
      return [numInput];
    }
  },
  getInternationalNum: function pnm_getInternationalNum(numInput, returnOri) {
    var number = this.phoneUtil.parseAndKeepRawInput(numInput, this.region);
    if (!this.phoneUtil.isValidNumber(number))
      return returnOri ? numInput : null;

    var internationalNum =
          this.phoneUtil.format(number, this.format.INTERNATIONAL);
    var regex = /\D/g;
    internationalNum = '+' + internationalNum.replace(regex, '');
    return internationalNum;
  },

  getNationalNum: function pnm_getNationalNum(numInput, returnOri) {
      var number = this.phoneUtil.parseAndKeepRawInput(numInput, this.region);
      if (!this.phoneUtil.isValidNumber(number))
        return returnOri ? numInput : null;

      var nationalNum = this.phoneUtil.format(number, this.format.NATIONAL);
      var regex = /\D/g;
      nationalNum = nationalNum.replace(regex, '');
      return nationalNum;
  },

  isValidNumber: function pnm_isValidNumber(numInput) {
    var number = this.phoneUtil.parseAndKeepRawInput(numInput, this.region);
    return this.phoneUtil.isValidNumber(number);
  }
};
