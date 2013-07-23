'use strict';

var MockMatchingContactsHtml = (function MockMatchingContactsHtml() {
  var req = new XMLHttpRequest();
  req.open('GET', '/contacts/test/unit/mock_matching_contacts.html', false);
  req.send(null);

  return req.responseText;
})();
