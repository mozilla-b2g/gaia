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
var ContactDataManager = {
  // TODO Add eventListener for checking if contactDB has changed.
  // Once this will be include again 'cache'.
  contactData: {},
  phoneType: [
    'mobile',
    'home',
    'work',
    'personal',
    'faxHome',
    'faxOffice',
    'faxOther',
    'another'],
  getContactData: function cm_getContactData(number, callback) {
    // so desktop keeps working
    if (!navigator.mozSms)
      return;

    var options = {
      filterBy: ['tel'],
      filterOp: 'equals',
      filterValue: number
    };

    var req = window.navigator.mozContacts.find(options);
    req.onsuccess = function onsuccess() {
      var result = req.result;
      callback(result);
    };

    req.onerror = function onerror() {
      var msg = 'Contact finding error. Error: ' + req.errorCode;
      console.log(msg);
      callback(null);
    };
  },

  searchContactData: function cm_searchContactData(string, callback) {
    // so desktop keeps working
    if (!navigator.mozSms)
      return;

    var options = {
      filterBy: ['tel', 'givenName'],
      filterOp: 'contains',
      filterValue: string
    };

    var self = this;
    var req = window.navigator.mozContacts.find(options);
    req.onsuccess = function onsuccess() {
      callback(req.result);
    };

    req.onerror = function onerror() {
      var msg = 'Contact finding error. Error: ' + req.errorCode;
      console.log(msg);
      callback(null);
    };
  }
};
