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

  get: function(phone) {
    return MockContacts.data.get(phone);
  },
  set: function(phone, record) {
    MockContacts.data.set(phone, record);
  },
  has: function() {
    return MockContacts.data.has(phone);
  },
  delete: function() {
    MockContacts.data.delete(phone);
  },
  clear: function() {
    MockContacts.data.clear();
  },
  request: function() {},

  mTeardown: function mc_mTeardown() {
    this.mAsync = false;
  }
};


MockContacts.data = new Map();
