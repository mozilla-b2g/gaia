/* 
 * Contact Manager
*/
var ContactDataManager = {
  contactData: {},

  getContactData: function cm_getContactData(number, callback) {
    // so desktop keeps working
    if (!navigator.mozContacts) {
      return;
    }
    var numNormalized = PhoneNumberManager.getNormalizedNumber(number);
    // Based on E.164 (http://en.wikipedia.org/wiki/E.164)
    if (number.length < 8) {
      var options = {
        filterBy: ['tel'],
        filterOp: 'equals',
        filterValue: number
      };
    } else {
      // Based on E.164 (http://en.wikipedia.org/wiki/E.164)
      // Some locals added a '0' at the beggining (UK, Sweden...)
      if (numNormalized[0] == 0 || numNormalized[0] == '0') {
        var numNormalized = Number(numNormalized.toString().substr(1));
      }
      var options = {
        filterBy: ['tel'],
        filterOp: 'contains',
        filterValue: numNormalized
      };
    }
    var self = this;
    var req = window.navigator.mozContacts.find(options);
    req.onsuccess = function onsuccess() {
      // TODO Add cache if it's feasible without PhoneNumberJS
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
      filterBy: ['tel', 'givenName', 'familyName'],
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
