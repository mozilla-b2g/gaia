/* global Customizer,
          mozContact */
'use strict';

var DefaultContactsCustomizer = (function() {
  function errorHandler(contact, error) {
    console.error('Saving default contact failed: ' + error);
    console.error('Error while saving ' + JSON.stringify(contact));
  }

  Customizer.call(this, 'default_contacts', 'json');
  this.set = function(contacts) {
    for (var i = 0; i < contacts.length; ++i) {
      var contact = new mozContact(contacts[i]);
      var savingContact = navigator.mozContacts.save(contact);
      savingContact.onerror = errorHandler.bind(null, contact);
    }
  };
});

var defaultContactsCustomizer = new DefaultContactsCustomizer();
defaultContactsCustomizer.init();
