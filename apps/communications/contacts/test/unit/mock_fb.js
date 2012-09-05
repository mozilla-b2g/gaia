'use strict';

var MockFb = {};
MockFb.Contact = function(deviceContact, cid) {
  this.deviceContact = deviceContact;
  this.cid = cid;
};

MockFb.isFbContact = function(contact) {
    return false;
};

MockFb.isFbLinked = function(contact) {
    return false;
};
