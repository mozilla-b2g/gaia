/**
 * For testing:
 *  1. Set as many ICE contacts as you wish uncommenting the desired option in
 *     lines 186 to 193.
 *  2. Uncomment line 236.
 *  3. Update the emergency-call app in yor device executing:
 *     |APP=emergency-call make install-gaia|
 *  4. Set a screen lock passcode using the Settings app.
 *  5. Lock the screen.
 *  6. Unlock the screen.
 *  7. Click on the "EMERGENCY CALL" button.
 *
 * For final landing:
 *  1. Set the Contacts API permission to 'readonly' instead of 'readwrite' in
 *     the manifest.webapp.
 *  2. Set the ice_contacts data store access to readonly in the
 *     manifest.webapp.
 *  3. Remove mozContact from the JSHint globals list.
 *  4. Remove the |jshint unused: false| directive.
 *  4. Remove the helper function createICEContacts().
 *  5. Remove the usage of createICEContacts() in updateICEContacts(), this is
 *      remove lines 186 to 193 and 236.
 */

/* globals CallHandler, ICEStore, LazyLoader, mozContact */
/*jshint unused: false*/
'use strict';

(function(exports) {
  var l10n = navigator.mozL10n,
      initiated = false,
      iceContactsDetails = [],
      contactsToProcess = 0,
      processedContacts = 0,
      iceContactsBar = document.getElementById('ice-contacts-bar'),
      contactListOverlay = document.getElementById('contact-list-overlay'),
      contactInOverlay = document.getElementById('contact-in-overlay'),
      contactList,
      contactListCancel;

  function init() {
    if (initiated) {
      return;
    }

    LazyLoader.load([contactListOverlay], function() {
      var contactListOverlayHeader = contactListOverlay.querySelector('header');

      l10n.ready(function() {
        contactListOverlayHeader.textContent =
          l10n.get('ice-contacts-overlay-title');
      });

      contactList = document.getElementById('contact-list');
      contactListCancel =
        document.getElementById('contact-list-overlay-cancel');

      iceContactsBar.addEventListener('click', showICEContactOverlay);
      contactListCancel.addEventListener('click', hideICEContactOverlay);

      initiated = true;
    });
  }

  function showICEContactsBar() {
    iceContactsBar.removeAttribute('hidden');
  }

  function hideICEContactsBar() {
    iceContactsBar.setAttribute('hidden', '');
  }

  function showICEContactOverlay() {
    contactListOverlay.classList.add('display');
  }

  function hideICEContactOverlay() {
    contactListOverlay.classList.remove('display');
  }

  function callICEContact(number) {
    hideICEContactOverlay();
    CallHandler.call(number);
  }

  function addContactToOverlay(contact, resolve) {
    contact.tel.forEach(function (tel) {
      l10n.ready(function() {
        var iceContactOverlayEntry = contactInOverlay.cloneNode(true);
        iceContactOverlayEntry.removeAttribute('id');
        iceContactOverlayEntry.removeAttribute('hidden');
        iceContactOverlayEntry.querySelector('.js-name').textContent =
          contact.name[0];
        iceContactOverlayEntry.querySelector('.js-tel-type').textContent =
          l10n.get(tel.type[0]);
        iceContactOverlayEntry.querySelector('.js-tel').textContent =
            tel.value;
        contactList.insertBefore(iceContactOverlayEntry, contactListCancel);
        iceContactOverlayEntry.addEventListener('click',
          callICEContact.bind(null, tel.value));
        // Set the ICE contacts bar visible as soon as there is some
        //  ICE contact to call.
        showICEContactsBar();
        if (updateCompleted()) {
          resolve();
        }
      });
    });
  }

  /**
   * Helper function to create ICE contacts for testing bug 1038701.
   * @param {number} contacts The number of ICE contacts to create. Optional.
   *   Default 0. Minimum 0. Maximum 2.
   * @param {number} contact1Tels Telephone numbers to assign to the first
   *   contact if any. Optional. Default 1. Minimum 0.
   * @param {number} contactsTels Telephone numbers to assign to the second
   *   contact if any. Optional. Default 1. Minimum 0.
   * @param {function} callback Function to be called once the ICE contacts
   *   have been successfully created.
   */
  function createICEContacts(contacts, contact1Tels, contact2Tels, callback) {
    function callCB() {
      if (callback && typeof(callback) === 'function') {
        callback();
      }
    }
    if (!contacts || contacts < 0) {
      contacts = 0;
      ICEStore.setContacts([]).then(callCB);
      return;
    } else if (contacts > 2) {
      contacts = 2;
    }
    if (!contact1Tels || contact1Tels < 0) {
      contact1Tels = 0;
    }
    if (!contact2Tels || contact2Tels < 0) {
      contact2Tels = 0;
    }

    function success(iceContacts, contact) {
      iceContacts.push(contact.id);
      if (iceContacts.length === contacts) {
        ICEStore.setContacts(iceContacts).then(callCB);
      }
    }

    function error(contact) {
      console.log('Error when creating contact ' +
        contact.givenName + ' ' + contact.familyName);
    }

    var iceContacts = [];
    for(var contactIndex = 1; contactIndex <= contacts; contactIndex++) {
      var contact = new mozContact();
      contact.givenName = ['ICE Contact'];
      contact.familyName = [Date.now().toString()];
      contact.name = [contact.givenName[0] + ' ' + contact.familyName[0]];
      contact.tel = [];
      for (var telIndex = 1;
        telIndex <= (contactIndex === 1 ? contact1Tels : contact2Tels);
        telIndex++) {
        var tel = {
          type: ['home'],
          value: '(' + telIndex + ') ' + contact.familyName[0]
        };
        contact.tel.push(tel);
      }
      var saveRequest = navigator.mozContacts.save(contact);

      saveRequest.onsuccess = success.bind(null, iceContacts, contact);
      saveRequest.onerror = error.bind(null, contact);
    }
  }

  function updateCompleted() {
    return ++processedContacts === contactsToProcess;
  }
  /**
   * Gets the ICE contacts, show the ICE contacts bar if appropriate and loads
   *  the ICE contacts on the overlay for future calling.
   * @returns {Promise}
   */
  function updateICEContacts() {
    // Create 1 ICE contact with 1 telephone number:
    // createICEContacts(1, 1, 0, function() {
    // Create 1 ICE contact with 3 telephone number:
    // createICEContacts(1, 3, 0, function() {
    // Create 2 ICE contacts with 3 and 5 telephone numbers each:
    // createICEContacts(2, 3, 5, function() {
    // Empty the list of ICE contacts:
    // createICEContacts(0, 0, 0, function() {
    processedContacts = 0;
    return new Promise(function (resolve) {
      LazyLoader.load([contactInOverlay],
        function() {
          init();
          ICEStore.getContacts().then(function (iceContacts) {
            if (!iceContacts || !iceContacts.length) {
              hideICEContactsBar();
              resolve();
            } else {
              contactsToProcess = iceContacts.length;
              iceContacts.forEach(function (iceContact) {
                var contactFilter = {
                  filterBy: ['id'],
                  filterValue: iceContact,
                  filterOp: 'equals',
                  filterLimit: 1
                };
                var contactRequest = navigator.mozContacts.find(contactFilter);
                contactRequest.onsuccess = function () {
                  var contact = this.result[0];
                  if (!contact || !contact.tel || contact.tel.length === 0) {
                    if (contactList.children.length === 1) {
                      // Hide the ICE contacts bar in case the contact has no
                      //  associated telephone numbers and there is no entry in
                      //  the ICE contacts overlay yet.
                      hideICEContactsBar();
                    }
                    if (updateCompleted()) {
                      resolve();
                    }
                    return;
                  }
                  iceContactsDetails.push(this.result[0]);
                  addContactToOverlay(this.result[0], resolve);
                };
              });
            }
          });
        }
      );
    });
    // });
  }

  /**
   * Preliminary version of this function which checks if a telephone number
   *  belongs to an ICE contact. A more advanced version of which should
   *  probably consider phone number variants.
   */
  function isFromICEContact(number) {
    return iceContactsDetails.some(function(iceContact) {
      return iceContact.tel.some(function(tel) {
        return number == tel.value;
      });
    });
  }

  var ICEContacts = {
    updateICEContacts: updateICEContacts,
    isFromICEContact: isFromICEContact
  };

  exports.ICEContacts = ICEContacts;
})(window);
