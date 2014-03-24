'use strict';

var MockNavigatorContacts = (function() {
  var contacts = [];
  return {
    save: function(contact) {
      contacts.push(contact);
      return {};
    },
    get contacts() {
      return contacts;
    },
    resetContacts: function() {
      contacts = [];
    }
  };
})();

window.MockNavigatorContacts = MockNavigatorContacts;
