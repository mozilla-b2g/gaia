/*global MockContact */
/*exported MockContacts */

'use strict';

require('/test/unit/mock_contact.js');

var MockContacts = {
  findBy: () => Promise.resolve(MockContact.list()),
  findByPhoneNumber: () => Promise.resolve(MockContact.list()),
  findByAddress: () => Promise.resolve(MockContact.list()),
  findExactByEmail: () => Promise.resolve(MockContact.list()),
  findByString: () => Promise.resolve(MockContact.list()),
  findExact: () => Promise.resolve(MockContact.list()),
  addUnknown: () => {}
};
