'use strict';

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

    var self = this;
    window.addEventListener('customization', function customize(event) {
      window.removeEventListener('customization', customize);
      if (event.detail.setting == 'default_contacts') {
        self.saveContacts(event.detail.value);
      }
    });
  }
};

DefaultContacts.init();
