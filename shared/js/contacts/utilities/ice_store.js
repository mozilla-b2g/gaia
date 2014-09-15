/* global Promise, Event */
'use strict';

/**
 * Helper library to deal with in case of emergency (ICE)
 * Contacts.
 * Those contacts are suppose to be first responders to
 * an emergency. More info:
 * https://wiki.mozilla.org/Gaia/Comms/2.1/Ice_Contacts
 *
 * The information will be stored in a DS for sharing
 * between contacts and dialer.
 * The content will be an array of two contacts ids.
 * This helper will be used for fetching:
 * ICEStore.getContacts().then(function(iceContacts) {
 *  ...
 * });
 * and setting the data:
 * ICEStore.setContacts(ids).then(function() {
 *  ...
 * });
 */
(function(exports) {
  var STORE_NAME = 'ice_contacts';
  var store = null;
  var status = 'not_initialized';
  var FIELD = 'ICE_CONTACTS';

  // Get a reference to the store, or returns it if
  // we already have.
  function init() {
    if (store !== null) {
      return Promise.resolve(store);
    }

    if (!navigator.getDataStores) {
      return Promise.reject('No DS supported');
    }

    if (status === 'initialising') {
      document.addEventListener('ice_ready', function ready() {
        document.removeEventListener('ice_ready', ready);
        if (store === null) {
          return Promise.reject('Error getting store');
        } else {
          return Promise.resolve(store);
        }
      });
    }

    status = 'initialising';
    return new Promise(function(resolve, reject) {
      navigator.getDataStores(STORE_NAME).then(function(stores) {
        if (!stores || stores.length < 0) {
          document.dispatchEvent(new Event('on_ice_ready'));
          return reject('No DS found');
        } else {
          store = stores[0];
          status = 'initialised';
          document.dispatchEvent(new Event('ice_ready'));
          return resolve(store);
        }
      });
    });
  }

  var ICEStore = {
    /**
     *  Set the in case of emergency contacts.
     *  @param {Array} iceContacts array of contacts id.
     *  @returns {Promise}
     */
    setContacts: function(iceContacts) {
      return init().then(function() {
        return store.put(iceContacts, FIELD).then(function() {
          return Promise.resolve(iceContacts);
        });
      });
    },
    /**
     * Retrieves the in case of emergency contacts
     * @returns {Promise}
     */
    getContacts: function() {
      return init().then(function() {
        return store.get(FIELD);
      });
    },
    /**
     * Subscribe to changes in the store
     * @param {Function} Callback when a change happens
     */
    onChange: function(cb) {
      return init().then(function() {
        store.addEventListener('change', function() {
          store.get(FIELD).then(cb);
        });
      });
    }
  };

  exports.ICEStore = ICEStore;
})(window);
