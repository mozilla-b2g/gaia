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
  getContactData: function cm_getContactData(options, callback) {
    var isCacheable = options.filterBy.indexOf('tel') !== -1 &&
                      options.filterOp == 'contains';
    var cacheResult = this.contactData[options.filterValue];
    if (isCacheable && typeof cacheResult !== 'undefined') {
      var cacheArray = cacheResult ? [cacheResult] : [];
      callback(cacheArray);
    }

    var self = this;
    var req = window.navigator.mozContacts.find(options);
    req.onsuccess = function onsuccess() {
      // Update the cache before callback.
      if (isCacheable) {
        var cacheData = self.contactData[options.filterValue];
        var result = req.result;
        if (result.length > 0) {
          if (cacheData && (cacheData.name[0] == dbData.name[0]))
            return;

          self.contactData[options.filterValue] = result[0];
        } else {
          if (cacheData === null)
            return;

          self.contactData[options.filterValue] = null;
        }
      }
      callback(result);
    };

    req.onerror = function onerror() {
      var msg = 'Contact finding error. Error: ' + req.errorCode;
      console.log(msg);
      callback(null);
    };
  }
};
