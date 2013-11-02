/*global MockContact */
/*exported MockContacts */

'use strict';

requireApp('sms/test/unit/mock_contact.js');

var MockContacts = {
  mAsync: false,
  mCallCallback: function mc_mCallCallback(callback, result) {
    if (this.mAsync) {
      setTimeout(function nextTick() {
        callback(result);
      });
    } else {
      callback(result);
    }
  },

  findBy: function mc_findBy(filter, callback) {
    var result = MockContact.list();
    this.mCallCallback(callback, result);
  },

  findByPhoneNumber: function mc_findByPhoneNumber(value, callback) {
    var result = MockContact.list();
    this.mCallCallback(callback, result);
  },

  findByString: function mc_findByString(value, callback) {
    var result = MockContact.list();
    this.mCallCallback(callback, result);
  },

  findExact: function mc_findByString(value, callback) {
    var result = MockContact.list();
    this.mCallCallback(callback, result);
  },

  mTeardown: function mc_mTeardown() {
    this.mAsync = false;
  }
};
