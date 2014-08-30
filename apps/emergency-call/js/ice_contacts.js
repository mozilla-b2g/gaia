/* globals CallHandler, ICEStore, LazyLoader */

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

  function updateCompleted() {
    return ++processedContacts === contactsToProcess;
  }
  /**
   * Gets the ICE contacts, show the ICE contacts bar if appropriate and loads
   *  the ICE contacts on the overlay for future calling.
   * @returns {Promise}
   */
  function updateICEContacts() {
    processedContacts = 0;
    // FIXME/bug 1060730: Turn this into a Promise.all() barrier.
    return new Promise(function (resolve) {
      LazyLoader.load([contactInOverlay],
        function() {
          init();
          ICEStore.getContacts().then(function (iceContacts) {
            if (!iceContacts || !iceContacts.length) {
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
