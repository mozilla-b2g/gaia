/*global MockContact */
/*exported MockContacts */

'use strict';

require('/views/shared/test/unit/mock_contact.js');

(function(exports) {
  function returnMock() {
    var result = MockContact.list();
    return Promise.resolve(result);
  }

  exports.MockContacts = {
    findBy: returnMock,
    findByPhoneNumber: returnMock,
    findByAddress: returnMock,
    findExactByEmail: returnMock,
    findByString: returnMock,
    findExact: returnMock,
    addUnknown: () => {},
  };
})(window);
