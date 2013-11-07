'use strict';

var DefaultContactsCustomizer = (function() {
  var resourceParams = {
    type: 'json',
    mimetype: 'application/json'
  };

  Customizer.call(this, 'default_contacts', resourceParams);
  this.set = function(contacts) {
    for (var i = 0; i < contacts.length; ++i) {
      var contact = new mozContact(contacts[i]);
      var savingContact = navigator.mozContacts.save(contact);
      savingContact.onerror = function errorHandler(error) {
        console.error('Saving default contact failed: ' + error);
        console.error('Error while saving ' + JSON.stringify(contact));
      };
    }
  };
});

var defaultContactsCustomizer = new DefaultContactsCustomizer();
defaultContactsCustomizer.init();
