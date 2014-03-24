/* global Customizer, mozContact */

'use strict';

var DefaultContactsCustomizer = (function() {
  Customizer.call(this, 'default_contacts', 'json');
  this.set = function(contacts) {
    function errorHandler(contact, evt) {
      console.error('Saving default contact failed: ' + evt && evt.target &&
                    evt.target.error && evt.target.error.name);
      console.error('Error while saving ' + JSON.stringify(contact));
    }
    for (var i = 0; i < contacts.length; ++i) {
      var contact = new mozContact(contacts[i]);
      var savingContact = navigator.mozContacts.save(contact);
      savingContact.onerror = errorHandler.bind(undefined, contact);
    }
  };
});

var defaultContactsCustomizer = new DefaultContactsCustomizer();
defaultContactsCustomizer.init();
