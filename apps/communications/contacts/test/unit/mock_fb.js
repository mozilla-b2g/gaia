'use strict';

var fb = {};
fb.Contact = function(deviceContact, cid) {
  this.deviceContact = deviceContact;
  this.cid = cid;
};

fb.isFbContact = function(contact) {
    return false;
};

fb.isFbLinked = function(contact) {
    return false;
};
