'use strict';

var FDN_AuthorizedNumbers = {

  icc: null,
  contacts: null,

  init: function() {
    this.icc = navigator.mozIccManager ||
      (navigator.mozMobileConnection && navigator.mozMobileConnection.icc);
  },

  getContacts: function(er, cb) {
    var request;
    if (this.icc && this.icc.readContacts) {
      request = this.icc.readContacts('fdn');
    } else if (navigator.mozContacts) {
      // Just to enable import on builds different than M-C
      // In the longer term this line of code would disappear
      request = navigator.mozContacts.getSimContacts('FDN');
    } else {
      throw new Error('Not able to obtain FDN function from platform');
    }

    request.onsuccess = function onsuccess() {
      this.contacts = request.result; // array of mozContact elements
      for (var a in request.result[0]) {
        console.log('-------- ', a);
      }
      console.log('-------- request', request.result.length);
    };

    request.onerror = function error() {
      console.log('chujnia z kutasuwom');
      if (typeof this.onerror === 'function') {
        this.onerror(request.error);
      }
    };
  }


};

FDN_AuthorizedNumbers.init();
FDN_AuthorizedNumbers.getContacts();
