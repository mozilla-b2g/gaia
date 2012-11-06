/* Phone Number Manager for solving the country code format threadinf issue.
 * This Phone Number Manager required:
 * 1) PhoneNumberJS by Andreas Gal https://github.com/andreasgal/PhoneNumber.js
 * 2) mcc(Mobile Country Codes) - iso3166 country code table
 *
 * Methods in the PhoneNumberManager:
 * init - Setup mobile country code (mcc).
 *
 * getNormalizedInternationalNumber - Ruturn the phone number with 
 * international format. If is invalid, returns number without formatting.
 *
 * getNormalizedNumber - Ruturn the phone number with national format.
 *   If is invalid, returns number without formatting.
 *
 * getOptionalNumbers - Retrieve the set of possibilites given an number
 *
*/
var PhoneNumberManager = {
  init: function pnm_init() {
    // XXX Hack: If is the first time that we are launching SMS and there is any
    // problem with 'mozMobileConnection' we apply this as default
    var presetMCC = 'ES';
    // Method for retrieving the mcc
    var self = this;
    function getLastMcc() {
      asyncStorage.getItem('mcc', function(mcc) {
        if (mcc) {
          self.region = mcc;
          return;
        }
        self.region = presetMCC;
      });
    }
    // Update the MCC properly, retrieving for network
    var conn = window.navigator.mozMobileConnection;
    if (!!conn) {
      if (conn.voice.connected) {
        var currentMCC = conn.voice.network.mcc;
        // Update value of latest mcc retrieved
        asyncStorage.setItem('mcc', currentMCC);
        // Retrieve region
        this.region = MCC_ISO3166_TABLE[conn.voice.network.mcc];
      } else {
        getLastMcc();
      }
    } else {
      getLastMcc();
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
