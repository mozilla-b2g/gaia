/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
// This file is directly copied from apps/sms/js/contacts.js
'use strict';

var ContactDataManager = {
  contactData: {},

  _search: function cm_queryContact(options, callback) {
    // so desktop keeps working
    if (!navigator.mozContacts) {
      return;
    }
    var req = navigator.mozContacts.find(options);
    req.onsuccess = function onsuccess() {
      // TODO Add cache if it's feasible without PhoneNumberJS
      callback(req.result);
    };
    req.onerror = function onerror() {
      var msg = 'Contact finding error. Error: ' + req.errorCode;
      callback(null);
    };
  },

  getContactData: function cm_getContactData(number, callback) {
    // Get contacts given a number
    var options = {
      filterBy: ['tel'],
      filterOp: 'contains',
      filterValue: number,
      sortBy: 'familyName'
    };

    this._search(options, callback);
  },

  searchContactData: function cm_searchContactData(string, callback) {
    var options = {
      filterBy: ['tel', 'givenName', 'familyName'],
      filterOp: 'contains',
      filterValue: string
    };

    this._search(options, callback);
  }
};
