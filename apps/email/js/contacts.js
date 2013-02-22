/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ContactDataManager = {
  contactData: {},

  getContactData: function cm_getContactData(email, callback) {
    // so desktop keeps working
    if (!navigator.mozContacts) {
      return;
    }
    // Get contacts given a number
    var options = {
      filterBy: ['email'],
      filterOp: 'contains',
      filterValue: email
    };
    var self = this;
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
  }
};
