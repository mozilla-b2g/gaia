'use strict';

var utils = window.utils || {};

if (!utils.misc) {
  utils.misc = {};
  utils.misc.toMozContact = function ut_toMozContact(contact) {
    var outContact = contact;
    if (!(contact instanceof mozContact)) {
      outContact = new mozContact(contact);
      outContact.id = contact.id || outContact.id;
    }
    return outContact;
  };
}
