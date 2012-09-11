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

    var cacheResult = this.contactData[number];
    if (cacheResult) {
      var cacheArray = cacheResult ? [cacheResult] : [];
      callback(cacheArray);
    }

    var self = this;
    var req = window.navigator.mozContacts.find(options);
    req.onsuccess = function onsuccess() {
      // Update the cache before callback.
      var cacheData = self.contactData[number];
      var result = req.result;
      if (result.length > 0) {
        if (cacheData && (cacheData.name[0] == result[0].name[0])) {
          var telInfo;
          // Retrieving the info of the telephone
          for (var i = 0; i < cacheData.tel.length; i++) {
            if (cacheData.tel[i].value == number) {
              telInfo = cacheData.tel[i];
              break;
            }
          }
          // Check if phone type and carrier have changed
          for (var i = 0; i < result[0].tel.length; i++) {
            if (result[0].tel[i].value == number) {
              if (!(result[0].tel[i].type == telInfo.type &&
                result[0].tel[i].carrier == telInfo.carrier)) {
                self.contactData[number] = result[0];
              }
              break;
            }
          }
        }else {
          self.contactData[number] = result[0];
        }
      } else {
        if (cacheData) {
          delete self.contactData[number];
        }
      }
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
