/* globals CallHandler, ICEStore, LazyLoader */

'use strict';

(function(exports) {
  var iceContactsDetails = [],
      iceContactsBar,
      contactListOverlay,
      contactInOverlay,
      contactList,
      contactListCancel;

  function init() {
    if (ICEContacts._initialized) {
      return;
    }

    iceContactsBar = document.getElementById('ice-contacts-bar');
    contactListOverlay = document.getElementById('contact-list-overlay');
    contactInOverlay = document.getElementById('contact-in-overlay');

    LazyLoader.load([contactListOverlay], function() {
      var contactListOverlayHeader = contactListOverlay.querySelector('header');
      contactListOverlayHeader.dataset.l10nId = 'ice-contacts-overlay-title';

      contactList = document.getElementById('contact-list');
      contactListCancel =
        document.getElementById('contact-list-overlay-cancel');

      iceContactsBar.addEventListener('click', showICEContactOverlay);
      contactListCancel.addEventListener('click', hideICEContactOverlay);

      ICEContacts._initialized = true;
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

  function findContact(iceContact) {
    return new Promise(function(resolve) {
      var contactFilter = {
        filterBy: ['id'],
        filterValue: iceContact,
        filterOp: 'equals',
        filterLimit: 1
      };
      var contactRequest = navigator.mozContacts.find(contactFilter);
      contactRequest.onsuccess = function() {
        var contact = this.result[0];
        if (contact && contact.tel) {
          iceContactsDetails.push(contact);
        }
        resolve(contact);
      };
    });
  }

  function addContactToOverlay(contact) {
    return new Promise(function (resolve) {
      if (!contact || !contact.tel) {
        resolve();
        return;
      }
      contact.tel.forEach(function(tel) {
        var iceContactOverlayEntry = contactInOverlay.cloneNode(true);
        iceContactOverlayEntry.removeAttribute('id');
        iceContactOverlayEntry.removeAttribute('hidden');
        iceContactOverlayEntry.querySelector('.js-name').textContent =
          contact.name[0];
        iceContactOverlayEntry.querySelector('.js-tel-type').dataset.l10nId =
          tel.type[0];
        iceContactOverlayEntry.querySelector('.js-tel').textContent =
          tel.value;
        contactList.insertBefore(iceContactOverlayEntry, contactListCancel);
        iceContactOverlayEntry.addEventListener('click',
          callICEContact.bind(null, tel.value));
        // Set the ICE contacts bar visible as soon as there is some
        //  ICE contact to call.
        showICEContactsBar();
      });
      resolve();
    });
  }

  /**
   * Gets the ICE contacts, show the ICE contacts bar if appropriate and loads
   *  the ICE contacts on the overlay for future calling.
   * @returns {Promise}
   */
  function updateICEContacts() {
    init();

    return new Promise(function(resolve) {
      LazyLoader.load([contactInOverlay], function() {
        ICEStore.getContacts().then(function(iceContacts) {
          if (!iceContacts || !iceContacts.length) {
            resolve();
          } else {
            var promises = [];
            iceContacts.forEach(function (iceContact) {
              promises.push(findContact(iceContact).then(addContactToOverlay));
            });
            Promise.all(promises).then(resolve);
          }
        });
      });
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
    _initialized: false,
    updateICEContacts: updateICEContacts,
    isFromICEContact: isFromICEContact
  };

  exports.ICEContacts = ICEContacts;
})(window);
