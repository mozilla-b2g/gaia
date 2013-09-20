'use strict';

var DefaultContactsCustomizer = {
  saveContacts: function(contacts) {
    for (var i = 0; i < contacts.length; ++i) {
      var contact = new mozContact();
      contact.init(contacts[i]);
      navigator.mozContacts.save(contact).onerror = (function(contact) {
        return function(event) {
          console.error('Saving default contact failed: ' + event.target.error);
          console.log('Contact being saved was: ' + JSON.stringify(contact));
        };
      })(contacts[i]);
    }
  },

  init: function() {
    if (!('mozContact' in window && 'mozContacts' in navigator)) {
      console.log('Contacts API not available');
      return;
    }

    var self = this;
    window.addEventListener('customization', function customize(event) {
      if (event.detail.setting == 'default_contacts') {
        window.removeEventListener('customization', customize);
        //XXX Bug 917740 changes the way this needs to be handled.
        self.saveContacts(event.detail.value);
      }
    });
  }
};

DefaultContactsCustomizer.init();
