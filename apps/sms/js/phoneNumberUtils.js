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
 * getNumberSet - We set a number string no matter which types and it will
 *   return both national format and international format number.
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
    this.region = conn ? MCC_ISO3166_TABLE[conn.data.network.mcc] : 'BR';
  },

  getNumberSet: function pnm_getNumberSet(numInput) {
    var number = this.phoneUtil.parseAndKeepRawInput(numInput, this.region);
    var nationalNum = this.phoneUtil.format(number, this.format.NATIONAL);
    var internationalNum =
          this.phoneUtil.format(number, this.format.INTERNATIONAL);
    var regex = /\D/g;
    nationalNum = nationalNum.replace(regex, '');
    internationalNum = '+' + internationalNum.replace(regex, '');
    return {national: nationalNum, international: internationalNum};
  },

  isValidNumber: function pnm_isValidNumber(numInput) {
    var number = this.phoneUtil.parseAndKeepRawInput(numInput, this.region);
    return this.phoneUtil.isValidNumber(number);
  }
};
