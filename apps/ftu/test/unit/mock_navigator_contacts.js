'use strict';

(function(window) {
  var contacts = [];
  window.MockNavigatorContacts = {
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
})(this);
