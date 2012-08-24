/* Contact Manager for maintaining contact cache and access contact DB:
 * 1. Maintain used contacts in contactData object literal.
 * 2. getContactData: Callback with contact data from 1)cache 2)indexedDB.
 * If cache return "undefined". There will be no callback from cache.
 * Callback will be called twice if cached data turned out to be different than
 * the data from db.
 * Contact return data type:
 *   a) null : Request indexedDB error.
 *   b) Empty array : Request success with no matched result.
 *   c) Array with objects : Request success with matched contacts.
 *
 * XXX Note: We presume that contact.name has only one entry.
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
