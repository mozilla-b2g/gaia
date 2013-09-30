'use strict';

var utils = window.utils || {};

if (!utils.contactFields) {
  (function() {
    utils.contactFields = {};

    /**
     * Returns the complete name formed from contact's given name
     * and family name.
     */
    utils.contactFields.createName = function(contact) {
      var givenName = Array.isArray(contact.givenName) ?
                      contact.givenName[0] : '';
      if (givenName) {
        givenName = givenName.trim();
      }

      var familyName = Array.isArray(contact.familyName) ?
                       contact.familyName[0] : '';
      if (familyName) {
        familyName = familyName.trim();
      }

      var completeName = givenName && familyName ?
                         givenName + ' ' + familyName :
                         givenName || familyName;

      return completeName ? completeName : null;
    };

    /**
     * Returns an array with the complete name.
     */
    utils.contactFields.createNameField = function(contact) {
      var completeName = this.createName(contact);
      return completeName ? [completeName] : [];
    };

    /**
     * Returns true if there is contact family name or given name.
     */
    utils.contactFields.hasName = function(contact) {
      return (Array.isArray(contact.givenName) && contact.givenName[0] &&
              contact.givenName[0].trim()) ||
             (Array.isArray(contact.familyName) && contact.familyName[0] &&
              contact.familyName[0].trim());
    };

    /**
     * Returns an object with the name (`diplayName` key) to display in the
     * distint screens of the contacts application based on a specific
     * sequence of fallbacks. The key `derivedFrom` completes the information
     * with a sorted list of contact' fields used in the generation.
     */
    utils.contactFields.getDisplayName = function(contact) {
      var displayObject = {};

      if (this.hasName(contact)) {
        var displayName = this.createName(contact);
        displayObject.displayName = displayName;
        displayObject.derivedFrom = ['givenName', 'familyName'];

      } else if (contact.name && contact.name.length > 0 &&
                 contact.name[0].trim()) {
        displayObject.displayName = contact.name[0];
        displayObject.derivedFrom = ['name'];

      } else if (contact.org && contact.org.length > 0) {
        displayObject.displayName = contact.org[0];
        displayObject.derivedFrom = ['org'];

      } else if (contact.tel && contact.tel.length > 0) {
        displayObject.displayName = contact.tel[0].value;
        displayObject.derivedFrom = ['tel'];

      } else if (contact.email && contact.email.length > 0) {
        displayObject.displayName = contact.email[0].value;
        displayObject.derivedFrom = ['email'];

      } else {
        displayObject.displayName = navigator.mozL10n.get('noName');
        displayObject.derivedFrom = [];
      }

      return displayObject;
    };
  })();
}
