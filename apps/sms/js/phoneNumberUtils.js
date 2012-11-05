/* Phone Number Manager for solving the country code format threadinf issue.
 * This Phone Number Manager required:
 * 1) PhoneNumberJS by Andreas Gal https://github.com/andreasgal/PhoneNumber.js
 * 2) mcc(Mobile Country Codes) - iso3166 country code table
 * 
 * Methods in the PhoneNumberManager:
 * init - Setup mobile country code (mcc).
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
    // TODO: Here we use Brazil for default mcc. We may need to record the mcc
    //       and apply it if we could not get connection data in the future.

    // Incluir el async storage
    
    var presetMCC = 'ES';
    var conn = window.navigator.mozMobileConnection;
    if (!!conn) {
      if (conn.cardState == 'ready') {
        var currentMCC = conn.voice.network.mcc;
        if (currentMCC != 0) {
          // Retrieve the last one
          this.region = MCC_ISO3166_TABLE[conn.voice.network.mcc];
        } else {
          this.region = presetMCC;
        }
      } else {
        this.region = presetMCC;
      }
      
    } else {
      
      this.region = presetMCC;
    }
  },
  getNormalizedNumber: function pnm_getNormalizedNumber(numInput) {
    try {
      var result = PhoneNumber.Parse(numInput, this.region);
      return result.nationalFormat;
    } catch (e) {
      return numInput;
    }
  },
  getNormalizedInternationalNumber: function pnm_getNormalizedNumber(numInput) {
    try {
      var result = PhoneNumber.Parse(numInput, this.region);
      return result.internationalFormat;
    } catch (e) {
      return numInput;
    }
  },
  getOptionalNumbers: function pnm_getOptionalNumbers(numInput) {
    try {
      var result = PhoneNumber.Parse(numInput, this.region);
      var nationalNum = result.nationalFormat;
      var internationalNum = result.internationalFormat;
      var internationalNumFormatted = internationalNum.replace('+', '00');
      return [nationalNum, internationalNum, internationalNumFormatted];
    } catch (e) {
      return [numInput];
    }
  }
};
