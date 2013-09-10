'use strict';

var FDN_AuthorizedNumbers = {

  icc: null,
  contacts: [],

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
      var result = request.result;

      for (var i = 0, l = result.length; i < l; i++) {
        this.contacts.push(
          {
            name: result[i].name || '',
            number: result[i].tel[0].value || ''
          }
        );
      }

      if (typeof cb === 'function') {
        cb(this.contacts);
      }
    };.bind(this);

    request.onerror = function error() {
      if (typeof er === 'function') {
        er(request.error);
      }
    };
  }


};
