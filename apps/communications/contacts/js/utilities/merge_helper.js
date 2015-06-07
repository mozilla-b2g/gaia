'use strict';

/* exported MergeHelper */
/* globals LazyLoader, ICEData, contacts, ContactsService */

/**
 *
 *  Merge helper file. Allows to perform a merge while respecting
 *  all the ICE Settings
 *
 *
 */

var MergeHelper = (function() {
  var DEPENDENCIES = [
    '/shared/js/contacts/contacts_merger.js',
    '/shared/js/contacts/utilities/image_thumbnail.js',
    '/shared/js/contacts/utilities/ice_store.js',
    '/contacts/js/utilities/ice_data.js',
    '/shared/js/async_storage.js'
  ];

  var eventHandler;

  // Set the new ICE Contacts being contactId the id of the contact which
  // is now the merged contact
  function setNewIceContacts(merged, original, contactId) {
    if (!merged) {
      return Promise.resolve();
    }

    // If we still don't know the contact id
    // (this happens when merge is done from 'add new contact')
    if (!contactId || contactId === 'undefined') {
      eventHandler = onContactAdded.bind(null, merged, original);
      ContactsService.addListener('contactchange', eventHandler);
    }

    return ICEData.setICEContacts(merged);
  }

  function onContactAdded(mergedIceContacts, originalIceContacts, event) {
    if (event.reason !== 'create') {
      return;
    }

    ContactsService.removeListener('contactchange', eventHandler);

    var id = event.contactID;

    // Let's determine what ICE Contact is changing
    var mergedICEContact1 = false;
    if (originalIceContacts[0] && mergedIceContacts[0] !==
                                              originalIceContacts[0]) {
      mergedIceContacts[0] = id;
      mergedICEContact1 = true;
    }

    // This condition avoids to set ICE Contact 2 to the same contact as
    // ICE Contact 1. This may occur if ICE Contact 1 and ICE Contact 2 both
    // match an incoming (manually added contact)
    if (originalIceContacts[1] &&
        mergedIceContacts[1] !== originalIceContacts[1] && !mergedICEContact1) {
      mergedIceContacts[1] = id;
    }

    ICEData.setICEContacts(mergedIceContacts);
  }

  function getMergedIceContacts(mergeList, contactId) {
    return new Promise(function(resolve) {
      ICEData.load().then(function() {
        var iceContacts = ICEData.iceContacts.map((contact) => {
          return contact.active ? contact.id : null;
        });

        var mergeListWithIds = mergeList.map((matching) => {
          return matching.matchingContact.id;
        });

        var mergedIceContacts;

        var isThereMerge = false;
        mergedIceContacts = iceContacts.map((iceContact) => {
          if(iceContact && mergeListWithIds.indexOf(iceContact) !== -1) {
            isThereMerge = true;
            return contactId;
          }
          return iceContact;
        });

        // If there is no merge null value is returned
        if (!isThereMerge) {
          resolve([null, iceContacts]);
          return;
        }

        // Here we filter out duplicates
        mergedIceContacts = mergedIceContacts.map((id, index) => {
          if(id && mergedIceContacts.indexOf(id) === index) {
            return id;
          }
          return null;
        });
        resolve([mergedIceContacts, iceContacts]);

      }, function(error) {
          console.error('Error while obtaining ICE Contacts: ', error);
          resolve([]);
      });
    });
  }

  function merge(contact, mergeList) {
    return new Promise(function(resolve, reject) {
      LazyLoader.load(DEPENDENCIES, function loaded() {
        getMergedIceContacts(mergeList, contact.id).then(
          function(result) {
            var mergedIceContacts = result[0], originalIceContacts = result[1];
            var callbacks = {
              success: resolve,
              error: function(e) {
                console.error('Failed merging duplicate contacts: ', e.name);
                // If there is an error in the merge then we just
                // keep the old ICE Contacts
                ICEData.setICEContacts(originalIceContacts);
                navigator.mozContacts.removeEventListener('contactchange',
                                                              eventHandler);
                reject(e);
              }
            };

            var mergerFunction = contacts.Merger.merge.bind(null,
                                                contact, mergeList, callbacks);
            // We set the new ICEContact as the merged one
            // As a result, the contactChange events associated to the
            // Contacts merged (which are deleted) will be ignored
            // This is safer than relying on events as
            // there could race conditions
            setNewIceContacts(mergedIceContacts, originalIceContacts,
                              contact.id).then(mergerFunction, mergerFunction);
        });
      });
    });
  }

  return {
    'merge': merge
  };
}());
