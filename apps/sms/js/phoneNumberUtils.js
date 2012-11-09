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
// XXX Hack: If is the first time that we are launching SMS and there is any
// problem with 'mozMobileConnection' we apply this as default
// https://bugzilla.mozilla.org/show_bug.cgi?id=809057
var PhoneNumberManager = {
  region: 'BR',
  init: function pnm_init() {
    var self = this;
    // Method for retrieving the mcc
    function getLastMcc() {
      asyncStorage.getItem('mcc', function(mcc) {
        if (mcc) {
          self.region = MCC_ISO3166_TABLE[mcc];
        }
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
        self.region = MCC_ISO3166_TABLE[conn.voice.network.mcc];
      } else {
        getLastMcc();
      }
    } else {
      getLastMcc();
    }
  },
  getNormalizedNumber: function pnm_getNormalizedNumber(numInput) {
    if (!numInput) {
      return null;
    }
    try {
      var result = PhoneNumber.Parse(numInput, this.region);
      /// XXX HACK for getting smoke test working until having in Gecko
      if (result) {
        return result.nationalFormat.replace(/\s|\(|\)|-/g, '');
      } else {
        return numInput.replace(/\s|\(|\)|-/g, '');
      }
    } catch (e) {
      return numInput.replace(/\s|\(|\)|-/g, '');
    }
  },
  getNormalizedInternationalNumber: function pnm_getNormalizedNumber(numInput) {
    if (!numInput) {
      return null;
    }
    try {
      var result = PhoneNumber.Parse(numInput, this.region);
      // XXX HACK for getting smoke test working until having in Gecko
      if (result) {
        return result.internationalFormat.replace(/\s|\(|\)|-/g, '');
      } else {
        return numInput.replace(/\s|\(|\)|-/g, '');
      }
    } catch (e) {
      return numInput.replace(/\s|\(|\)|-/g, '');
    }
  },
  getOptionalNumbers: function pnm_getOptionalNumbers(numInput) {
    if (!numInput) {
      return [numInput];
    }
    try {
      /// XXX HACK for getting smoke test working until having in Gecko
      var nationalNum = this.getNormalizedNumber(numInput);
      var internationalNum = this.getNormalizedInternationalNumber(numInput);
      var internationalNumFormatted = internationalNum.replace('+', '00');
      return [nationalNum, internationalNum, internationalNumFormatted];
    } catch (e) {
      return [numInput];
    }
  }
};
