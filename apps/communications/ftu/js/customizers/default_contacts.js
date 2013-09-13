'use strict';

requireApp('system/shared/test/unit/mocks/mock_moz_contact.js');

var DefaultContacts = {
  saveContacts: function(contacts) {
    for (var i = 0; i < contacts.length; ++i) {
      var contact = new mozContact();
      contact.init(contacts[i]);
      navigator.mozContacts.save(contact);
    }
  },

  init: function() {
    if (!('mozContact' in window && 'mozContacts' in navigator)) {
      console.log('Contacts API not available');
      return;
    }

    window.addEventListener('customization', function saveContacts(event) {
      window.removeEventListener('customization', saveContacts);
      if (event.detail.setting == 'default_contacts') {
        saveContacts(event.detail.value);
      }
    });
  }
};

DefaultContacts.init();
