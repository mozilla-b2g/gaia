'use strict';

var FdnAuthorizedNumbers = {
  fdnContacts: null,
  icc: null,

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
      throw new Error('Could not obtain FDN support from platform');
    }

    request.onerror = er;
    request.onsuccess = (function onsuccess() {
      var result = this.fdnContacts = request.result;
      if (typeof cb !== 'function') {
        return;
      }
      var contacts = [];
      for (var i = 0, l = result.length; i < l; i++) {
        contacts.push({
          id: i,
          name: result[i].name || '',
          number: result[i].tel[0].value || ''
        });
      }
      cb(contacts);
    }).bind(this);
  },

  addNumber: function(er, cb, name, number, pinCode) {
    var contact = {
      name: [name],
      tel: [{ value: number }]
    };

    var request = this.icc.updateContact('fdn', contact, pinCode);
    request.onerror = er;
    request.onsuccess = function onsuccess() {
      cb(contact);
    };
  },

  updateNumber: function(er, cb, id, name, number, pinCode) {
    this.fdnContacts[id].name[0] = name;
    this.fdnContacts[id].tel[0].value = number;

    var request = this.icc.updateContact('fdn', this.fdnContacts[id], pinCode);
    request.onerror = er;
    request.onsuccess = (function onsuccess() {
      cb(this.fdnContacts[id]);
    }).bind(this);
  },

  removeNumber: function(er, cb, id, pinCode) {
    this.updateNumber(er, cb, id, '', '', pinCode);
  }
};

navigator.mozL10n.ready(FdnAuthorizedNumbers.init.bind(FdnAuthorizedNumbers));

