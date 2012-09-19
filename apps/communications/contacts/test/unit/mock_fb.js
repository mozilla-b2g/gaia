'use strict';

var MockFb = {
  fbContact: false,
  fbLinked: false
};

MockFb.setIsFbContact = function(isFB) {
  this.fbContact = isFB;
};

MockFb.setIsFbLinked = function(isLinked) {
  this.fbLinked = isLinked;
};

MockFb.Contact = function(deviceContact, cid) {
  this.deviceContact = deviceContact;
  this.cid = cid;

  var getData = function getData() {
    return {
      set onsuccess(callback) {
        // Fetch FB data, that is returning a contact info
        this.result = new MockContactAllFields();
        this.result.org[0] = 'FB';
        callback.call(this);
      },
      set onerror(callback) {

      }
    };
  };

  return {
    'getData': getData
  };
};

MockFb.isFbContact = function(contact) {
  return this.fbContact;
};

MockFb.isFbLinked = function(contact) {
  return this.fbLinked;
};
