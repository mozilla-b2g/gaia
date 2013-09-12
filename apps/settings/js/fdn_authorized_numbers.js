'use strict';

var FDN_AuthorizedNumbers = {

  icc: null,
  mozContacts: null,

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
      var result = this.mozContacts = request.result;
      var contacts = [];

      for (var i = 0, l = result.length; i < l; i++) {
        contacts.push(
          {
            id: i,
            name: result[i].name || '',
            number: result[i].tel[0].value || ''
          }
        );
      }

      if (typeof cb === 'function') {
        cb(contacts);
      }
    };.bind(this);

    request.onerror = function error() {
      if (typeof er === 'function') {
        er(request.error);
      }
    };
  },

  addNumber: function(er, cb, name, number) {
    var contact = {
      name: [name],
      tel: [
        {
          value: number
        }
      ]
    };

    var request = this.icc.updateContact('fdn', contact);
    request.onsuccess = function onsuccess() {
      cb(contact);
    };
    request.onerror = function onerror(e) {
      er(e);
    };
  },

  updateNumber: function(er, cb, id, name, number) {
    this.mozContacts[id].name[0] = name;
    this.mozContacts[id].tel.value = number;

    var request = this.icc.updateContact('fdn', this.mozContacts[id], 0071);
    request.onsuccess = function onsuccess() {
      cb(this.mozContacts[id]);
    };.bind(this);
    request.onerror = function onerror(e) {
      er(e);
    };
  },

  removeNumber: function(er, cb, id) {
    this.updateNumber(er, cb, id, '', '');
  }

};

navigator.mozL10n.ready(FDN_AuthorizedNumbers.init.bind(FDN_AuthorizedNumbers));
