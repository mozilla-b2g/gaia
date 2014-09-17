'use strict';
/* global ICEStore */

/**
 * Module to handle ICE data across different parts of the application
 * This module just know about the internal representation and how
 * to deal with share ICE information (which has different format).
 */

(function ICEData(exports) {

  var localIceContacts = [];
  var ICE_CONTACTS_KEY = 'ice-contacts';
  var onChangeCallbacks = [];
  var onChangeAttached = false;

  /**
   * Loads the local formated data into an internal
   * representation.
   * @return (Promise) fullfill when the load finish.
   */
  function load() {
    var iceContactsIds = [
      {
        id: undefined,
        active: false
      },
      {
        id: undefined,
        active: false
      }
    ];

    return new Promise(function(resolve) {
      window.asyncStorage.getItem(ICE_CONTACTS_KEY, function(data) {
        if (data) {
          if (data[0]) {
            iceContactsIds[0] = data[0];
          }
          if (data[1]) {
            iceContactsIds[1] = data[1];
          }
        }
        localIceContacts = iceContactsIds;
        resolve(localIceContacts);
      });
    });
  }

  /**
   * Set the values for ICE contacts, both in local and in the
   * datastore
   * @param id (string) contact id
   * @param pos (int) current position (0,1)
   * @param active (boolean) ice contact is active or not
   */
  function setICEContact(id, pos, active) {
    active = active || false;

    // Save locally
    localIceContacts[pos] = {
      id: id,
      active: active
    };
    window.asyncStorage.setItem(ICE_CONTACTS_KEY, localIceContacts);
    // Save in the datastore
    return modifyICEInDS();
  }

  /**
   * Clone the current local ice contacts into the datastore,
   * considering the active flag.
   * @return (Promise) fullfill when data saved in DS
   */
  function modifyICEInDS() {
    var contacts = [];
    localIceContacts.forEach(function(iceContact) {
      if (iceContact.id && iceContact.active) {
        contacts.push(iceContact.id);
      }
    });

    return ICEStore.setContacts(contacts);
  }

  /**
   * Given a specific contact id removes it from the
   * ice list, if present or disabled
   * @param id (String) contact id
   * @return (Promise) fullfill when data modified in DS
   */
  function removeICEContact(id) {
    var contact = localIceContacts.find(function(x) {
      return x.id === id;
    });

    if (!contact) {
      return Promise.resolve();
    }

    var index = localIceContacts.indexOf(contact);
    localIceContacts.splice(index, 1);
    window.asyncStorage.setItem(ICE_CONTACTS_KEY, localIceContacts);
    return modifyICEInDS();
  }

  /**
   * Adds an observer to be called when an ice contact
   * changed. We can add multiple listeners, since we will
   * need to react in several parts of the app to this changes.
   * Also the listener removes a contact id in case we are performing
   * a delete. In case of modification we don't do anythying as we
   * store just ids.
   * Listener will be attached just once, but we can keep adding
   * callbacks.
   * @param fn (Function) callback to call when ice contact change
   */
  function listenForChanges(fn) {
    if (!onChangeAttached) {
      load().then(function() {
        document.addEventListener('contactChanged', onChangeEvent);
        onChangeAttached = true;
      });
    }

    if (typeof fn === 'function') {
      onChangeCallbacks.push(fn);
    }
  }

  function onChangeEvent(evt) {
    // Figure out if we got a change in a ICE contact
    var contact = localIceContacts.find(function(x) {
      return x.id === evt.detail.contactID;
    });

    if (!contact) {
      return;
    }

    function notifyCallbacks(data) {
      onChangeCallbacks.forEach(function(fn) {
        fn(data);
      });
    }

    // If it's a delete update all the storages
    if (evt.detail.reason === 'remove') {
      removeICEContact(contact.id).then(notifyCallbacks);
    } else {
      notifyCallbacks(localIceContacts);
    }
  }

  function getActiveIceContacts() {
    return new Promise(function(resolve, reject) {
      load().then(function() {
        var result = [];
        localIceContacts.forEach(function(aContact) {
          if (aContact.active && aContact.id) {
            result.push(aContact.id);
          }
          resolve(result);
        });
      }, reject);
    });
  }

  function stopListenForChanges() {
    document.removeEventListener('contactChanged', onChangeEvent);
    onChangeCallbacks = [];
    onChangeAttached = false;
  }

  exports.ICEData = {
    load: load,
    setICEContact: setICEContact,
    removeICEContact: removeICEContact,
    get iceContacts() { return localIceContacts; },
    getActiveIceContacts: getActiveIceContacts,
    listenForChanges: listenForChanges,
    stopListenForChanges: stopListenForChanges
  };


})(window);
